/**
 * Gerenciamento de Chaves Públicas/Privadas para E2EE
 * 
 * Gerencia pares de chaves assimétricas (Curve25519) para criptografia End-to-End
 * - Chave privada: Armazenada no Keychain (nunca sai do dispositivo)
 * - Chave pública: Armazenada no Firestore (users/{userId}/publicKey)
 */

import "react-native-get-random-values";
import * as Keychain from "react-native-keychain";
import { x25519 } from "@noble/curves/ed25519";
import { randomBytes } from "@noble/hashes/utils";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/core/firebase";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

/**
 * Converte Uint8Array para base64 (compatível com React Native)
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
	const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
	return btoa(binary);
}

/**
 * Converte base64 para Uint8Array (compatível com React Native)
 */
function base64ToUint8Array(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

// Verificar se Keychain está disponível
let isKeychainAvailable = true;
try {
	// Testar se Keychain está disponível
	if (!Keychain || typeof Keychain.setGenericPassword !== "function") {
		isKeychainAvailable = false;
	}
} catch (error) {
	isKeychainAvailable = false;
	console.warn("⚠️ Keychain não disponível, usando SecureStore como fallback");
}

const KEYCHAIN_SERVICE = "com.chatup.e2ee";
const KEYCHAIN_KEY_PRIVATE = "private_key";

// Cache de chaves públicas (evitar buscar do Firestore toda vez)
const publicKeyCache = new Map<string, { key: Uint8Array; timestamp: number }>();
const PUBLIC_KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Gera um par de chaves (privada/pública) usando Curve25519
 */
export async function generateKeyPair(): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
	try {
		// Gerar chave privada aleatória usando expo-crypto
		const privateKeyBytes = await Crypto.getRandomBytesAsync(32);
		const privateKey = new Uint8Array(privateKeyBytes);
		
		// Derivar chave pública da chave privada
		const publicKey = x25519.getPublicKey(privateKey);
		
		console.log("✅ Par de chaves gerado com sucesso");
		return {
			privateKey,
			publicKey,
		};
	} catch (error) {
		console.error("❌ Erro ao gerar par de chaves:", error);
		throw new Error("Falha ao gerar par de chaves");
	}
}

/**
 * Armazena chave privada no Keychain do sistema (ou SecureStore como fallback)
 */
export async function storePrivateKey(userId: string, privateKey: Uint8Array): Promise<void> {
	try {
		// Converter chave privada para base64 para armazenar
		const privateKeyBase64 = uint8ArrayToBase64(privateKey);
		const storageKey = `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}_${userId}`;
		
		if (isKeychainAvailable) {
			try {
				// Tentar usar Keychain primeiro
				await Keychain.setGenericPassword(
					userId,
					privateKeyBase64,
					{
						service: `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}`,
						accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
					}
				);
				console.log("✅ Chave privada armazenada no Keychain");
				return;
			} catch (keychainError) {
				console.warn("⚠️ Erro ao usar Keychain, tentando SecureStore:", keychainError);
				isKeychainAvailable = false;
			}
		}
		
		// Fallback: usar SecureStore
		await SecureStore.setItemAsync(storageKey, privateKeyBase64);
		console.log("✅ Chave privada armazenada no SecureStore (fallback)");
	} catch (error) {
		console.error("❌ Erro ao armazenar chave privada:", error);
		throw new Error("Falha ao armazenar chave privada");
	}
}

/**
 * Recupera chave privada do Keychain (ou SecureStore como fallback)
 */
export async function getPrivateKey(userId: string): Promise<Uint8Array | null> {
	try {
		const storageKey = `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}_${userId}`;
		
		if (isKeychainAvailable) {
			try {
				// Tentar usar Keychain primeiro
				const credentials = await Keychain.getGenericPassword({
					service: `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}`,
				});
				
				if (credentials && credentials.password && credentials.username === userId) {
					// Converter de base64 para Uint8Array
					const privateKey = base64ToUint8Array(credentials.password);
					return privateKey;
				}
			} catch (keychainError) {
				console.warn("⚠️ Erro ao usar Keychain, tentando SecureStore:", keychainError);
				isKeychainAvailable = false;
			}
		}
		
		// Fallback: usar SecureStore
		const storedKey = await SecureStore.getItemAsync(storageKey);
		if (!storedKey) {
			return null;
		}
		
		// Converter de base64 para Uint8Array
		const privateKey = base64ToUint8Array(storedKey);
		return privateKey;
	} catch (error) {
		console.error("❌ Erro ao recuperar chave privada:", error);
		return null;
	}
}

/**
 * Armazena chave pública no Firestore
 */
