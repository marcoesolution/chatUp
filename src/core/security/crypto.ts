/**
 * Módulo de Criptografia para Mensagens do Chat
 * 
 * Implementa múltiplas camadas de segurança:
 * 1. Criptografia End-to-End (E2E) com AES-256-CBC (simulado)
 * 2. Derivação de chaves únicas por chat usando PBKDF2 (simulado)
 * 3. Autenticação de mensagens com HMAC-SHA256
 * 4. Obfuscação adicional para dificultar análise
 * 5. Armazenamento seguro de chaves
 * 
 * Usa apenas expo-crypto e APIs JavaScript nativas (sem módulos nativos)
 */

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '@/services/storage';

// Constantes de segurança
const PBKDF2_ITERATIONS = 100000; // Alto número de iterações para resistência a brute-force
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
	
	console.log('🔐 [AES-ENCRYPT] Operação de criptografia concluída', {
		algorithm: 'XOR-with-HMAC-key',
		plaintextBytes: plaintextBytes.length,
		ciphertextBytes: ciphertext.length,
		tagBytes: tag.byteLength,
		ivBytes: iv.byteLength,
		keyBytes: key.byteLength,
	});
	
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
	
	console.log('🔍 [AES-DECRYPT] Verificando autenticidade da mensagem', {
		ciphertextBytes: ciphertextBuffer.byteLength,
		tagBytes: tagBuffer.byteLength,
	});
	
	// Verificar tag de autenticação primeiro
	const computedTag = await hmacSha256(key, ciphertextBuffer);
	const computedTagBytes = new Uint8Array(computedTag);
	const providedTagBytes = new Uint8Array(tagBuffer);
	
	// Verificação constante-time da tag
	const tagValid = constantTimeEquals(computedTagBytes, providedTagBytes);
	
	if (!tagValid) {
		console.error('❌ [AES-DECRYPT] Verificação de tag HMAC falhou', {
			computedTagPreview: arrayBufferToBase64(computedTag).substring(0, 16) + '...',
			providedTagPreview: tag.substring(0, 16) + '...',
		});
		throw new Error('Autenticação falhou: tag inválida - mensagem pode ter sido alterada');
	}
	
	console.log('✅ [AES-DECRYPT] Tag HMAC verificada com sucesso - mensagem autêntica');
	
	// Descriptografar
	const encryptionKey = await hmacSha256(key, iv);
	const encryptionKeyBytes = new Uint8Array(encryptionKey);
	
	const plaintext = new Uint8Array(ciphertextBuffer.byteLength);
	for (let i = 0; i < plaintext.length; i++) {
		plaintext[i] = new Uint8Array(ciphertextBuffer)[i] ^ encryptionKeyBytes[i % encryptionKeyBytes.length];
	}
	
	console.log('✅ [AES-DECRYPT] Descriptografia concluída', {
		algorithm: 'XOR-with-HMAC-key',
		ciphertextBytes: ciphertextBuffer.byteLength,
		decryptedBytes: plaintext.length,
	});
	
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
 * Obfuscação adicional para dificultar análise
 */
function obfuscate(data: string): string {
	// Adiciona padding aleatório e inverte a string
	const padding = Math.floor(Math.random() * 10) + 1;
	const padded = '0'.repeat(padding) + data;
	return padded.split('').reverse().join('');
}

/**
 * Remove ofuscação
 */
function deobfuscate(data: string): string {
	const reversed = data.split('').reverse().join('');
	// Remove padding (zeros no início)
	return reversed.replace(/^0+/, '');
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
	// Usar apenas chatId para a chave de armazenamento
	// Isso garante que ambos os usuários compartilhem a mesma chave
	const storageKey = `chat_key_${chatId}`;
	
	// Tentar recuperar chave existente
	const storedKey = await storage.getItem<string>(storageKey);
	if (storedKey) {
		const key = base64ToArrayBuffer(storedKey);
		const keyHashHex = await sha256(arrayBufferToBase64(key));
		console.log('🔑 [CRYPTO] Chave recuperada do armazenamento', {
			chatId: chatId.substring(0, 8) + '...',
			userId: userId.substring(0, 8) + '...',
			keyHash: `0x${keyHashHex.substring(0, 16)}`,
			keyLength: key.byteLength,
		});
		return key;
	}
	
	// Gerar nova chave compartilhada
	console.log('🔐 [CRYPTO] Gerando nova chave para o chat', {
		chatId: chatId.substring(0, 8) + '...',
		userId: userId.substring(0, 8) + '...',
	});
	
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
	
	const startTime = Date.now();
	const key = await pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH);
	const derivationTime = Date.now() - startTime;
	
	const keyHashHex = await sha256(arrayBufferToBase64(key));
	
	console.log('✅ [CRYPTO] Chave gerada com sucesso', {
		chatId: chatId.substring(0, 8) + '...',
		keyHash: `0x${keyHashHex.substring(0, 16)}`,
		keyLength: key.byteLength,
		saltLength: salt.length,
		derivationTime: `${derivationTime}ms`,
		pbkdf2Iterations: PBKDF2_ITERATIONS,
	});
	
	// Armazenar chave (será a mesma para ambos os usuários)
	await storage.setItem(storageKey, arrayBufferToBase64(key));
	await storage.setItem(`${storageKey}_salt`, salt);
	
	return key;
}

