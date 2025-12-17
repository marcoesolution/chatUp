import "@/core/polyfills/textEncoding";

import { KeyHelper, type KeyPairType, type PreKeyPairType } from "libsignal-protocol-typescript";
import api from "@/services/api";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/core/security/utils";
import { getSignalStorage, SignalStorage } from "./SignalStorage";

const MIN_PREKEY_POOL = 5;
const PREKEY_BATCH = 10; // Increase batch for API efficiency

export interface ApiPreKeyEntry {
	keyId: number;
	publicKey: string;
}

export interface RemotePreKeyBundle {
	identityKey: ArrayBuffer;
	registrationId: number;
	signedPreKey: {
		keyId: number;
		publicKey: ArrayBuffer;
		signature: ArrayBuffer;
	};
	preKey?: {
		keyId: number;
		publicKey: ArrayBuffer;
		// rawEntry no longer needed for backend consumption
	};
}

export async function bootstrapSignalAccount(userId: string): Promise<SignalStorage> {
    // No db check needed

	const storage = getSignalStorage(userId);

	let identity = await storage.getIdentityKeyPair();
	if (!identity) {
		identity = await KeyHelper.generateIdentityKeyPair();
		await storage.setIdentityKeyPair(identity);
	}

	let registrationId = await storage.getLocalRegistrationId();
	if (!registrationId) {
		registrationId = KeyHelper.generateRegistrationId();
		await storage.setLocalRegistrationId(registrationId);
	}

	const signedPreKey = await ensureSignedPreKey(storage, identity);

    // Check prekey count from backend
    let additionalPreKeys: ApiPreKeyEntry[] = [];
    try {
        const countRes = await api.get('/keys/count/me');
        const count = countRes.data.count || 0;
        additionalPreKeys = await ensurePreKeyInventory(storage, count);
    } catch (e) {
        console.warn("Could not fetch prekey count, generating batch anyway", e);
        additionalPreKeys = await ensurePreKeyInventory(storage, 0); 
    }

	const payload = {
		identityKey: arrayBufferToBase64(identity.pubKey),
		registrationId,
		signedPreKey: {
			keyId: signedPreKey.keyId,
			publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
			signature: arrayBufferToBase64(signedPreKey.signature),
		},
		preKeys: additionalPreKeys,
	};

	await api.post('/keys', payload);

	return storage;
}

export async function fetchRemotePreKeyBundle(userId: string): Promise<RemotePreKeyBundle | null> {
    try {
        const response = await api.get(`/keys/${userId}`);
        const data = response.data;

        if (!data || !data.identityKey || !data.signedPreKey) {
            return null;
        }

        return {
            identityKey: base64ToArrayBuffer(data.identityKey),
            registrationId: data.registrationId,
            signedPreKey: {
                keyId: data.signedPreKey.keyId,
                publicKey: base64ToArrayBuffer(data.signedPreKey.publicKey),
                signature: base64ToArrayBuffer(data.signedPreKey.signature),
            },
            preKey: data.preKey
                ? {
                        keyId: data.preKey.keyId,
                        publicKey: base64ToArrayBuffer(data.preKey.publicKey),
                        // rawEntry removed
                  }
                : undefined,
        };
    } catch (e) {
        console.error("Error fetching remote bundle", e);
        return null;
    }
}

export async function consumeRemotePreKey(remoteUserId: string, entry?: any): Promise<void> {
	// Backend handles consumption on fetch
    return;
}

async function ensureSignedPreKey(
	storage: SignalStorage,
	identity: KeyPairType
): Promise<{ keyId: number; keyPair: KeyPairType; signature: ArrayBuffer }> {
	const activeId = (await storage.getActiveSignedPreKeyId()) ?? (await storage.getLastSignedPreKeyId());
	const existingPair = await storage.loadSignedPreKey(activeId);
	const existingSignature = await storage.loadSignedPreKeySignature(activeId);

	if (existingPair && existingSignature) {
		return { keyId: activeId, keyPair: existingPair, signature: existingSignature };
	}

	const nextId = await storage.getLastSignedPreKeyId();
	const generated = await KeyHelper.generateSignedPreKey(identity, nextId);
	await storage.storeSignedPreKey(nextId, generated.keyPair);
	await storage.storeSignedPreKeySignature(nextId, generated.signature);
	await storage.setLastSignedPreKeyId(nextId + 1);
	await storage.setActiveSignedPreKeyId(nextId);

	return { keyId: nextId, keyPair: generated.keyPair, signature: generated.signature };
}

async function ensurePreKeyInventory(storage: SignalStorage, currentRemoteCount: number): Promise<ApiPreKeyEntry[]> {
    // Logic remains mostly same but types changed
	const deficit = Math.max(MIN_PREKEY_POOL - currentRemoteCount, 0);
	const needed = deficit > 0 ? Math.max(deficit, PREKEY_BATCH) : 0;
	if (needed === 0) {
		return [];
	}
	return generatePreKeys(storage, needed);
}

async function generatePreKeys(storage: SignalStorage, amount: number): Promise<ApiPreKeyEntry[]> {
	const entries: ApiPreKeyEntry[] = [];
	let nextId = await storage.getLastPreKeyId();

	for (let i = 0; i < amount; i += 1) {
		const preKey = await KeyHelper.generatePreKey(nextId);
		await persistPreKey(storage, preKey);
		entries.push({
			keyId: preKey.keyId,
			publicKey: arrayBufferToBase64(preKey.keyPair.pubKey),
		});
		nextId = Math.max(nextId, preKey.keyId + 1);
	}

	await storage.setLastPreKeyId(nextId);

	return entries;
}

async function persistPreKey(storage: SignalStorage, preKey: PreKeyPairType): Promise<void> {
	await storage.storePreKey(preKey.keyId, preKey.keyPair);
}

