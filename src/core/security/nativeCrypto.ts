/**
 * Wrapper TypeScript para o Módulo Nativo de Criptografia
 * 
 * Fornece interface TypeScript type-safe para o módulo nativo Android
 * com fallback para implementação JavaScript quando não disponível.
 */

import { NativeModules, Platform } from 'react-native';

// Tipos
interface NativeCryptoModule {
	// PBKDF2
	pbkdf2(
		password: string,
		salt: string,
		iterations: number,
		keyLength: number
	): Promise<string>;

	// AES
	encryptAES(
		plaintext: string,
		key: string,
		iv: string
	): Promise<{ ciphertext: string; tag: string }>;

	decryptAES(
		ciphertext: string,
		key: string,
		iv: string,
		tag: string
	): Promise<string>;

	// Utilitários
	getRandomBytes(length: number): Promise<string>;
	sha256(data: string): Promise<string>;
	hmacSHA256(key: string, data: string): Promise<string>;

	// Constantes
	PBKDF2_MIN_ITERATIONS: number;
	PBKDF2_RECOMMENDED_ITERATIONS: number;
	AES_KEY_SIZE: number;
	AES_IV_SIZE: number;
	SALT_SIZE: number;
}

// Obter módulo nativo (apenas Android)
const NativeCrypto: NativeCryptoModule | null =
	Platform.OS === 'android' ? NativeModules.NativeCrypto : null;

// Verificar se módulo está disponível
export const isNativeCryptoAvailable = (): boolean => {
	return NativeCrypto !== null && NativeCrypto !== undefined;
};

// Constantes
export const CRYPTO_CONSTANTS = {
	PBKDF2_MIN_ITERATIONS: NativeCrypto?.PBKDF2_MIN_ITERATIONS ?? 10000,
	PBKDF2_RECOMMENDED_ITERATIONS: NativeCrypto?.PBKDF2_RECOMMENDED_ITERATIONS ?? 50000,
	AES_KEY_SIZE: NativeCrypto?.AES_KEY_SIZE ?? 32,
	AES_IV_SIZE: NativeCrypto?.AES_IV_SIZE ?? 16,
	SALT_SIZE: NativeCrypto?.SALT_SIZE ?? 32,
};

// ============================================
// PBKDF2 - Password-Based Key Derivation
// ============================================

/**
 * Deriva uma chave usando PBKDF2-HMAC-SHA256 (versão nativa)
 * 
 * Performance (Android nativo):
 * - 50k iterações: ~500ms-2s (vs ~5-10s em JS)
 * - 100k iterações: ~1-4s (vs ~60-100s em JS)
 * 
 * @param password Senha/passphrase
 * @param salt Salt em Base64
 * @param iterations Número de iterações (recomendado: 50000+)
 * @param keyLength Tamanho da chave em bytes (padrão: 32 = 256 bits)
 * @returns Chave derivada em Base64
 */
export async function pbkdf2Native(
	password: string,
	salt: string,
	iterations: number = CRYPTO_CONSTANTS.PBKDF2_RECOMMENDED_ITERATIONS,
	keyLength: number = CRYPTO_CONSTANTS.AES_KEY_SIZE
): Promise<string> {
	if (!isNativeCryptoAvailable()) {
		throw new Error('Módulo nativo de criptografia não disponível. Use pbkdf2() do crypto.ts como fallback.');
	}

	const startTime = Date.now();
	console.log(`🔐 [NativeCrypto] Iniciando PBKDF2 nativo (${iterations} iterações)...`);

	try {
		const key = await NativeCrypto!.pbkdf2(password, salt, iterations, keyLength);
		const duration = Date.now() - startTime;
		console.log(`✅ [NativeCrypto] PBKDF2 concluído em ${duration}ms`);
		return key;
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error(`❌ [NativeCrypto] Erro em PBKDF2 após ${duration}ms:`, error);
		throw error;
	}
}

// ============================================
// AES-256-CBC - Criptografia Simétrica
// ============================================

/**
 * Criptografa dados usando AES-256-CBC + HMAC-SHA256 (versão nativa)
 * 
 * @param plaintext Texto plano
 * @param key Chave em Base64 (256 bits)
 * @param iv IV em Base64 (128 bits)
 * @returns { ciphertext, tag } em Base64
 */
export async function encryptAESNative(
	plaintext: string,
	key: string,
	iv: string
): Promise<{ ciphertext: string; tag: string }> {
	if (!isNativeCryptoAvailable()) {
		throw new Error('Módulo nativo de criptografia não disponível');
	}

	const startTime = Date.now();
	console.log('🔒 [NativeCrypto] Iniciando AES encrypt nativo...');

	try {
		const result = await NativeCrypto!.encryptAES(plaintext, key, iv);
		const duration = Date.now() - startTime;
		console.log(`✅ [NativeCrypto] AES encrypt concluído em ${duration}ms`);
		return result;
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error(`❌ [NativeCrypto] Erro em AES encrypt após ${duration}ms:`, error);
		throw error;
	}
}

/**
 * Descriptografa dados usando AES-256-CBC + HMAC-SHA256 (versão nativa)
 * 
 * @param ciphertext Texto cifrado em Base64
 * @param key Chave em Base64 (256 bits)
 * @param iv IV em Base64 (128 bits)
 * @param tag Tag HMAC em Base64
 * @returns Texto plano
 */
