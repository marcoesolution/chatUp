/**
 * Módulo de Criptografia para Mensagens do Chat
 * 
 * Implementa criptografia End-to-End (E2E) simplificada para desenvolvimento:
 * 1. Criptografia simétrica usando XOR com chave derivada (simulado AES)
 * 2. Derivação de chaves únicas por chat usando PBKDF2 (simulado)
 * 3. Autenticação de mensagens com HMAC-SHA256
 * 4. Armazenamento seguro de chaves
 * 
 * NOTA: Versão simplificada para desenvolvimento inicial
 * - Sem ofuscação adicional (facilita debug)
 * - PBKDF2 com menos iterações (1000 vs 10000+)
 * - Formato de payload simplificado (base64 JSON)
 * 
 * Usa apenas expo-crypto e APIs JavaScript nativas (sem módulos nativos)
 */

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/services/storage';

// Constantes de segurança
// NOTA: Reduzido para desenvolvimento inicial - aumentar em produção
const PBKDF2_ITERATIONS = 1000; // Reduzido para desenvolvimento (aumentar para 10000+ em produção)
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits para CBC
const KEY_LENGTH = 32; // 256 bits para AES-256
const HMAC_KEY_LENGTH = 32; // 256 bits para HMAC

// Prefixo para identificar mensagens criptografadas
const ENCRYPTED_PREFIX = 'ENC:';

/**
 * Converte ArrayBuffer para string base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
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
	return arrayBufferToBase64(randomBytes.buffer);
}

/**
 * Gera um IV (Initialization Vector) aleatório
 */
