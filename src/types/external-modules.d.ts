declare module "@noble/curves/ed25519" {
	export const x25519: {
		getSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array;
		getPublicKey(privateKey: Uint8Array): Uint8Array;
	};
}

declare module "@noble/hashes/utils" {
	export function randomBytes(length: number): Uint8Array;
	export function bytesToHex(bytes: Uint8Array): string;
	export function hexToBytes(hex: string): Uint8Array;
}

