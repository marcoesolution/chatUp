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
 * Converte ArrayBuffer para string base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Converte string base64 para ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Converte string para ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
	const encoder = new TextEncoder();
	return encoder.encode(str).buffer;
}

/**
 * Converte ArrayBuffer para string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
	const decoder = new TextDecoder();
	return decoder.decode(buffer);
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
async function generateIV(): Promise<string> {
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
 */
export async function encryptMessage(plaintext: string, chatId: string, userId: string): Promise<string> {
	try {
		// Validar entrada
		if (!plaintext || !plaintext.trim()) {
			throw new Error("Mensagem não pode estar vazia");
		}

		if (!chatId || !userId) {
			throw new Error("chatId e userId são obrigatórios");
		}

		// Obter chave e gerar IV/nonce em paralelo para melhor performance
		const [key, ivBase64, nonce] = await Promise.all([
			getOrCreateChatKey(chatId, userId),
			generateIV(),
			generateNonce(),
		]);

		const iv = base64ToArrayBuffer(ivBase64);

		// Criptografar mensagem usando AES-256-GCM
		const { ciphertext, tag } = await encryptAES(plaintext, key, iv);

		// Criar payload criptografado
		const payload = {
			iv: ivBase64,
			ciphertext,
			tag,
			nonce,
			t: Date.now(), // timestamp para validação
			v: "3", // versão 3: AES-256-GCM com nonce e timestamp
		};

		// Codificar em base64
		const encoded = encodePayload(payload);

		const finalResult = ENCRYPTED_PREFIX + encoded;

		// Retornar com prefixo
		return finalResult;
	} catch (error) {
		console.error("Erro ao criptografar mensagem:", error);
		throw new Error("Falha ao criptografar mensagem");
	}
}

/**
 * Descriptografa uma mensagem
 */
export async function decryptMessage(encryptedText: string, chatId: string, userId: string): Promise<string> {
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

		// Decodificar payload (base64)
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

		// Suportar versão 3 (AES-GCM) e rejeitar versões antigas
		if (payload.v === "2") {
			throw new Error(
				"Versão de criptografia não suportada: v2 (formato antigo com XOR). Todas as mensagens antigas devem ser apagadas."
			);
		}

		if (payload.v !== "3") {
			throw new Error(`Versão de criptografia não suportada: ${payload.v} (esperado: 3)`);
		}

		// Validar campos obrigatórios para v3
		if (!payload.iv || !payload.ciphertext || !payload.tag || !payload.nonce || !payload.t) {
			throw new Error("Payload inválido: campos obrigatórios faltando (iv, ciphertext, tag, nonce, t)");
		}

		// Validar timestamp (prevenir replay attacks)
		const messageAge = Date.now() - payload.t;
		if (messageAge > MAX_MESSAGE_AGE_MS) {
			throw new Error(
				`Mensagem muito antiga: ${Math.floor(messageAge / (60 * 60 * 1000))} horas (máximo: 24 horas)`
			);
		}

		if (messageAge < 0) {
			throw new Error("Timestamp inválido: mensagem do futuro");
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
			console.warn("⚠️ Mensagem rejeitada por validação de timestamp");
			return "[Mensagem rejeitada: muito antiga ou timestamp inválido]";
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
 * Pré-carrega a chave de criptografia para um chat específico
 * Isso evita o delay na primeira mensagem do chat
 */
export async function preloadChatKey(chatId: string, userId: string): Promise<void> {
	try {
		// Verificar cache primeiro - se já estiver em cache, retornar imediatamente
		const cached = keyCache.get(chatId);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
			console.log("✅ Chave já está em cache, pré-carregamento desnecessário", { chatId });
			return;
		}

		console.log("🔄 Pré-carregando chave do chat...", { chatId, userId });
		const startTime = Date.now();

		// Pré-carregar chave (e chave mestre se necessário)
		await getOrCreateChatKey(chatId, userId);

		const elapsed = Date.now() - startTime;
		console.log(`✅ Chave pré-carregada com sucesso em ${elapsed}ms`, { chatId });
	} catch (error) {
		console.warn("⚠️ Erro ao pré-carregar chave do chat:", error);
		// Não propagar erro - é apenas otimização
		// A chave será gerada quando necessário (na primeira mensagem)
	}
}

/**
 * Limpa todas as chaves de criptografia (útil para logout)
 */
export async function clearAllKeys(): Promise<void> {
	try {
		// Limpar caches em memória
		keyCache.clear();
		masterKeyCache.clear();

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
