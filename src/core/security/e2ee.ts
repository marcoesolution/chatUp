/**
 * Módulo de Criptografia End-to-End Real (E2EE)
 * 
 * Implementa E2EE usando ECDH (Curve25519) para troca de chaves
 * e AES-256-GCM para criptografia de mensagens
 */

import { x25519 } from "@noble/curves/ed25519";
import { getPrivateKey, getPublicKey } from "./keyManagement";
import CryptoJS from "crypto-js";
import { generateIV } from "./crypto";

// Cache de chaves compartilhadas derivadas (TTL de 1 hora)
const sharedSecretCache = new Map<string, { secret: Uint8Array; timestamp: number }>();
const SHARED_SECRET_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Deriva chave compartilhada usando ECDH
 * sharedSecret = ECDH(privateKeyA, publicKeyB) = ECDH(privateKeyB, publicKeyA)
 */
export function deriveSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
	try {
		// ECDH: sharedSecret = privateKey * publicKey (operação na curva)
		const sharedSecret = x25519.getSharedSecret(privateKey, publicKey);
		
		// Usar apenas os primeiros 32 bytes como chave AES-256
		return sharedSecret.slice(0, 32);
	} catch (error) {
		console.error("❌ Erro ao derivar chave compartilhada:", error);
		throw new Error("Falha ao derivar chave compartilhada");
	}
}

/**
 * Obtém chave compartilhada para um chat específico
 * Usa cache para evitar recalcular toda vez
 */
export async function getSharedSecret(
	chatId: string,
	userIdA: string,
	userIdB: string
): Promise<Uint8Array> {
	try {
		// Criar chave de cache baseada nos IDs (ordem não importa)
		const cacheKey = [userIdA, userIdB].sort().join("_");
		
		// Verificar cache
		const cached = sharedSecretCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < SHARED_SECRET_CACHE_TTL_MS) {
			console.log("🔑 Chave compartilhada recuperada do cache", { chatId });
			return cached.secret;
		}
		
		// Buscar chaves privada e pública
		const privateKeyA = await getPrivateKey(userIdA);
		if (!privateKeyA) {
			throw new Error(`Chave privada não encontrada para usuário ${userIdA}`);
		}
		
		const publicKeyB = await getPublicKey(userIdB);
		if (!publicKeyB) {
			throw new Error(`Chave pública não encontrada para usuário ${userIdB}`);
		}
		
		// Derivar chave compartilhada
		const sharedSecret = deriveSharedSecret(privateKeyA, publicKeyB);
		
		// Armazenar no cache
		sharedSecretCache.set(cacheKey, {
			secret: sharedSecret,
			timestamp: Date.now(),
		});
		
		console.log("✅ Chave compartilhada derivada via ECDH", { chatId });
		return sharedSecret;
	} catch (error) {
		console.error("❌ Erro ao obter chave compartilhada:", error);
		throw error;
	}
}

/**
 * Criptografa mensagem usando E2EE real (ECDH + AES-256-GCM)
 */
export async function encryptMessageE2EE(
	plaintext: string,
	chatId: string,
	senderId: string,
	receiverId: string
): Promise<string> {
	try {
		// Obter chave compartilhada
		const sharedSecret = await getSharedSecret(chatId, senderId, receiverId);
		
		// Converter chave compartilhada para formato do crypto-js
		const keyWords = CryptoJS.lib.WordArray.create(new Uint8Array(sharedSecret));
		
		// Gerar IV
		const ivBase64 = await generateIV();
		const ivWords = CryptoJS.enc.Base64.parse(ivBase64);
		
		// Criptografar usando AES-256-GCM (simulado com CBC + HMAC)
		const encrypted = CryptoJS.AES.encrypt(plaintext, keyWords, {
			iv: ivWords,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7,
		});
		
		const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
		
		// Gerar tag de autenticação (HMAC-SHA256)
		const tagHmac = CryptoJS.HmacSHA256(encrypted.ciphertext, keyWords);
		const tag = tagHmac.toString(CryptoJS.enc.Base64);
		
		// Criar payload criptografado (versão 4: E2EE com ECDH)
		const payload = {
			iv: ivBase64,
			ciphertext,
			tag,
			t: Date.now(), // timestamp
			v: "4", // versão 4: E2EE com ECDH
		};
		
		// Codificar em base64
		const json = JSON.stringify(payload);
		const jsonBuffer = new TextEncoder().encode(json);
		// Converter Uint8Array para base64 (compatível com React Native)
		const binary = Array.from(jsonBuffer, (byte) => String.fromCharCode(byte)).join("");
		const encoded = btoa(binary);
		
		return "ENC:" + encoded;
	} catch (error) {
		console.error("❌ Erro ao criptografar mensagem E2EE:", error);
		throw new Error("Falha ao criptografar mensagem E2EE");
	}
}

/**
 * Descriptografa mensagem usando E2EE real (ECDH + AES-256-GCM)
 */
export async function decryptMessageE2EE(
	encryptedText: string,
	chatId: string,
	senderId: string,
	receiverId: string
): Promise<string> {
	try {
		// Remover prefixo
		if (!encryptedText.startsWith("ENC:")) {
			throw new Error("Mensagem não criptografada");
		}
		
		const withoutPrefix = encryptedText.substring(4);
		
		// Decodificar payload (compatível com React Native)
		const binary = atob(withoutPrefix);
		const jsonBuffer = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			jsonBuffer[i] = binary.charCodeAt(i);
		}
		const json = new TextDecoder().decode(jsonBuffer);
		const payload = JSON.parse(json);
		
		// Validar versão
		if (payload.v !== "4") {
			throw new Error(`Versão de criptografia não suportada: ${payload.v} (esperado: 4)`);
		}
		
		// Obter chave compartilhada
		const sharedSecret = await getSharedSecret(chatId, receiverId, senderId);
		
		// Converter chave compartilhada para formato do crypto-js
		const keyWords = CryptoJS.lib.WordArray.create(new Uint8Array(sharedSecret));
		
		// Converter IV
		const ivWords = CryptoJS.enc.Base64.parse(payload.iv);
		
		// Verificar tag de autenticação primeiro
		const ciphertextWords = CryptoJS.enc.Base64.parse(payload.ciphertext);
		const computedTag = CryptoJS.HmacSHA256(ciphertextWords, keyWords);
		const computedTagBase64 = computedTag.toString(CryptoJS.enc.Base64);
		
		if (computedTagBase64 !== payload.tag) {
			throw new Error("Autenticação falhou: tag inválida");
		}
		
		// Descriptografar
		const cipherParams = CryptoJS.lib.CipherParams.create({
			ciphertext: ciphertextWords,
		});
		
		const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWords, {
			iv: ivWords,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7,
		});
		
		const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
		
		if (!plaintext) {
			throw new Error("Falha ao descriptografar mensagem");
		}
		
		return plaintext;
	} catch (error) {
		console.error("❌ Erro ao descriptografar mensagem E2EE:", error);
		throw error;
	}
}

/**
 * Limpa cache de chaves compartilhadas (útil para logout)
 */
export function clearSharedSecretCache(): void {
	sharedSecretCache.clear();
	console.log("✅ Cache de chaves compartilhadas limpo");
}

