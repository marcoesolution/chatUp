import "@/core/polyfills/textEncoding";

import {
	arrayRemove,
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	updateDoc,
	type DocumentReference,
	type FirestoreDataConverter,
} from "firebase/firestore";
import { KeyHelper, type KeyPairType, type PreKeyPairType } from "libsignal-protocol-typescript";
import { db } from "@/core/firebase";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/core/security/utils";
import { getSignalStorage, SignalStorage } from "./SignalStorage";

const PREKEY_COLLECTION_ID = "prekeys";
const PREKEY_DOCUMENT_ID = "bundle";
const MIN_PREKEY_POOL = 5;
const PREKEY_BATCH = 5;

interface FirestorePreKeyEntry {
	keyId: number;
	publicKey: string;
}

interface FirestoreBundle {
	identityKey: string;
	registrationId: number;
	signedPreKey: {
		keyId: number;
		publicKey: string;
		signature: string;
	};
	preKeys: FirestorePreKeyEntry[];
	updatedAt: unknown;
}

const bundleConverter: FirestoreDataConverter<FirestoreBundle> = {
	toFirestore(value: FirestoreBundle) {
		return value;
	},
	fromFirestore(snapshot) {
		return snapshot.data() as FirestoreBundle;
	},
};

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
		rawEntry: FirestorePreKeyEntry;
	};
}

const getBundleRef = (userId: string): DocumentReference<FirestoreBundle> => {
	if (!db) {
		throw new Error("Firestore não está inicializado");
	}
	return doc(db, "users", userId, PREKEY_COLLECTION_ID, PREKEY_DOCUMENT_ID).withConverter(bundleConverter);
};

export async function bootstrapSignalAccount(userId: string): Promise<SignalStorage> {
	if (!db) {
		throw new Error("Firestore não está inicializado");
	}

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

	const bundleRef = getBundleRef(userId);
	const snapshot = await getDoc(bundleRef);
	const currentPreKeys = snapshot.data()?.preKeys ?? [];
	const additionalPreKeys = await ensurePreKeyInventory(storage, currentPreKeys.length);

	const payload: FirestoreBundle = {
		identityKey: arrayBufferToBase64(identity.pubKey),
		registrationId,
		signedPreKey: {
			keyId: signedPreKey.keyId,
			publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
			signature: arrayBufferToBase64(signedPreKey.signature),
		},
		preKeys: [...currentPreKeys, ...additionalPreKeys],
		updatedAt: serverTimestamp(),
	};

	await setDoc(bundleRef, payload, { merge: true });

	return storage;
}

export async function fetchRemotePreKeyBundle(userId: string): Promise<RemotePreKeyBundle | null> {
	if (!db) {
		throw new Error("Firestore não está inicializado");
	}
	const bundleRef = getBundleRef(userId);
	const snapshot = await getDoc(bundleRef);
	if (!snapshot.exists()) {
		return null;
	}
	const data = snapshot.data();
	if (!data.identityKey || !data.registrationId || !data.signedPreKey) {
		return null;
	}

	const preKeyEntry = data.preKeys?.[0];

	return {
		identityKey: base64ToArrayBuffer(data.identityKey),
		registrationId: data.registrationId,
		signedPreKey: {
			keyId: data.signedPreKey.keyId,
			publicKey: base64ToArrayBuffer(data.signedPreKey.publicKey),
			signature: base64ToArrayBuffer(data.signedPreKey.signature),
		},
		preKey: preKeyEntry
			? {
					keyId: preKeyEntry.keyId,
					publicKey: base64ToArrayBuffer(preKeyEntry.publicKey),
					rawEntry: preKeyEntry,
			  }
			: undefined,
	};
}

export async function consumeRemotePreKey(remoteUserId: string, entry?: FirestorePreKeyEntry): Promise<void> {
	if (!db || !entry) {
		return;
	}

	try {
		const bundleRef = getBundleRef(remoteUserId);
		await updateDoc(bundleRef, {
			preKeys: arrayRemove(entry),
		});
	} catch (error) {
		console.warn("⚠️ Não foi possível remover preKey remoto (provável falta de permissão)", {
			remoteUserId,
			error,
		});
	}
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

async function ensurePreKeyInventory(storage: SignalStorage, currentRemoteCount: number): Promise<FirestorePreKeyEntry[]> {
	const deficit = Math.max(MIN_PREKEY_POOL - currentRemoteCount, 0);
	const needed = deficit > 0 ? Math.max(deficit, PREKEY_BATCH) : 0;
	if (needed === 0) {
		return [];
	}
	return generatePreKeys(storage, needed);
}

async function generatePreKeys(storage: SignalStorage, amount: number): Promise<FirestorePreKeyEntry[]> {
	const entries: FirestorePreKeyEntry[] = [];
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

