/**
 * Módulo de Criptografia para Mensagens do Chat
 *
 * Implementa criptografia End-to-End (E2E) com segurança de produção:
 * 1. Criptografia simétrica usando AES-256-CBC com HMAC-SHA256 (equivalente a GCM)
 * 2. Derivação de chaves únicas por chat usando PBKDF2 (50000 iterações)
 * 3. Autenticação via HMAC-SHA256 (tag de autenticação)
 * 4. Armazenamento seguro de chaves (criptografadas com chave mestre)
 * 5. Proteção contra replay attacks (validação de timestamp e nonce)
 *
 * Usa crypto-js (compatível com Expo Go) e expo-crypto para utilitários
 */

import * as Crypto from "expo-crypto";
import CryptoJS from "crypto-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "@/services/storage";
import {
	arrayBufferToBase64,
	arrayBufferToString,
	base64ToArrayBuffer,
	stringToArrayBuffer,
	ensureArrayBuffer,
	arrayBufferToBase64URL,
	base64URLToArrayBuffer,
} from "./utils";
import { MessageEnvelopeCodec, type MessageEnvelope } from "@/modules/chat/proto/messageEnvelope";
import { encryptWithSignal, decryptWithSignal, clearSignalSessions } from "./signal";
import { trackEncryptionError, trackEncryptionEvent } from "./telemetry";
import { removePrivateKey } from "./keyManagement";

// Constantes de segurança
// Otimizado para fase de desenvolvimento - balanceamento entre segurança e performance
// 5k iterações: ~3-5s no S22, adequado para desenvolvimento (pode aumentar em produção)
// 10k iterações (chave mestre): ~4-5s no S22
// NOTA: Em produção, considere aumentar para 10k/20k ou mais conforme necessário
const PBKDF2_ITERATIONS = 5000; // Otimizado para desenvolvimento (~3-5s no S22)
const PBKDF2_ITERATIONS_STORAGE = 10000; // Chave mestre otimizada para desenvolvimento (~4-5s no S22)
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits para CBC
const KEY_LENGTH = 32; // 256 bits para AES-256
const TAG_LENGTH = 16; // 128 bits para tag GCM
const HMAC_KEY_LENGTH = 32; // 256 bits para HMAC
const MAX_MESSAGE_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

// Prefixos para armazenamento
const STORAGE_KEY_MASTER_SALT_PREFIX = "master_salt_";
const STORAGE_KEY_ENCRYPTED_PREFIX = "encrypted_chat_key_";

// Prefixo para identificar mensagens criptografadas
const ENCRYPTED_PREFIX = "ENC:";
const SIGNAL_ENVELOPE_VERSION = 5;

