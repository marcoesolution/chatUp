import { Buffer } from "buffer";

/**
 * Utilitários compartilhados de codificação para módulos de segurança.
 * Isolamos aqui para evitar duplicação e facilitar testes.
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

export function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
	return Buffer.from(normalizeArrayBuffer(buffer)).toString("base64");
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
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

export function uint8ArrayToBase64(bytes: Uint8Array): string {
	return arrayBufferToBase64(bytes.buffer);
}

export function base64ToUint8Array(base64: string): Uint8Array {
	return new Uint8Array(base64ToArrayBuffer(base64));
}

export function ensureArrayBuffer(buffer: ArrayBuffer | ArrayBufferLike): ArrayBuffer {
	return normalizeArrayBuffer(buffer);
}