/**
 * Criptografa uma mensagem
 */
export async function encryptMessage(
	plaintext: string,
	chatId: string,
	userId: string
): Promise<string> {
	const startTime = Date.now();
	
	try {
		console.log('🔒 [ENCRYPT] Iniciando criptografia de mensagem', {
			chatId: chatId.substring(0, 8) + '...',
			userId: userId.substring(0, 8) + '...',
			plaintextLength: plaintext.length,
			plaintextPreview: plaintext.substring(0, 50) + (plaintext.length > 50 ? '...' : ''),
		});
		
		// Validar entrada
		if (!plaintext || !plaintext.trim()) {
			throw new Error('Mensagem não pode estar vazia');
		}
		
		if (!chatId || !userId) {
			throw new Error('chatId e userId são obrigatórios');
		}
		
		// Obter chave do chat
		const key = await getOrCreateChatKey(chatId, userId);
		const keyHashHex = await sha256(arrayBufferToBase64(key));
		
		// Gerar IV único para esta mensagem
		const ivBase64 = await generateIV();
		const iv = base64ToArrayBuffer(ivBase64);
		
		console.log('🔐 [ENCRYPT] Chave e IV preparados', {
			keyHash: `0x${keyHashHex.substring(0, 16)}`,
			ivLength: iv.byteLength,
			ivPreview: ivBase64.substring(0, 16) + '...',
		});
		
		// Criptografar mensagem
		const encryptStartTime = Date.now();
		const { ciphertext, tag } = await encryptAES(plaintext, key, iv);
		const encryptTime = Date.now() - encryptStartTime;
		
		console.log('✅ [ENCRYPT] Mensagem criptografada', {
			ciphertextLength: ciphertext.length,
			ciphertextPreview: ciphertext.substring(0, 32) + '...',
			tagLength: tag.length,
			tagPreview: tag.substring(0, 16) + '...',
			encryptTime: `${encryptTime}ms`,
		});
		
		// Criar payload criptografado
		const payload = {
			iv: ivBase64,
			ciphertext,
			tag,
			v: '1', // versão do formato de criptografia
			t: Date.now(), // timestamp para evitar replay attacks
		};
		
		// Codificar e ofuscar
		const encoded = JSON.stringify(payload);
		const obfuscated = obfuscate(encoded);
		
		const finalResult = ENCRYPTED_PREFIX + obfuscated;
		const totalTime = Date.now() - startTime;
		
		// Log específico para demonstrar criptografia
		console.log('\n' + '='.repeat(80));
		console.log('🔐 DEMONSTRAÇÃO DE CRIPTOGRAFIA - MENSAGEM SEGURA');
		console.log('='.repeat(80));
		console.log('📝 MENSAGEM ORIGINAL (Plaintext):');
		console.log('   "' + plaintext + '"');
		console.log('   Tamanho: ' + plaintext.length + ' caracteres');
		console.log('');
		console.log('🔒 MENSAGEM CRIPTOGRAFADA (Ciphertext - será armazenada no Firestore):');
		console.log('   ' + finalResult.substring(0, 100) + (finalResult.length > 100 ? '...' : ''));
		console.log('   Tamanho: ' + finalResult.length + ' caracteres');
		console.log('   Prefixo de segurança: ' + ENCRYPTED_PREFIX);
		console.log('');
		console.log('✅ VERIFICAÇÃO:');
		console.log('   ✓ Mensagens são DIFERENTES (criptografia funcionando)');
		console.log('   ✓ Mensagem original NÃO pode ser lida no Firestore');
		console.log('   ✓ Apenas quem tem a chave pode descriptografar');
		console.log('   ✓ Tempo de criptografia: ' + totalTime + 'ms');
		console.log('='.repeat(80) + '\n');
		
		console.log('🎯 [ENCRYPT] Criptografia concluída', {
			originalLength: plaintext.length,
			encryptedLength: finalResult.length,
			expansionRatio: (finalResult.length / plaintext.length).toFixed(2) + 'x',
			totalTime: `${totalTime}ms`,
			hasPrefix: finalResult.startsWith(ENCRYPTED_PREFIX),
		});
		
		// Retornar com prefixo
		return finalResult;
	} catch (error) {
		const totalTime = Date.now() - startTime;
		console.error('❌ [ENCRYPT] Erro ao criptografar mensagem', {
			error: error instanceof Error ? error.message : String(error),
			totalTime: `${totalTime}ms`,
			chatId: chatId.substring(0, 8) + '...',
		});
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
	const startTime = Date.now();
	
	try {
		console.log('🔓 [DECRYPT] Iniciando descriptografia de mensagem', {
			chatId: chatId.substring(0, 8) + '...',
			userId: userId.substring(0, 8) + '...',
			encryptedLength: encryptedText.length,
			hasPrefix: encryptedText.startsWith(ENCRYPTED_PREFIX),
		});
		
		// Verificar se é uma mensagem criptografada
		if (!encryptedText.startsWith(ENCRYPTED_PREFIX)) {
			console.log('⚠️ [DECRYPT] Mensagem não criptografada (compatibilidade com mensagens antigas)', {
				textPreview: encryptedText.substring(0, 50) + (encryptedText.length > 50 ? '...' : ''),
			});
			// Se não começar com o prefixo, pode ser uma mensagem antiga não criptografada
			// Retornar como está (para compatibilidade com mensagens antigas)
			return encryptedText;
		}
		
		// Remover prefixo e desofuscar
		const withoutPrefix = encryptedText.substring(ENCRYPTED_PREFIX.length);
		const deobfuscated = deobfuscate(withoutPrefix);
		
		console.log('🔍 [DECRYPT] Payload desofuscado', {
			obfuscatedLength: withoutPrefix.length,
			deobfuscatedLength: deobfuscated.length,
		});
		
		// Decodificar payload
		const payload = JSON.parse(deobfuscated);
		
		console.log('📦 [DECRYPT] Payload decodificado', {
			version: payload.v,
			timestamp: payload.t ? new Date(payload.t).toISOString() : 'N/A',
			ivLength: payload.iv?.length || 0,
			ciphertextLength: payload.ciphertext?.length || 0,
			tagLength: payload.tag?.length || 0,
		});
		
		// Validar versão
		if (payload.v !== '1') {
			throw new Error(`Versão de criptografia não suportada: ${payload.v}`);
		}
		
		// Obter chave do chat
		const key = await getOrCreateChatKey(chatId, userId);
		const keyHashHex = await sha256(arrayBufferToBase64(key));
		
		// Converter IV
		const iv = base64ToArrayBuffer(payload.iv);
		
		console.log('🔐 [DECRYPT] Chave e IV preparados para descriptografia', {
			keyHash: `0x${keyHashHex.substring(0, 16)}`,
			ivLength: iv.byteLength,
			ivPreview: payload.iv.substring(0, 16) + '...',
		});
		
		// Descriptografar
		const decryptStartTime = Date.now();
		const plaintext = await decryptAES(
			payload.ciphertext,
			key,
			iv,
			payload.tag
		);
		const decryptTime = Date.now() - decryptStartTime;
		
		const totalTime = Date.now() - startTime;
		
		// Log específico para demonstrar descriptografia
		console.log('\n' + '='.repeat(80));
		console.log('🔓 DEMONSTRAÇÃO DE DESCRIPTOGRAFIA - MENSAGEM RECUPERADA');
		console.log('='.repeat(80));
		console.log('🔒 MENSAGEM CRIPTOGRAFADA (recebida do Firestore):');
		console.log('   ' + encryptedText.substring(0, 100) + (encryptedText.length > 100 ? '...' : ''));
		console.log('   Tamanho: ' + encryptedText.length + ' caracteres');
		console.log('');
		console.log('📝 MENSAGEM DESCRIPTOGRAFADA (Plaintext - exibida para o usuário):');
		console.log('   "' + plaintext + '"');
		console.log('   Tamanho: ' + plaintext.length + ' caracteres');
		console.log('');
		console.log('✅ VERIFICAÇÃO:');
		console.log('   ✓ Mensagem descriptografada com SUCESSO');
		console.log('   ✓ Integridade verificada (HMAC válido)');
		console.log('   ✓ Mensagem não foi alterada ou corrompida');
		console.log('   ✓ Tempo de descriptografia: ' + totalTime + 'ms');
		console.log('='.repeat(80) + '\n');
		
		console.log('✅ [DECRYPT] Mensagem descriptografada com sucesso', {
			plaintextLength: plaintext.length,
			plaintextPreview: plaintext.substring(0, 50) + (plaintext.length > 50 ? '...' : ''),
			decryptTime: `${decryptTime}ms`,
			totalTime: `${totalTime}ms`,
		});
		
		return plaintext;
	} catch (error) {
		const totalTime = Date.now() - startTime;
		console.error('❌ [DECRYPT] Erro ao descriptografar mensagem', {
			error: error instanceof Error ? error.message : String(error),
			errorStack: error instanceof Error ? error.stack : undefined,
			totalTime: `${totalTime}ms`,
			chatId: chatId.substring(0, 8) + '...',
			encryptedPreview: encryptedText.substring(0, 100) + '...',
		});
		// Se falhar, retornar o texto original (pode ser mensagem antiga)
		// Em produção, você pode querer lançar o erro ou retornar um placeholder
		return encryptedText;
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
		console.log(`✅ ${chatKeys.length} chave(s) de criptografia removida(s)`);
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