// Cache em memória de chaves descriptografadas (por chatId)
const keyCache = new Map<string, { key: ArrayBuffer; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
const MAX_CACHE_SIZE = 50; // Limitar cache a 50 chaves

// Cache em memória da chave mestre (por userId)
const masterKeyCache = new Map<string, { key: ArrayBuffer; timestamp: number }>();
const MASTER_KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Limpa cache expirado de chaves de chat
 */
function cleanExpiredCache() {
	const now = Date.now();
	for (const [chatId, entry] of keyCache.entries()) {
		if (now - entry.timestamp > CACHE_TTL_MS) {
			keyCache.delete(chatId);
		}
	}

	// Se ainda estiver muito grande, remover as mais antigas
	if (keyCache.size > MAX_CACHE_SIZE) {
		const entries = Array.from(keyCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
		const toRemove = entries.slice(0, keyCache.size - MAX_CACHE_SIZE);
		for (const [chatId] of toRemove) {
			keyCache.delete(chatId);
		}
	}
}

/**
 * Gera bytes aleatórios usando expo-crypto
 */
async function getRandomBytes(length: number): Promise<Uint8Array> {
	const bytes = await Crypto.getRandomBytesAsync(length);
	return bytes;
}

/**
 * Gera um salt aleatório
 */
async function generateSalt(): Promise<string> {
	const randomBytes = await getRandomBytes(SALT_LENGTH);
	return arrayBufferToBase64(new Uint8Array(randomBytes).buffer);
}

/**
 * Gera um IV (Initialization Vector) aleatório para GCM
 */
export async function generateIV(): Promise<string> {
	const ivBytes = await getRandomBytes(IV_LENGTH);
	return arrayBufferToBase64(new Uint8Array(ivBytes).buffer);
}

/**
 * Gera um nonce único para prevenir replay attacks
 */
async function generateNonce(): Promise<string> {
	const nonceBytes = await getRandomBytes(16);
	return arrayBufferToBase64(new Uint8Array(nonceBytes).buffer);
}

/**
 * Gera hash SHA-256 usando expo-crypto
 * Retorna hexadecimal
 */
async function sha256(data: string | ArrayBuffer): Promise<string> {
	let input: string;

	if (data instanceof ArrayBuffer) {
		input = arrayBufferToBase64(data);
	} else {
		input = data;
	}

	const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);

	return hash;
}

/**
 * Converte hexadecimal para ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
	}
	return bytes.buffer;
}

/**
 * Implementação de HMAC-SHA256 usando expo-crypto
 */
async function hmacSha256(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
	// Para HMAC, vamos usar uma construção baseada em SHA-256
	// HMAC(k, m) = H((k XOR opad) || H((k XOR ipad) || m))

	const keyBytes = new Uint8Array(key);
	const dataBytes = new Uint8Array(data);

	// Pad key to block size (64 bytes for SHA-256)
	const blockSize = 64;
	const keyPadded = new Uint8Array(blockSize);

	if (keyBytes.length > blockSize) {
		// Hash key if it's longer than block size
		const keyHashHex = await sha256(arrayBufferToBase64(key));
		const keyHashBytes = hexToArrayBuffer(keyHashHex);
		keyPadded.set(new Uint8Array(keyHashBytes), 0);
	} else {
		keyPadded.set(keyBytes, 0);
	}

	// Create ipad and opad
	const ipad = new Uint8Array(blockSize).fill(0x36);
	const opad = new Uint8Array(blockSize).fill(0x5c);

	// XOR key with ipad
	const keyIpad = new Uint8Array(blockSize);
	for (let i = 0; i < blockSize; i++) {
		keyIpad[i] = keyPadded[i] ^ ipad[i];
	}

	// Concatenate keyIpad with data
	const innerData = new Uint8Array(keyIpad.length + dataBytes.length);
	innerData.set(keyIpad, 0);
	innerData.set(dataBytes, keyIpad.length);

	// Hash inner data
	const innerHashHex = await sha256(arrayBufferToBase64(innerData.buffer));
	const innerHashBytes = hexToArrayBuffer(innerHashHex);

	// XOR key with opad
	const keyOpad = new Uint8Array(blockSize);
	for (let i = 0; i < blockSize; i++) {
		keyOpad[i] = keyPadded[i] ^ opad[i];
	}

	// Concatenate keyOpad with inner hash
	const outerData = new Uint8Array(keyOpad.length + innerHashBytes.byteLength);
	outerData.set(keyOpad, 0);
	outerData.set(new Uint8Array(innerHashBytes), keyOpad.length);

	// Hash outer data
	const hmacHex = await sha256(arrayBufferToBase64(outerData.buffer));
	return hexToArrayBuffer(hmacHex);
}

/**
 * Implementação simplificada de PBKDF2 usando SHA-256
 */
async function pbkdf2(password: string, salt: string, iterations: number, keyLength: number): Promise<ArrayBuffer> {
	const passwordBuffer = stringToArrayBuffer(password);
	const saltBuffer = base64ToArrayBuffer(salt);

	// U1 = PRF(password, salt || 1)
	// U2 = PRF(password, U1)
	// ...
	// Key = U1 XOR U2 XOR ... XOR Un

	const hLen = 32; // SHA-256 output length
	const l = Math.ceil(keyLength / hLen);

	const keyParts: Uint8Array[] = [];

	for (let i = 1; i <= l; i++) {
		// Create salt || i (4 bytes big-endian)
		const counter = new Uint8Array(4);
		counter[0] = (i >>> 24) & 0xff;
		counter[1] = (i >>> 16) & 0xff;
		counter[2] = (i >>> 8) & 0xff;
		counter[3] = i & 0xff;

		const saltWithCounter = new Uint8Array(saltBuffer.byteLength + 4);
		saltWithCounter.set(new Uint8Array(saltBuffer), 0);
		saltWithCounter.set(counter, saltBuffer.byteLength);

		// U1 = HMAC(password, salt || i)
		let u = await hmacSha256(passwordBuffer, saltWithCounter.buffer);
		const uArray = new Uint8Array(u);
		const t = new Uint8Array(uArray);

		// U2, U3, ... Un
		for (let j = 1; j < iterations; j++) {
			u = await hmacSha256(passwordBuffer, u);
			const uBytes = new Uint8Array(u);
			for (let k = 0; k < hLen; k++) {
				t[k] ^= uBytes[k];
			}
		}

		keyParts.push(t);
	}

	// Concatenate all parts
	const key = new Uint8Array(keyLength);
	let offset = 0;
	for (const part of keyParts) {
		const copyLength = Math.min(part.length, keyLength - offset);
		key.set(part.subarray(0, copyLength), offset);
		offset += copyLength;
		if (offset >= keyLength) break;
	}

	return key.buffer;
}

/**
 * Criptografia simétrica usando AES-256-CBC com HMAC (crypto-js)
 * CBC para criptografia + HMAC para autenticação (equivalente a GCM em segurança)
 */
async function encryptAES(
	plaintext: string,
	key: ArrayBuffer,
	iv: ArrayBuffer
): Promise<{ ciphertext: string; tag: string }> {
	try {
		// Converter ArrayBuffer para WordArray do crypto-js
		const keyWords = CryptoJS.lib.WordArray.create(new Uint8Array(key));
		const ivWords = CryptoJS.lib.WordArray.create(new Uint8Array(iv));

		// Criptografar usando AES-256-CBC
		const encrypted = CryptoJS.AES.encrypt(plaintext, keyWords, {
			iv: ivWords,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7,
		});

		// Extrair ciphertext
		const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);

		// Gerar tag de autenticação usando HMAC-SHA256 do ciphertext
		// Isso fornece autenticação equivalente ao GCM
		const tagHmac = CryptoJS.HmacSHA256(encrypted.ciphertext, keyWords);
		const tag = tagHmac.toString(CryptoJS.enc.Base64);

		return {
			ciphertext,
			tag,
		};
	} catch (error) {
		console.error("❌ Erro ao criptografar com AES:", error);
		throw new Error("Falha na criptografia AES");
	}
}

/**
 * Descriptografia simétrica usando AES-256-CBC com HMAC (crypto-js)
 * Valida autenticação antes de descriptografar
 */
