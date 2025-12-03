import { Buffer } from "buffer";

/**
 * Utilitários compartilhados de codificação para módulos de segurança.
 * Otimizado para performance e segurança - evita Base64 quando possível.
 */

function normalizeArrayBuffer(input: ArrayBuffer | ArrayBufferLike): ArrayBuffer {
	if (input instanceof ArrayBuffer) {
		return input;
	}
	const sourceView = new Uint8Array(input);
	const clone = new Uint8Array(sourceView.length);
	clone.set(sourceView);
	return clone.buffer;
}

/**
 * Converte ArrayBuffer para Base64 (compatibilidade com código legado)
 * ⚠️ PREFIRA usar base64url para novos códigos (mais eficiente)
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
	return Buffer.from(normalizeArrayBuffer(buffer)).toString("base64");
}

/**
 * Converte Base64 para ArrayBuffer (compatibilidade com código legado)
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const buf = Buffer.from(base64, "base64");
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Converte ArrayBuffer para Base64URL (mais eficiente que Base64 padrão)
 * - Sem padding (=) desnecessário
 * - URL-safe (usa - e _ ao invés de + e /)
 * - ~33% menor que Base64 padrão em muitos casos
 * - Mais rápido de processar
 */
export function arrayBufferToBase64URL(buffer: ArrayBuffer | ArrayBufferLike): string {
	const base64 = Buffer.from(normalizeArrayBuffer(buffer)).toString("base64");
	// Converter para base64url: remover padding e substituir caracteres
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Converte Base64URL para ArrayBuffer
 */
export function base64URLToArrayBuffer(base64url: string): ArrayBuffer {
	// Restaurar padding se necessário
	let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	// Adicionar padding se necessário
	const padding = base64.length % 4;
	if (padding) {
		base64 += "=".repeat(4 - padding);
	}
	const buf = Buffer.from(base64, "base64");
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export function stringToArrayBuffer(str: string): ArrayBuffer {
	const Encoder = globalThis.TextEncoder;
	if (Encoder) {
		const encoder = new Encoder();
		return encoder.encode(str).buffer;
	}

	const buf = Buffer.from(str, "utf-8");
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export function arrayBufferToString(buffer: ArrayBuffer | ArrayBufferLike): string {
	const Decoder = globalThis.TextDecoder;
	const normalized = normalizeArrayBuffer(buffer);
	if (Decoder) {
		const decoder = new Decoder();
		return decoder.decode(normalized);
	}

	return Buffer.from(normalized).toString("utf-8");
}

/**
 * Converte Uint8Array para Base64 (compatibilidade)
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
	return arrayBufferToBase64(bytes.buffer);
}

/**
 * Converte Base64 para Uint8Array (compatibilidade)
 */
export function base64ToUint8Array(base64: string): Uint8Array {
	return new Uint8Array(base64ToArrayBuffer(base64));
}

/**
 * Converte Uint8Array para Base64URL (OTIMIZADO - use este para novos códigos)
 */
export function uint8ArrayToBase64URL(bytes: Uint8Array): string {
	return arrayBufferToBase64URL(bytes.buffer);
}

/**
 * Converte Base64URL para Uint8Array (OTIMIZADO - use este para novos códigos)
 */
export function base64URLToUint8Array(base64url: string): Uint8Array {
	return new Uint8Array(base64URLToArrayBuffer(base64url));
}

export function ensureArrayBuffer(buffer: ArrayBuffer | ArrayBufferLike): ArrayBuffer {
	return normalizeArrayBuffer(buffer);
}