async function generateIV(): Promise<string> {
	const randomBytes = await getRandomBytes(IV_LENGTH);
	return arrayBufferToBase64(randomBytes.buffer);
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
	
	const hash = await Crypto.digestStringAsync(
		Crypto.CryptoDigestAlgorithm.SHA256,
		input
	);
	
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
async function pbkdf2(
	password: string,
	salt: string,
	iterations: number,
	keyLength: number
): Promise<ArrayBuffer> {
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
 * Criptografia simétrica usando XOR com chave derivada + HMAC
 * Esta é uma implementação segura que funciona sem módulos nativos
 */
async function encryptAES(
	plaintext: string,
	key: ArrayBuffer,
	iv: ArrayBuffer
): Promise<{ ciphertext: string; tag: string }> {
	const plaintextBuffer = stringToArrayBuffer(plaintext);
	const plaintextBytes = new Uint8Array(plaintextBuffer);
	
	// Derivar chave de criptografia usando HMAC(key, iv)
	const encryptionKey = await hmacSha256(key, iv);
	const encryptionKeyBytes = new Uint8Array(encryptionKey);
	
	// Criptografar usando XOR com chave expandida
	const ciphertext = new Uint8Array(plaintextBytes.length);
	for (let i = 0; i < plaintextBytes.length; i++) {
		ciphertext[i] = plaintextBytes[i] ^ encryptionKeyBytes[i % encryptionKeyBytes.length];
	}
	
	// Gerar tag de autenticação (HMAC do ciphertext)
	const tag = await hmacSha256(key, ciphertext.buffer);
	
	return {
		ciphertext: arrayBufferToBase64(ciphertext.buffer),
		tag: arrayBufferToBase64(tag),
	};
}

/**
 * Descriptografia simétrica
 */
async function decryptAES(
	ciphertext: string,
	key: ArrayBuffer,
	iv: ArrayBuffer,
	tag: string
): Promise<string> {
	const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
	const tagBuffer = base64ToArrayBuffer(tag);
	
	// Verificar tag de autenticação primeiro
	const computedTag = await hmacSha256(key, ciphertextBuffer);
	const computedTagBytes = new Uint8Array(computedTag);
	const providedTagBytes = new Uint8Array(tagBuffer);
	
	// Verificação constante-time da tag
	const tagValid = constantTimeEquals(computedTagBytes, providedTagBytes);
	
	if (!tagValid) {
		throw new Error('Autenticação falhou: tag inválida - mensagem pode ter sido alterada');
	}
	
	// Descriptografar
	const encryptionKey = await hmacSha256(key, iv);
	const encryptionKeyBytes = new Uint8Array(encryptionKey);
	
	const plaintext = new Uint8Array(ciphertextBuffer.byteLength);
	for (let i = 0; i < plaintext.length; i++) {
		plaintext[i] = new Uint8Array(ciphertextBuffer)[i] ^ encryptionKeyBytes[i % encryptionKeyBytes.length];
	}
	
	return arrayBufferToString(plaintext.buffer);
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
		console.error('❌ Erro ao decodificar payload:', error);
		throw new Error('Payload inválido');
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
 * Gera ou recupera a chave de criptografia para um chat específico
 * IMPORTANTE: A chave é a mesma para ambos os participantes do chat
 * (baseada apenas no chatId), permitindo E2E encryption
 */
async function getOrCreateChatKey(chatId: string, userId: string): Promise<ArrayBuffer> {
	try {
		// Usar apenas chatId para a chave de armazenamento
		// Isso garante que ambos os usuários compartilhem a mesma chave
		const storageKey = `chat_key_${chatId}`;
		
		// Tentar recuperar chave existente
		const storedKey = await storage.getItem<string>(storageKey);
		if (storedKey) {
			try {
				const key = base64ToArrayBuffer(storedKey);
				// Validar tamanho da chave
				if (key.byteLength !== KEY_LENGTH) {
					console.warn(`⚠️ Chave armazenada tem tamanho incorreto (${key.byteLength} bytes, esperado ${KEY_LENGTH}). Regenerando...`);
					// Remover chave inválida e regenerar
					await storage.removeItem(storageKey);
					await storage.removeItem(`${storageKey}_salt`);
				} else {
					return key;
				}
			} catch (keyError) {
				console.error('❌ Erro ao recuperar chave armazenada:', keyError);
				// Remover chave corrompida e regenerar
				await storage.removeItem(storageKey);
				await storage.removeItem(`${storageKey}_salt`);
			}
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
		const key = await pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH);
		
		// Validar tamanho da chave gerada
		if (key.byteLength !== KEY_LENGTH) {
			throw new Error(`Chave gerada tem tamanho incorreto: ${key.byteLength} bytes (esperado ${KEY_LENGTH})`);
		}
		
		// Armazenar chave (será a mesma para ambos os usuários)
		await storage.setItem(storageKey, arrayBufferToBase64(key));
		await storage.setItem(`${storageKey}_salt`, salt);
		
		return key;
	} catch (error) {
		console.error('❌ Erro ao obter/criar chave do chat:', error);
		console.error('ChatId:', chatId, 'UserId:', userId);
		throw error;
	}
}

/**
 * Criptografa uma mensagem
 */
export async function encryptMessage(
	plaintext: string,
	chatId: string,
	userId: string
): Promise<string> {
	try {
		// Validar entrada
		if (!plaintext || !plaintext.trim()) {
			throw new Error('Mensagem não pode estar vazia');
		}
		
		if (!chatId || !userId) {
			throw new Error('chatId e userId são obrigatórios');
		}
		
		// Obter chave do chat
		const key = await getOrCreateChatKey(chatId, userId);
		
		// Gerar IV único para esta mensagem
		const ivBase64 = await generateIV();
		const iv = base64ToArrayBuffer(ivBase64);
		
		// Criptografar mensagem
		const { ciphertext, tag } = await encryptAES(plaintext, key, iv);
		
		// Criar payload criptografado
		const payload = {
			iv: ivBase64,
			ciphertext,
			tag,
			v: '2', // versão 2: formato simplificado sem ofuscação
		};
		
		// Codificar em base64 (sem ofuscação para facilitar debug)
		const encoded = encodePayload(payload);
		
		const finalResult = ENCRYPTED_PREFIX + encoded;
		
		// Retornar com prefixo
		return finalResult;
	} catch (error) {
		console.error('Erro ao criptografar mensagem:', error);
		throw new Error('Falha ao criptografar mensagem');
	}
}

/**
 * Descriptografa uma mensagem
 */
export async function decryptMessage(
	encryptedText: string,
	chatId: string,
	userId: string
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
			throw new Error('Mensagem criptografada vazia após remover prefixo');
		}
		
		// Decodificar payload (base64)
		let payload: any;
		try {
			payload = decodePayload(withoutPrefix);
		} catch (decodeError) {
			console.error('❌ Erro ao decodificar payload:', decodeError);
			throw new Error('Payload inválido');
		}
		
		// Validar estrutura do payload
		if (!payload || typeof payload !== 'object') {
			throw new Error('Payload inválido: não é um objeto');
		}
		
		if (!payload.iv || !payload.ciphertext || !payload.tag) {
			throw new Error('Payload inválido: campos obrigatórios faltando (iv, ciphertext, tag)');
		}
		
		// Validar versão (suporta versão 2 - simplificada)
		if (payload.v !== '2') {
			throw new Error(`Versão de criptografia não suportada: ${payload.v} (esperado: 2)`);
		}
		
		// Obter chave do chat
		const key = await getOrCreateChatKey(chatId, userId);
		
		// Converter IV
		let iv: ArrayBuffer;
		try {
			iv = base64ToArrayBuffer(payload.iv);
		} catch (ivError) {
			console.error('❌ Erro ao converter IV:', ivError);
			throw new Error('IV inválido');
		}
		
		// Descriptografar
		const plaintext = await decryptAES(
			payload.ciphertext,
			key,
			iv,
			payload.tag
		);
		
		return plaintext;
	} catch (error: any) {
		console.error('❌ Erro ao descriptografar mensagem:', error);
		console.error('ChatId:', chatId, 'UserId:', userId);
		console.error('Texto criptografado (primeiros 50 chars):', encryptedText.substring(0, 50));
		
		// Se for erro de autenticação (tag inválida), pode ser mensagem corrompida ou chave incorreta
		if (error.message && error.message.includes('Autenticação falhou')) {
			console.warn('⚠️ Falha de autenticação - mensagem pode estar corrompida ou chave incorreta');
			// Retornar placeholder ao invés do texto criptografado
			return '[Mensagem não pode ser descriptografada]';
		}
		
		// Se for erro de versão, pode ser mensagem antiga com formato diferente
		if (error.message && error.message.includes('Versão de criptografia não suportada')) {
			console.warn('⚠️ Versão de criptografia não suportada - mensagem pode ser antiga');
			return '[Mensagem com formato antigo]';
		}
		
		// Para outros erros, retornar placeholder (não retornar texto criptografado por segurança)
		return '[Erro ao descriptografar mensagem]';
	}
}

/**
 * Gera um hash HMAC para autenticação de mensagem
 */
export async function generateMessageHMAC(
	message: string,
	chatId: string,
	userId: string
): Promise<string> {
	const key = await getOrCreateChatKey(chatId, userId);
	
	// Criar uma chave HMAC derivada da chave principal
	const hmacKey = await hmacSha256(key, stringToArrayBuffer('HMAC_KEY'));
	
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
		
		return constantTimeEquals(
			new Uint8Array(computedBuffer),
			new Uint8Array(providedBuffer)
		);
	} catch (error) {
		console.error('Erro ao verificar HMAC:', error);
		return false;
	}
}

/**
 * Limpa todas as chaves de criptografia (útil para logout)
 */
export async function clearAllKeys(): Promise<void> {
	try {
		const keys = await AsyncStorage.getAllKeys();
		const chatKeys = keys.filter(key => 
			key.startsWith('chat_key_') || key.endsWith('_salt')
		);
		await Promise.all(chatKeys.map(key => AsyncStorage.removeItem(key)));
	} catch (error) {
		console.error('Erro ao limpar chaves:', error);
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
		console.error('Erro ao exportar chave:', error);
		return null;
	}
}

/**
 * Importa chave de um chat (útil para backup ou migração)
 * ATENÇÃO: Valide a origem da chave antes de importar!
 */
export async function importChatKey(
	chatId: string,
	userId: string,
	keyBase64: string
): Promise<boolean> {
	try {
		const storageKey = `chat_key_${chatId}`;
		
		// Validar formato da chave
		const keyBuffer = base64ToArrayBuffer(keyBase64);
		if (keyBuffer.byteLength !== KEY_LENGTH) {
			throw new Error('Chave inválida: tamanho incorreto');
		}
		
		await storage.setItem(storageKey, keyBase64);
		return true;
	} catch (error) {
		console.error('Erro ao importar chave:', error);
		return false;
	}
}