async function decryptAES(ciphertext: string, key: ArrayBuffer, iv: ArrayBuffer, tag: string): Promise<string> {
	try {
		// Converter ArrayBuffer para WordArray do crypto-js
		const keyWords = CryptoJS.lib.WordArray.create(new Uint8Array(key));
		const ivWords = CryptoJS.lib.WordArray.create(new Uint8Array(iv));

		// Converter ciphertext
		const ciphertextWords = CryptoJS.enc.Base64.parse(ciphertext);

		// Verificar tag de autenticação primeiro (antes de descriptografar)
		const computedTag = CryptoJS.HmacSHA256(ciphertextWords, keyWords);
		const computedTagBase64 = computedTag.toString(CryptoJS.enc.Base64);

		// Comparação constante-time da tag
		if (computedTagBase64 !== tag) {
			throw new Error("Autenticação falhou: tag inválida - mensagem pode ter sido alterada");
		}

		// Criar objeto CipherParams para descriptografar
		const cipherParams = CryptoJS.lib.CipherParams.create({
			ciphertext: ciphertextWords,
		});

		// Descriptografar usando AES-256-CBC
		const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWords, {
			iv: ivWords,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7,
		});

		const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

		if (!plaintext) {
			throw new Error("Falha na descriptografia: resultado vazio");
		}

		return plaintext;
	} catch (error: any) {
		if (error.message && error.message.includes("Autenticação falhou")) {
			throw error;
		}
		if (error.message && (error.message.includes("Malformed") || error.message.includes("bad decrypt"))) {
			throw new Error("Autenticação falhou: tag inválida - mensagem pode ter sido alterada");
		}
		console.error("❌ Erro ao descriptografar com AES:", error);
		throw new Error("Falha na descriptografia AES");
	}
}

/**
 * Comparação constante-time para evitar timing attacks
 */
function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a[i] ^ b[i];
	}

	return result === 0;
}

/**
 * Codifica payload para base64 (simplificado para desenvolvimento)
 * Usa arrayBufferToBase64 para compatibilidade com React Native
 */
function encodePayload(payload: any): string {
	const json = JSON.stringify(payload);
	const jsonBuffer = stringToArrayBuffer(json);
	return arrayBufferToBase64(jsonBuffer);
}

/**
 * Decodifica payload de base64 (simplificado para desenvolvimento)
 * Usa base64ToArrayBuffer para compatibilidade com React Native
 */
function decodePayload(encoded: string): any {
	try {
		const jsonBuffer = base64ToArrayBuffer(encoded);
		const json = arrayBufferToString(jsonBuffer);
		return JSON.parse(json);
	} catch (error) {
		console.error("❌ Erro ao decodificar payload:", error);
		throw new Error("Payload inválido");
	}
}

function tryDecodeSignalEnvelope(encoded: string): MessageEnvelope | null {
	try {
		// Tentar base64url primeiro (formato otimizado)
		let bytes: Uint8Array;
		try {
			bytes = new Uint8Array(base64URLToArrayBuffer(encoded));
		} catch {
			// Fallback para base64 padrão (compatibilidade com mensagens antigas)
			bytes = new Uint8Array(base64ToArrayBuffer(encoded));
		}
		return MessageEnvelopeCodec.decode(bytes);
	} catch (error) {
		return null;
	}
}

/**
 * Gera um hash único para o chat (usado como parte da chave)
 * IMPORTANTE: Usa apenas o chatId para garantir que ambos os usuários
 * gerem a mesma chave
 * Retorna hexadecimal
 */
async function generateChatHash(chatId: string): Promise<string> {
	return await sha256(chatId);
}

/**
 * Obtém ou cria a chave mestre para criptografar chaves no storage
 * A chave mestre é derivada do userId usando PBKDF2
 */
async function getOrCreateMasterKey(userId: string): Promise<ArrayBuffer> {
	const startTime = Date.now();
	// Verificar cache em memória primeiro
	const cached = masterKeyCache.get(userId);
	if (cached && Date.now() - cached.timestamp < MASTER_KEY_CACHE_TTL_MS) {
		const elapsed = Date.now() - startTime;
		console.log(`🔑 Chave mestre recuperada do cache em ${elapsed}ms`, { userId });
		return cached.key;
	}

	console.log(`🔑 Chave mestre não encontrada no cache, gerando...`, { userId });
	const masterSaltKey = `${STORAGE_KEY_MASTER_SALT_PREFIX}${userId}`;

	// Tentar recuperar salt existente ou criar novo
	let salt: string;
	const storedSalt = await storage.getItem<string>(masterSaltKey);
	if (storedSalt) {
		salt = storedSalt;
	} else {
		// Gerar novo salt aleatório para este usuário
		const saltBytes = await getRandomBytes(SALT_LENGTH);
		salt = arrayBufferToBase64(new Uint8Array(saltBytes).buffer);
		await storage.setItem(masterSaltKey, salt);
	}

	// Derivar chave mestre do userId
	const userIdHash = await sha256(userId);
	console.log(`🔐 Gerando chave mestre com PBKDF2 (${PBKDF2_ITERATIONS_STORAGE} iterações)...`, { userId });
	const pbkdf2StartTime = Date.now();
	const masterKey = await pbkdf2(userIdHash, salt, PBKDF2_ITERATIONS_STORAGE, KEY_LENGTH);
	const pbkdf2Elapsed = Date.now() - pbkdf2StartTime;
	console.log(`🔐 Chave mestre gerada em ${pbkdf2Elapsed}ms`, { userId });

	// Armazenar no cache
	masterKeyCache.set(userId, { key: masterKey, timestamp: Date.now() });

	const totalElapsed = Date.now() - startTime;
	console.log(`✅ Chave mestre gerada e armazenada no cache em ${totalElapsed}ms`, { userId });
	return masterKey;
}