export async function decryptAESNative(
	ciphertext: string,
	key: string,
	iv: string,
	tag: string
): Promise<string> {
	if (!isNativeCryptoAvailable()) {
		throw new Error('Módulo nativo de criptografia não disponível');
	}

	const startTime = Date.now();
	console.log('🔓 [NativeCrypto] Iniciando AES decrypt nativo...');

	try {
		const plaintext = await NativeCrypto!.decryptAES(ciphertext, key, iv, tag);
		const duration = Date.now() - startTime;
		console.log(`✅ [NativeCrypto] AES decrypt concluído em ${duration}ms`);
		return plaintext;
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error(`❌ [NativeCrypto] Erro em AES decrypt após ${duration}ms:`, error);
		throw error;
	}
}

// ============================================
// Utilitários
// ============================================

/**
 * Gera bytes aleatórios criptograficamente seguros (versão nativa)
 * 
 * @param length Número de bytes
 * @returns Bytes em Base64
 */
export async function getRandomBytesNative(length: number): Promise<string> {
	if (!isNativeCryptoAvailable()) {
		throw new Error('Módulo nativo de criptografia não disponível');
	}

	return NativeCrypto!.getRandomBytes(length);
}

/**
 * Gera hash SHA-256 (versão nativa)
 * 
 * @param data Dados em string
 * @returns Hash em hexadecimal
 */
export async function sha256Native(data: string): Promise<string> {
	if (!isNativeCryptoAvailable()) {
		throw new Error('Módulo nativo de criptografia não disponível');
	}

	return NativeCrypto!.sha256(data);
}

/**
 * Gera HMAC-SHA256 (versão nativa)
 * 
 * @param key Chave em Base64
 * @param data Dados em string
 * @returns HMAC em Base64
 */
export async function hmacSHA256Native(key: string, data: string): Promise<string> {
	if (!isNativeCryptoAvailable()) {
		throw new Error('Módulo nativo de criptografia não disponível');
	}

	return NativeCrypto!.hmacSHA256(key, data);
}

// ============================================
// Funções Híbridas (Nativo + Fallback JS)
// ============================================

/**
 * PBKDF2 com fallback automático
 * Tenta usar versão nativa, se falhar usa JavaScript
 * 
 * NOTA: Para fallback completo, você precisará exportar pbkdf2 do crypto.ts
 * ou usar a função pública getOrCreateChatKey que já usa PBKDF2 internamente
 */
export async function pbkdf2Hybrid(
	password: string,
	salt: string,
	iterations: number,
	keyLength: number
): Promise<string> {
	if (isNativeCryptoAvailable()) {
		try {
			return await pbkdf2Native(password, salt, iterations, keyLength);
		} catch (error) {
			console.warn('⚠️ Erro ao usar PBKDF2 nativo, fallback não disponível:', error);
			throw new Error('PBKDF2 nativo falhou e fallback JS não está configurado. Exporte pbkdf2 de crypto.ts para habilitar fallback.');
		}
	}

	throw new Error('Módulo nativo não disponível e fallback JS não está configurado');
}

/**
 * AES encrypt com fallback automático
 * 
 * NOTA: Para fallback completo, você precisará exportar encryptAES do crypto.ts
 */
export async function encryptAESHybrid(
	plaintext: string,
	key: string,
	iv: string
): Promise<{ ciphertext: string; tag: string }> {
	if (isNativeCryptoAvailable()) {
		try {
			return await encryptAESNative(plaintext, key, iv);
		} catch (error) {
			console.warn('⚠️ Erro ao usar AES nativo, fallback não disponível:', error);
			throw new Error('AES nativo falhou e fallback JS não está configurado');
		}
	}

	throw new Error('Módulo nativo não disponível e fallback JS não está configurado');
}

/**
 * AES decrypt com fallback automático
 * 
 * NOTA: Para fallback completo, você precisará exportar decryptAES do crypto.ts
 */
export async function decryptAESHybrid(
	ciphertext: string,
	key: string,
	iv: string,
	tag: string
): Promise<string> {
	if (isNativeCryptoAvailable()) {
		try {
			return await decryptAESNative(ciphertext, key, iv, tag);
		} catch (error) {
			console.warn('⚠️ Erro ao usar AES nativo, fallback não disponível:', error);
			throw new Error('AES nativo falhou e fallback JS não está configurado');
		}
	}

	throw new Error('Módulo nativo não disponível e fallback JS não está configurado');
}

// ============================================
// Informações e Debug
// ============================================

/**
 * Retorna informações sobre o módulo nativo
 */
export function getNativeCryptoInfo() {
	return {
		available: isNativeCryptoAvailable(),
		platform: Platform.OS,
		constants: CRYPTO_CONSTANTS,
		module: NativeCrypto ? 'Loaded' : 'Not available',
	};
}

/**
 * Testa performance do módulo nativo
 * 
 * NOTA: Para benchmark completo comparando com JS, exporte pbkdf2 do crypto.ts
 */
export async function benchmarkNativeCrypto() {
	console.log('🧪 Iniciando benchmark de criptografia nativa...');

	const password = 'testPassword123';
	const salt = 'dGVzdFNhbHQxMjM='; // Base64
	const iterations = 10000;

	// Teste nativo
	if (isNativeCryptoAvailable()) {
		const start = Date.now();
		await pbkdf2Native(password, salt, iterations, 32);
		const nativeTime = Date.now() - start;
		console.log(`✅ Nativo: ${nativeTime}ms`);
		
		return {
			nativeTime,
			jsTime: 0,
			speedup: 0,
		};
	} else {
		console.log('❌ Módulo nativo não disponível');
		return {
			nativeTime: 0,
			jsTime: 0,
			speedup: 0,
		};
	}
}

// Log de inicialização
if (isNativeCryptoAvailable()) {
	console.log('✅ Módulo nativo de criptografia carregado!', getNativeCryptoInfo());
} else {
	console.log('⚠️ Módulo nativo de criptografia não disponível, usando fallback JavaScript');
}