export async function storePublicKey(userId: string, publicKey: Uint8Array): Promise<void> {
	if (!db) {
		throw new Error("Firestore não inicializado");
	}
	
	try {
		// Converter chave pública para base64 para armazenar no Firestore
		const publicKeyBase64 = uint8ArrayToBase64(publicKey);
		
		await setDoc(
			doc(db, "users", userId),
			{
				publicKey: publicKeyBase64,
				publicKeyUpdatedAt: serverTimestamp(),
			},
			{ merge: true }
		);
		
		// Atualizar cache
		publicKeyCache.set(userId, {
			key: publicKey,
			timestamp: Date.now(),
		});
		
		console.log("✅ Chave pública armazenada no Firestore");
	} catch (error) {
		console.error("❌ Erro ao armazenar chave pública:", error);
		throw new Error("Falha ao armazenar chave pública");
	}
}

/**
 * Busca chave pública do Firestore (com cache)
 */
export async function getPublicKey(userId: string): Promise<Uint8Array | null> {
	if (!db) {
		throw new Error("Firestore não inicializado");
	}
	
	try {
		// Verificar cache primeiro
		const cached = publicKeyCache.get(userId);
		if (cached && Date.now() - cached.timestamp < PUBLIC_KEY_CACHE_TTL_MS) {
			console.log("🔑 Chave pública recuperada do cache", { userId });
			return cached.key;
		}
		
		// Buscar do Firestore
		const userDoc = await getDoc(doc(db, "users", userId));
		
		if (!userDoc.exists()) {
			return null;
		}
		
		const data = userDoc.data();
		if (!data.publicKey) {
			return null;
		}
		
		// Converter de base64 para Uint8Array
		const publicKey = base64ToUint8Array(data.publicKey);
		
		// Atualizar cache
		publicKeyCache.set(userId, {
			key: publicKey,
			timestamp: Date.now(),
		});
		
		console.log("✅ Chave pública recuperada do Firestore", { userId });
		return publicKey;
	} catch (error) {
		console.error("❌ Erro ao buscar chave pública:", error);
		return null;
	}
}

/**
 * Obtém ou cria par de chaves do usuário
 * Se não existir, gera novo par e armazena
 */
export async function getOrCreateKeyPair(userId: string): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
	try {
		// Tentar recuperar chave privada do Keychain/SecureStore
		let privateKey = await getPrivateKey(userId);
		
		if (privateKey) {
			// Chave privada existe, derivar chave pública
			let resolvedPublicKey = x25519.getPublicKey(privateKey);
			
			// Verificar se chave pública está no Firestore
			const storedPublicKey = await getPublicKey(userId);
			if (!storedPublicKey) {
				// Chave pública não está no Firestore, fazer upload
				await storePublicKey(userId, resolvedPublicKey);
			} else {
				// Usar chave pública do Firestore (pode ser mais recente)
				resolvedPublicKey = storedPublicKey;
			}
			
			return { privateKey, publicKey: resolvedPublicKey };
		}
		
		// Chave privada não existe, gerar novo par
		console.log("🔄 Gerando novo par de chaves para usuário", { userId });
		const keyPair = await generateKeyPair();
		
		// Armazenar chave privada no Keychain/SecureStore
		await storePrivateKey(userId, keyPair.privateKey);
		
		// Armazenar chave pública no Firestore
		await storePublicKey(userId, keyPair.publicKey);
		
		return keyPair;
	} catch (error) {
		console.error("❌ Erro ao obter/criar par de chaves:", error);
		throw error;
	}
}

/**
 * Verifica se usuário tem chave pública no Firestore
 */
export async function hasPublicKey(userId: string): Promise<boolean> {
	const publicKey = await getPublicKey(userId);
	return publicKey !== null;
}

/**
 * Limpa cache de chaves públicas (útil para logout)
 */
export function clearPublicKeyCache(): void {
	publicKeyCache.clear();
	console.log("✅ Cache de chaves públicas limpo");
}

/**
 * Remove chave privada do Keychain/SecureStore (útil para logout)
 */
export async function removePrivateKey(userId: string): Promise<void> {
	try {
		const storageKey = `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}_${userId}`;
		
		if (isKeychainAvailable) {
			try {
				await Keychain.resetGenericPassword({
					service: `${KEYCHAIN_SERVICE}_${KEYCHAIN_KEY_PRIVATE}`,
				});
				console.log("✅ Chave privada removida do Keychain");
			} catch (keychainError) {
				console.warn("⚠️ Erro ao remover do Keychain, tentando SecureStore:", keychainError);
				await SecureStore.deleteItemAsync(storageKey);
				console.log("✅ Chave privada removida do SecureStore");
			}
		} else {
			await SecureStore.deleteItemAsync(storageKey);
			console.log("✅ Chave privada removida do SecureStore");
		}
	} catch (error) {
		console.error("❌ Erro ao remover chave privada:", error);
	}
}