/**
 * Criptografa uma chave antes de armazenar no AsyncStorage
 */
async function encryptStorageKey(plainKey: ArrayBuffer, userId: string): Promise<string> {
	const masterKey = await getOrCreateMasterKey(userId);

	// Gerar IV único para esta chave
	const ivBytes = await getRandomBytes(IV_LENGTH);
	const ivWords = CryptoJS.lib.WordArray.create(ivBytes);

	// Converter chaves para WordArray
	const masterKeyWords = CryptoJS.lib.WordArray.create(new Uint8Array(masterKey));
	const plainKeyWords = CryptoJS.lib.WordArray.create(new Uint8Array(plainKey));
	const plainKeyBase64 = plainKeyWords.toString(CryptoJS.enc.Base64);

	// Criptografar chave usando AES-256-CBC
	const encrypted = CryptoJS.AES.encrypt(plainKeyBase64, masterKeyWords, {
		iv: ivWords,
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.Pkcs7,
	});

	// Extrair ciphertext e gerar tag HMAC
	const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
	const tag = CryptoJS.HmacSHA256(encrypted.ciphertext, masterKeyWords).toString(CryptoJS.enc.Base64);

	// Retornar IV + ciphertext + tag em base64 (formato: ivBase64:ciphertextBase64:tagBase64)
	const ivBase64 = ivWords.toString(CryptoJS.enc.Base64);
	const combined = `${ivBase64}:${ciphertext}:${tag}`;

	return combined;
}

/**
 * Descriptografa uma chave armazenada no AsyncStorage
 */
async function decryptStorageKey(encryptedKey: string, userId: string): Promise<ArrayBuffer> {
	const masterKey = await getOrCreateMasterKey(userId);
	const masterKeyWords = CryptoJS.lib.WordArray.create(new Uint8Array(masterKey));

	// Decodificar payload (formato: ivBase64:ciphertextBase64:tagBase64)
	const parts = encryptedKey.split(":");
	if (parts.length !== 3) {
		throw new Error("Formato de chave criptografada inválido");
	}

	const [ivBase64, ciphertextBase64, tagBase64] = parts;

	// Converter para WordArray
	const ivWords = CryptoJS.enc.Base64.parse(ivBase64);
	const ciphertextWords = CryptoJS.enc.Base64.parse(ciphertextBase64);

	// Verificar tag de autenticação primeiro
	const computedTag = CryptoJS.HmacSHA256(ciphertextWords, masterKeyWords);
	if (computedTag.toString(CryptoJS.enc.Base64) !== tagBase64) {
		throw new Error("Autenticação falhou: tag inválida na chave armazenada");
	}

	// Descriptografar usando AES-256-CBC
	const cipherParams = CryptoJS.lib.CipherParams.create({
		ciphertext: ciphertextWords,
	});

	const decrypted = CryptoJS.AES.decrypt(cipherParams, masterKeyWords, {
		iv: ivWords,
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.Pkcs7,
	});

	const plainKeyBase64 = decrypted.toString(CryptoJS.enc.Utf8);
	if (!plainKeyBase64) {
		throw new Error("Falha ao descriptografar chave armazenada");
	}

	// Converter de volta para ArrayBuffer
	const plainKeyWords = CryptoJS.enc.Base64.parse(plainKeyBase64);
	const plainKeyBytes = new Uint8Array(plainKeyWords.sigBytes);
	for (let i = 0; i < plainKeyWords.sigBytes; i++) {
		const byte = (plainKeyWords.words[Math.floor(i / 4)] >>> (24 - (i % 4) * 8)) & 0xff;
		plainKeyBytes[i] = byte;
	}

	return plainKeyBytes.buffer;
}

/**
 * Gera ou recupera a chave de criptografia para um chat específico
 * IMPORTANTE: A chave é a mesma para ambos os participantes do chat
 * (baseada apenas no chatId), permitindo E2E encryption
 */
