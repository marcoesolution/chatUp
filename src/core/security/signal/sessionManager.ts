import "react-native-get-random-values";
import { SignalProtocolAddress, SessionBuilder, SessionCipher } from "libsignal-protocol-typescript";
import { stringToArrayBuffer, arrayBufferToString, ensureArrayBuffer } from "@/core/security/utils";
import { bootstrapSignalAccount, consumeRemotePreKey, fetchRemotePreKeyBundle } from "./preKeyService";
import { getSignalStorage } from "./SignalStorage";

const DEVICE_ID = 1;

const binaryStringToUint8Array = (value: string): Uint8Array => {
	const bytes = new Uint8Array(value.length);
	for (let i = 0; i < value.length; i += 1) {
		bytes[i] = value.charCodeAt(i) & 0xff;
	}
	return bytes;
};

export async function ensureSignalSession(currentUserId: string, contactId: string): Promise<void> {
	const storage = await bootstrapSignalAccount(currentUserId);
	const address = new SignalProtocolAddress(contactId, DEVICE_ID);
	const cipher = new SessionCipher(storage, address);

	if (await cipher.hasOpenSession()) {
		return;
	}

	const remoteBundle = await fetchRemotePreKeyBundle(contactId);
	if (!remoteBundle) {
		throw new Error("Contato não possui bundle de prekeys publicado");
	}

	const builder = new SessionBuilder(storage, address);
	await builder.processPreKey({
		identityKey: remoteBundle.identityKey,
		signedPreKey: {
			keyId: remoteBundle.signedPreKey.keyId,
			publicKey: remoteBundle.signedPreKey.publicKey,
			signature: remoteBundle.signedPreKey.signature,
		},
		preKey: remoteBundle.preKey
			? {
					keyId: remoteBundle.preKey.keyId,
					publicKey: remoteBundle.preKey.publicKey,
			  }
			: undefined,
		registrationId: remoteBundle.registrationId,
	});

	await consumeRemotePreKey(contactId, remoteBundle.preKey?.rawEntry);
}

export async function encryptWithSignal(options: {
	currentUserId: string;
	contactId: string;
	plaintext: string;
}): Promise<{ ciphertext: Uint8Array; type: number; registrationId?: number }> {
	const { currentUserId, contactId, plaintext } = options;

	await ensureSignalSession(currentUserId, contactId);

	const storage = await bootstrapSignalAccount(currentUserId);
	const address = new SignalProtocolAddress(contactId, DEVICE_ID);
	const cipher = new SessionCipher(storage, address);
	const message = await cipher.encrypt(stringToArrayBuffer(plaintext));

	if (!message.body) {
		throw new Error("Cipher retornou payload vazio");
	}

	return {
		ciphertext: binaryStringToUint8Array(message.body),
		type: message.type,
		registrationId: message.registrationId,
	};
}

export async function decryptWithSignal(options: {
	currentUserId: string;
	contactId: string;
	payload: Uint8Array;
	type: number;
}): Promise<string> {
	const { currentUserId, contactId, payload, type } = options;

	const storage = await bootstrapSignalAccount(currentUserId);
	const address = new SignalProtocolAddress(contactId, DEVICE_ID);
	const cipher = new SessionCipher(storage, address);

	const rawBuffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
	const normalizedPayload = ensureArrayBuffer(rawBuffer);

	let plaintext: ArrayBuffer;
	if (type === 3) {
		plaintext = await cipher.decryptPreKeyWhisperMessage(normalizedPayload);
	} else {
		plaintext = await cipher.decryptWhisperMessage(normalizedPayload);
	}

	return arrayBufferToString(plaintext);
}

export async function clearSignalSessions(userId: string): Promise<void> {
	const storage = getSignalStorage(userId);
	await storage.clearAll();
}