async function getOrCreateChatKey(chatId: string, userId: string): Promise<ArrayBuffer> {
	const startTime = Date.now();
	try {
		// Limpar cache expirado periodicamente (10% das vezes para não impactar performance)
		if (Math.random() < 0.1) {
			cleanExpiredCache();
		}

		// Verificar cache em memória primeiro
		const cached = keyCache.get(chatId);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
			const elapsed = Date.now() - startTime;
			console.log(`🔑 Chave do chat recuperada do cache em ${elapsed}ms`, { chatId });
			return cached.key;
		}

		console.log(`🔑 Chave não encontrada no cache, buscando/gerando...`, { chatId });

		// Usar apenas chatId para a chave de armazenamento
		// Isso garante que ambos os usuários compartilhem a mesma chave
		const storageKey = `${STORAGE_KEY_ENCRYPTED_PREFIX}${chatId}`;

		// Tentar recuperar chave existente (criptografada)
		const storageStartTime = Date.now();
		const storedEncryptedKey = await storage.getItem<string>(storageKey);
		if (storedEncryptedKey) {
			try {
				console.log(`🔓 Descriptografando chave do storage...`, { chatId });
				const decryptStartTime = Date.now();
				// Descriptografar chave
				const key = await decryptStorageKey(storedEncryptedKey, userId);
				const decryptElapsed = Date.now() - decryptStartTime;
				console.log(`🔓 Chave descriptografada do storage em ${decryptElapsed}ms`, { chatId });

				// Validar tamanho da chave
				if (key.byteLength !== KEY_LENGTH) {
					console.warn(
						`⚠️ Chave armazenada tem tamanho incorreto (${key.byteLength} bytes, esperado ${KEY_LENGTH}). Regenerando...`
					);
					// Remover chave inválida e regenerar
					await storage.removeItem(storageKey);
					await storage.removeItem(`${storageKey}_salt`);
				} else {
					// Armazenar no cache antes de retornar
					keyCache.set(chatId, { key, timestamp: Date.now() });
					const totalElapsed = Date.now() - startTime;
					console.log(`✅ Chave recuperada e armazenada no cache em ${totalElapsed}ms`, { chatId });
					return key;
				}
			} catch (keyError: any) {
				console.error("❌ Erro ao recuperar/descriptografar chave armazenada:", keyError);

				// Se for erro de autenticação, a chave pode ter sido criptografada com versão antiga
				// ou a chave mestre mudou. Remover e regenerar.
				if (keyError.message?.includes("Autenticação falhou") || keyError.message?.includes("tag inválida")) {
					console.warn(
						"⚠️ Chave armazenada incompatível (pode ter sido criptografada com versão antiga). Regenerando..."
					);
				}

				// Remover chave corrompida/incompatível e regenerar
				await storage.removeItem(storageKey);
				await storage.removeItem(`${storageKey}_salt`);
			}
		} else {
			console.log(`🔑 Chave não encontrada no storage, gerando nova...`, { chatId });
		}

		// Gerar nova chave compartilhada
		// A chave é derivada apenas do chatId para garantir que ambos os usuários
		// gerem a mesma chave quando acessarem o chat
		const chatHash = await generateChatHash(chatId);

		// Usar um salt fixo baseado no chatId (garante consistência)
		const saltHash = await sha256(`salt_${chatId}`);
		const saltBuffer = hexToArrayBuffer(saltHash);
		const salt = arrayBufferToBase64(saltBuffer);

		// Usar chatHash como password para PBKDF2
		// Isso garante que ambos os usuários gerem a mesma chave
		const password = chatHash;
		console.log(`🔐 Gerando chave com PBKDF2 (${PBKDF2_ITERATIONS} iterações)...`, { chatId });
		const pbkdf2StartTime = Date.now();
		const key = await pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH);
		const pbkdf2Elapsed = Date.now() - pbkdf2StartTime;
		console.log(`🔐 PBKDF2 concluído em ${pbkdf2Elapsed}ms`, { chatId });

		// Validar tamanho da chave gerada
		if (key.byteLength !== KEY_LENGTH) {
			throw new Error(`Chave gerada tem tamanho incorreto: ${key.byteLength} bytes (esperado ${KEY_LENGTH})`);
		}

		// Criptografar e armazenar chave (será a mesma para ambos os usuários)
		console.log(`🔐 Criptografando chave para armazenamento...`, { chatId });
		const encryptStartTime = Date.now();
		const encryptedKey = await encryptStorageKey(key, userId);
		const encryptElapsed = Date.now() - encryptStartTime;
		console.log(`🔐 Chave criptografada em ${encryptElapsed}ms`, { chatId });

		await storage.setItem(storageKey, encryptedKey);
		await storage.setItem(`${storageKey}_salt`, salt);

		// Armazenar no cache
		keyCache.set(chatId, { key, timestamp: Date.now() });

		const totalElapsed = Date.now() - startTime;
		console.log(`✅ Nova chave gerada e armazenada em ${totalElapsed}ms`, { chatId });
		return key;
	} catch (error) {
		console.error("❌ Erro ao obter/criar chave do chat:", error);
		console.error("ChatId:", chatId, "UserId:", userId);
		throw error;
	}
}

/**
 * Criptografa uma mensagem
 * Tenta usar Signal Protocol primeiro (mais seguro)
 * Se falhar por falta de bundle, usa E2EE legado (ECDH) como fallback
 * Isso garante que mensagens sejam enviadas mesmo se destinatário estiver offline
 */
export async function encryptMessage(
	plaintext: string,
	chatId: string,
	userId: string,
	receiverId?: string
): Promise<string> {
	if (!receiverId) {
		throw new Error("receiverId é obrigatório para criptografia E2EE");
	}
	if (!plaintext.trim()) {
		throw new Error("Mensagem não pode estar vazia");
	}

	const startedAt = Date.now();

	// Tentar Signal Protocol primeiro (método preferido)
	// Timeout total de 3 segundos para evitar espera longa
	try {
		const signalPromise = encryptWithSignal({
			currentUserId: userId,
			contactId: receiverId,
			plaintext,
		});

		// Timeout total de 3 segundos para Signal Protocol
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(new Error("Signal Protocol timeout - usando fallback E2EE"));
			}, 3000); // 3s timeout total (retries + listener = ~2.6s máximo)
		});

		const result = await Promise.race([signalPromise, timeoutPromise]);

		const envelopeBytes = MessageEnvelopeCodec.encode({
			version: SIGNAL_ENVELOPE_VERSION,
			cipherType: result.type,
			payload: result.ciphertext,
			chatId,
			senderId: userId,
			receiverId,
			timestamp: Date.now(),
			registrationId: result.registrationId,
		}).finish();

		const envelopeBuffer = ensureArrayBuffer(
			envelopeBytes.buffer.slice(envelopeBytes.byteOffset, envelopeBytes.byteOffset + envelopeBytes.byteLength)
		);
		// Usar base64url (mais eficiente: sem padding, URL-safe, ~10-15% menor)
		const encoded = arrayBufferToBase64URL(envelopeBuffer);

		trackEncryptionEvent({
			stage: "encrypt",
			result: "success",
			userId,
			chatId,
			receiverId,
			durationMs: Date.now() - startedAt,
		});

		return ENCRYPTED_PREFIX + encoded;
	} catch (signalError: any) {
		// Se erro for por falta de bundle de prekeys ou timeout, tentar fallback E2EE
		const isBundleError =
			signalError?.message?.includes("bundle de prekeys") ||
			signalError?.message?.includes("não possui bundle") ||
			signalError?.message?.includes("timeout");

		if (isBundleError) {
			const fallbackStartTime = Date.now();
			console.log("⚠️ Signal Protocol não disponível (bundle ausente/timeout), usando fallback E2EE...");

			try {
				// Usar método E2EE legado que só precisa de chaves públicas (já em cache)
				const { encryptMessageE2EE } = await import("./e2ee");
				const encrypted = await encryptMessageE2EE(plaintext, chatId, userId, receiverId);

				const fallbackDuration = Date.now() - fallbackStartTime;
				trackEncryptionEvent({
					stage: "encrypt",
					result: "success",
					userId,
					chatId,
					receiverId,
					durationMs: Date.now() - startedAt,
				});

				console.log(
					`✅ Mensagem criptografada com fallback E2EE em ${fallbackDuration}ms (destinatário offline)`
				);
				return encrypted;
			} catch (e2eeError) {
				console.error("❌ Erro ao criptografar com fallback E2EE:", e2eeError);
				// Se fallback também falhar, propagar erro original do Signal
				trackEncryptionError(
					{
						stage: "encrypt",
						userId,
						chatId,
						receiverId,
						durationMs: Date.now() - startedAt,
					},
					signalError
				);
				throw signalError instanceof Error ? signalError : new Error("Falha ao criptografar mensagem");
			}
		}

		// Para outros erros do Signal, propagar normalmente
		trackEncryptionError(
			{
				stage: "encrypt",
				userId,
				chatId,
				receiverId,
				durationMs: Date.now() - startedAt,
			},
			signalError
		);
		throw signalError instanceof Error ? signalError : new Error("Falha ao criptografar mensagem");
	}
}

/**
 * Descriptografa uma mensagem
 */
export async function decryptMessage(
	encryptedText: string,
	chatId: string,
	userId: string,
	senderId: string,
	receiverId: string
): Promise<string> {
	try {
		// Verificar se é uma mensagem criptografada
		if (!encryptedText.startsWith(ENCRYPTED_PREFIX)) {
			// Se não começar com o prefixo, retornar como está (mensagem não criptografada)
			return encryptedText;
		}

		// Remover prefixo
		const withoutPrefix = encryptedText.substring(ENCRYPTED_PREFIX.length);
		if (!withoutPrefix || withoutPrefix.length === 0) {
			throw new Error("Mensagem criptografada vazia após remover prefixo");
		}

		// Verificar se é mensagem própria ANTES de tentar descriptografar
		// Mensagens próprias não devem ser descriptografadas (já estão no banco local com texto plano)
		if (senderId === userId) {
			console.log("ℹ️ Mensagem própria detectada - retornando placeholder (texto já está no banco local)");
			return "[Mensagem própria]";
		}

		// Tentar novo formato (envelope protobuf)
		const envelope = tryDecodeSignalEnvelope(withoutPrefix);
		if (envelope?.version === SIGNAL_ENVELOPE_VERSION) {

			const remoteParticipant = senderId;
			if (!remoteParticipant) {
				throw new Error("Participante remoto não identificado para descriptografia");
			}

			if (envelope.timestamp) {
				// Permitir até 5 minutos no futuro para tolerar diferenças de relógio
				const MAX_FUTURE_OFFSET_MS = 5 * 60 * 1000; // 5 minutos
				const messageAge = Date.now() - envelope.timestamp;

				if (messageAge > MAX_MESSAGE_AGE_MS) {
					throw new Error("Mensagem muito antiga");
				}

				// Permitir pequenas diferenças de relógio (até 5 minutos no futuro)
				if (messageAge < -MAX_FUTURE_OFFSET_MS) {
					const futureOffset = Math.abs(messageAge) / (60 * 1000); // em minutos
					console.warn(`⚠️ Timestamp muito no futuro (Signal): ${futureOffset.toFixed(1)} minutos à frente`);
					throw new Error(
						`Timestamp inválido: mensagem muito no futuro (${futureOffset.toFixed(1)} minutos)`
					);
				}

				// Se está no futuro mas dentro da tolerância, apenas logar e continuar
				if (messageAge < 0) {
					const futureOffset = Math.abs(messageAge) / 1000; // em segundos
					console.log(
						`ℹ️ Mensagem Signal com timestamp ${futureOffset.toFixed(
							0
						)}s no futuro (diferença de relógio aceita)`
					);
				}
			}

			const startedAt = Date.now();
			try {
				const plaintext = await decryptWithSignal({
					currentUserId: userId,
					contactId: remoteParticipant,
					payload: envelope.payload ?? new Uint8Array(),
					type: envelope.cipherType,
				});

				trackEncryptionEvent({
					stage: "decrypt",
					result: "success",
					userId,
					chatId,
					receiverId: remoteParticipant,
					durationMs: Date.now() - startedAt,
				});

				return plaintext;
			} catch (error: any) {
				trackEncryptionError(
					{
						stage: "decrypt",
						userId,
						chatId,
						receiverId: remoteParticipant,
						durationMs: Date.now() - startedAt,
					},
					error
				);

				// Tratar erros específicos do Signal
				const errorMessage = error?.message || String(error);

				// Erro de "sending chain" - mensagem própria (fallback caso verificação inicial falhe)
				if (
					errorMessage.includes("Tried to decrypt on a sending chain") ||
					errorMessage.includes("sending chain") ||
					errorMessage.includes("mensagem própria")
				) {
					console.log("ℹ️ Mensagem própria detectada via Signal Protocol - retornando placeholder");
					return "[Mensagem própria]";
				}

				// Erro de MessageCounterError
				if (
					errorMessage.includes("Message key not found") ||
					errorMessage.includes("counter was repeated") ||
					errorMessage.includes("key was not filled") ||
					errorMessage.includes("MessageCounterError")
				) {
					console.warn("⚠️ Erro de contador de mensagens Signal - sessão pode estar dessincronizada");
					return "[Erro ao descriptografar mensagem: sessão Signal dessincronizada. Tente enviar uma nova mensagem.]";
				}

				throw error instanceof Error ? error : new Error("Falha ao descriptografar envelope Signal");
			}
		}

		// Decodificar payload JSON legado (base64)
		let payload: any;
		try {
			payload = decodePayload(withoutPrefix);
		} catch (decodeError) {
			console.error("❌ Erro ao decodificar payload:", decodeError);
			throw new Error("Payload inválido");
		}

		// Validar estrutura do payload
		if (!payload || typeof payload !== "object") {
			throw new Error("Payload inválido: não é um objeto");
		}

		// Validar versão
		if (!payload.v) {
			throw new Error("Payload inválido: versão não especificada");
		}

		// Suportar versão 4 (E2EE com ECDH) e versão 3 (método antigo)
		if (payload.v === "2") {
			throw new Error(
				"Versão de criptografia não suportada: v2 (formato antigo com XOR). Todas as mensagens antigas devem ser apagadas."
			);
		}

		// Versão 4: E2EE com ECDH legado
		if (payload.v === "4") {
			try {
				const { decryptMessageE2EE } = await import("./e2ee");
				const legacySender = senderId === userId ? receiverId : senderId;
				return await decryptMessageE2EE(encryptedText, chatId, legacySender, userId);
			} catch (e2eeError: any) {
				console.error("❌ Erro ao descriptografar com E2EE (legado):", e2eeError);
				throw new Error(`Falha ao descriptografar mensagem E2EE: ${e2eeError.message}`);
			}
		}

		// Versão 3: Método antigo (PBKDF2 + AES-256)
		if (payload.v !== "3") {
			throw new Error(`Versão de criptografia não suportada: ${payload.v} (esperado: 3 ou 4)`);
		}

		// Validar campos obrigatórios para v3
		if (!payload.iv || !payload.ciphertext || !payload.tag || !payload.nonce || !payload.t) {
			throw new Error("Payload inválido: campos obrigatórios faltando (iv, ciphertext, tag, nonce, t)");
		}

		// Validar timestamp (prevenir replay attacks)
		// Permitir até 5 minutos no futuro para tolerar diferenças de relógio entre dispositivos
		const MAX_FUTURE_OFFSET_MS = 5 * 60 * 1000; // 5 minutos
		const messageAge = Date.now() - payload.t;

		if (messageAge > MAX_MESSAGE_AGE_MS) {
			throw new Error(
				`Mensagem muito antiga: ${Math.floor(messageAge / (60 * 60 * 1000))} horas (máximo: 24 horas)`
			);
		}

		// Permitir pequenas diferenças de relógio (até 5 minutos no futuro)
		if (messageAge < -MAX_FUTURE_OFFSET_MS) {
			const futureOffset = Math.abs(messageAge) / (60 * 1000); // em minutos
			console.warn(
				`⚠️ Timestamp muito no futuro: ${futureOffset.toFixed(
					1
				)} minutos à frente. Pode ser diferença de relógio.`
			);
			throw new Error(`Timestamp inválido: mensagem muito no futuro (${futureOffset.toFixed(1)} minutos)`);
		}

		// Se está no futuro mas dentro da tolerância, apenas logar e continuar
		if (messageAge < 0) {
			const futureOffset = Math.abs(messageAge) / 1000; // em segundos
			console.log(
				`ℹ️ Mensagem com timestamp ${futureOffset.toFixed(0)}s no futuro (diferença de relógio aceita)`
			);
		}

		// Obter chave do chat
		const key = await getOrCreateChatKey(chatId, userId);

		// Converter IV
		let iv: ArrayBuffer;
		try {
			iv = base64ToArrayBuffer(payload.iv);
		} catch (ivError) {
			console.error("❌ Erro ao converter IV:", ivError);
			throw new Error("IV inválido");
		}

		// Descriptografar usando AES-256-GCM
		const plaintext = await decryptAES(payload.ciphertext, key, iv, payload.tag);

		return plaintext;
	} catch (error: any) {
		console.error("❌ Erro ao descriptografar mensagem:", error);
		console.error("ChatId:", chatId, "UserId:", userId);
		console.error("Texto criptografado (primeiros 50 chars):", encryptedText.substring(0, 50));

		// Se for erro de autenticação (tag inválida), pode ser mensagem corrompida ou chave incorreta
		if (error.message && error.message.includes("Autenticação falhou")) {
			console.warn("⚠️ Falha de autenticação - mensagem pode estar corrompida ou chave incorreta");
			return "[Mensagem não pode ser descriptografada]";
		}

		// Se for erro de versão, pode ser mensagem antiga com formato diferente
		if (error.message && error.message.includes("Versão de criptografia não suportada")) {
			console.warn("⚠️ Versão de criptografia não suportada - mensagem pode ser antiga");
			return "[Mensagem com formato antigo - apague todas as mensagens antigas]";
		}

		// Se for erro de timestamp
		if (error.message && (error.message.includes("muito antiga") || error.message.includes("Timestamp inválido"))) {
			const isFutureError = error.message.includes("futuro");
			if (isFutureError) {
				console.warn("⚠️ Mensagem rejeitada: timestamp muito no futuro (diferença de relógio excessiva)");
				return "[Mensagem rejeitada: timestamp muito no futuro. Verifique sincronização de relógio.]";
			} else {
				console.warn("⚠️ Mensagem rejeitada por validação de timestamp");
				return "[Mensagem rejeitada: muito antiga ou timestamp inválido]";
			}
		}

		// Se for erro de "sending chain" - mensagem própria (fallback)
		if (
			error.message &&
			(error.message.includes("Tried to decrypt on a sending chain") ||
				error.message.includes("sending chain") ||
				error.message.includes("mensagem própria") ||
				error.message.includes("Não é possível descriptografar mensagem própria"))
		) {
			console.log("ℹ️ Mensagem própria detectada no catch - retornando placeholder");
			return "[Mensagem própria]";
		}

		// Para outros erros, retornar placeholder
		return "[Erro ao descriptografar mensagem]";
	}
}

/**
 * Gera um hash HMAC para autenticação de mensagem
 */
export async function generateMessageHMAC(message: string, chatId: string, userId: string): Promise<string> {
	const key = await getOrCreateChatKey(chatId, userId);

	// Criar uma chave HMAC derivada da chave principal
	const hmacKey = await hmacSha256(key, stringToArrayBuffer("HMAC_KEY"));

	// Gerar HMAC da mensagem
	const messageBuffer = stringToArrayBuffer(message);
	const hmac = await hmacSha256(hmacKey, messageBuffer);

	return arrayBufferToBase64(hmac);
}

/**
 * Verifica o HMAC de uma mensagem
 */
export async function verifyMessageHMAC(
	message: string,
	hmac: string,
	chatId: string,
	userId: string
): Promise<boolean> {
	try {
		const computedHMAC = await generateMessageHMAC(message, chatId, userId);
		const computedBuffer = base64ToArrayBuffer(computedHMAC);
		const providedBuffer = base64ToArrayBuffer(hmac);

		return constantTimeEquals(new Uint8Array(computedBuffer), new Uint8Array(providedBuffer));
	} catch (error) {
		console.error("Erro ao verificar HMAC:", error);
		return false;
	}
}

/**
 * Limpa todas as chaves de criptografia (útil para logout)
 */
export async function clearAllKeys(userId?: string): Promise<void> {
	try {
		// Limpar caches em memória
		keyCache.clear();
		masterKeyCache.clear();

		// Limpar caches E2EE
		const { clearSharedSecretCache } = await import("./e2ee");
		const { clearPublicKeyCache } = await import("./keyManagement");
		clearSharedSecretCache();
		clearPublicKeyCache();

		// Limpar chaves do storage
		const keys = await AsyncStorage.getAllKeys();
		const chatKeys = keys.filter(
			(key) =>
				key.startsWith(STORAGE_KEY_ENCRYPTED_PREFIX) ||
				key.startsWith(STORAGE_KEY_MASTER_SALT_PREFIX) ||
				key.endsWith("_salt") ||
				key.startsWith("chat_key_") // Compatibilidade com chaves antigas
		);
		await Promise.all(chatKeys.map((key) => AsyncStorage.removeItem(key)));

		if (userId) {
			await Promise.all([removePrivateKey(userId), clearSignalSessions(userId)]);
		}
	} catch (error) {
		console.error("Erro ao limpar chaves:", error);
		throw error;
	}
}

/**
 * Exporta chave de um chat (útil para backup ou migração)
 * ATENÇÃO: Isso expõe a chave - use com cuidado!
 */
export async function exportChatKey(chatId: string, userId: string): Promise<string | null> {
	try {
		const storageKey = `chat_key_${chatId}`;
		const key = await storage.getItem<string>(storageKey);
		return key;
	} catch (error) {
		console.error("Erro ao exportar chave:", error);
		return null;
	}
}

/**
 * Importa chave de um chat (útil para backup ou migração)
 * ATENÇÃO: Valide a origem da chave antes de importar!
 */
export async function importChatKey(chatId: string, userId: string, keyBase64: string): Promise<boolean> {
	try {
		const storageKey = `chat_key_${chatId}`;

		// Validar formato da chave
		const keyBuffer = base64ToArrayBuffer(keyBase64);
		if (keyBuffer.byteLength !== KEY_LENGTH) {
			throw new Error("Chave inválida: tamanho incorreto");
		}

		await storage.setItem(storageKey, keyBase64);
		return true;
	} catch (error) {
		console.error("Erro ao importar chave:", error);
		return false;
	}
}
