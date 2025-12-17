import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Direction, KeyPairType, StorageType } from "libsignal-protocol-typescript";
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/core/security/utils";

type SignalKeyValueStore = {
	getString(key: string): Promise<string | undefined>;
	set(key: string, value: string): Promise<void>;
	remove(key: string): Promise<void>;
	getAllKeys(): Promise<readonly string[]>;
};

const createSignalStore = (): SignalKeyValueStore => {
	try {
		const mmkvModule = require("react-native-mmkv") as {
			createMMKV?: typeof import("react-native-mmkv").createMMKV;
		};
		if (typeof mmkvModule.createMMKV === "function") {
			const kv = mmkvModule.createMMKV({ id: "signal-protocol" });
			console.log("✅ SignalStorage: MMKV inicializado com sucesso");
			return {
				getString: async (key) => {
					try {
						const value = kv.getString(key) ?? undefined;
						return value;
					} catch (error: any) {
						console.error("❌ SignalStorage: erro ao ler do MMKV", { key, error: error?.message });
						throw error;
					}
				},
				set: async (key, value) => {
					try {
						kv.set(key, value);
					} catch (error: any) {
						console.error("❌ SignalStorage: erro ao escrever no MMKV", { key, error: error?.message });
						throw error;
					}
				},
				remove: async (key) => {
					try {
						kv.remove(key);
					} catch (error: any) {
						console.error("❌ SignalStorage: erro ao remover do MMKV", { key, error: error?.message });
						throw error;
					}
				},
				getAllKeys: async () => {
					try {
						return kv.getAllKeys();
					} catch (error: any) {
						console.error("❌ SignalStorage: erro ao listar chaves do MMKV", { error: error?.message });
						return [];
					}
				},
			};
		}
	} catch (error: any) {
		console.warn("⚠️ SignalStorage: falha ao inicializar MMKV, usando AsyncStorage", {
			error: error?.message || String(error),
		});
	}

	console.log("ℹ️ SignalStorage: usando AsyncStorage como fallback");
	return {
		getString: async (key) => {
			try {
				const value = await AsyncStorage.getItem(key);
				return value ?? undefined;
			} catch (error: any) {
				console.error("❌ SignalStorage: erro ao ler do AsyncStorage", { key, error: error?.message });
				return undefined;
			}
		},
		set: async (key, value) => {
			try {
				await AsyncStorage.setItem(key, value);
			} catch (error: any) {
				console.error("❌ SignalStorage: erro ao escrever no AsyncStorage", { key, error: error?.message });
				throw error;
			}
		},
		remove: async (key) => {
			try {
				await AsyncStorage.removeItem(key);
			} catch (error: any) {
				console.error("❌ SignalStorage: erro ao remover do AsyncStorage", { key, error: error?.message });
				throw error;
			}
		},
		getAllKeys: async () => {
			try {
				return await AsyncStorage.getAllKeys();
			} catch (error: any) {
				console.error("❌ SignalStorage: erro ao listar chaves do AsyncStorage", { error: error?.message });
				return [];
			}
		},
	};
};

const signalKv = createSignalStore();

const KEY_PREFIX = "signal";
const IDENTITY_KEY = "identity";
const REGISTRATION_KEY = "registration";
const SIGNED_PREKEY_META = "signedPreKey:lastId";
const PREKEY_META = "preKey:lastId";

const SESSION_PREFIX = "session";
const TRUSTED_PREFIX = "trusted";
const PREKEY_PREFIX = "preKey";
const SIGNED_PREKEY_PREFIX = "signedPreKey";
const SIGNED_PREKEY_SIG_PREFIX = "signedPreKeySig";
const ACTIVE_SIGNED_PREKEY_KEY = "signedPreKey:active";

interface EncodedKeyPair {
	pubKey: string;
	privKey: string;
}

const encodePair = (pair: KeyPairType): EncodedKeyPair => ({
	pubKey: arrayBufferToBase64(pair.pubKey),
	privKey: arrayBufferToBase64(pair.privKey),
});

const decodePair = (encoded?: EncodedKeyPair | null): KeyPairType | undefined => {
	if (!encoded) {
		return undefined;
	}
	return {
		pubKey: base64ToArrayBuffer(encoded.pubKey),
		privKey: base64ToArrayBuffer(encoded.privKey),
	};
};

export class SignalStorage implements StorageType {
	constructor(private readonly userId: string) {}

	private key(segment: string): string {
		return `${KEY_PREFIX}:${this.userId}:${segment}`;
	}

	private async readObject<T>(segment: string): Promise<T | undefined> {
		try {
			const storageKey = this.key(segment);
			const raw = await signalKv.getString(storageKey);
			if (!raw) {
				return undefined;
			}
			try {
				return JSON.parse(raw) as T;
			} catch (parseError: any) {
				console.warn("⚠️ SignalStorage: falha ao fazer parse de JSON", {
					segment,
					storageKey,
					error: parseError?.message,
					rawLength: raw.length,
					rawPrefix: raw.substring(0, 50),
				});
				return undefined;
			}
		} catch (error: any) {
			console.error("❌ SignalStorage: erro ao ler objeto", {
				segment,
				storageKey: this.key(segment),
				error: error?.message,
			});
			return undefined;
		}
	}

	private async writeObject<T>(segment: string, value: T): Promise<void> {
		await signalKv.set(this.key(segment), JSON.stringify(value));
	}

	private async remove(segment: string): Promise<void> {
		await signalKv.remove(this.key(segment));
	}

	async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
		return decodePair(await this.readObject<EncodedKeyPair>(IDENTITY_KEY));
	}

	async setIdentityKeyPair(pair: KeyPairType): Promise<void> {
		await this.writeObject(IDENTITY_KEY, encodePair(pair));
	}

	async getLocalRegistrationId(): Promise<number | undefined> {
		const raw = await signalKv.getString(this.key(REGISTRATION_KEY));
		return raw ? Number.parseInt(raw, 10) : undefined;
	}

	async setLocalRegistrationId(id: number): Promise<void> {
		await signalKv.set(this.key(REGISTRATION_KEY), id.toString());
	}

	async getLastSignedPreKeyId(): Promise<number> {
		const raw = await signalKv.getString(this.key(SIGNED_PREKEY_META));
		return raw ? Number.parseInt(raw, 10) : 1;
	}

	async setLastSignedPreKeyId(id: number): Promise<void> {
		await signalKv.set(this.key(SIGNED_PREKEY_META), id.toString());
	}

	async getActiveSignedPreKeyId(): Promise<number | undefined> {
		const raw = await signalKv.getString(this.key(ACTIVE_SIGNED_PREKEY_KEY));
		return raw ? Number.parseInt(raw, 10) : undefined;
	}

	async setActiveSignedPreKeyId(id: number): Promise<void> {
		await signalKv.set(this.key(ACTIVE_SIGNED_PREKEY_KEY), id.toString());
	}

	async getLastPreKeyId(): Promise<number> {
		const raw = await signalKv.getString(this.key(PREKEY_META));
		return raw ? Number.parseInt(raw, 10) : 1;
	}

	async setLastPreKeyId(id: number): Promise<void> {
		await signalKv.set(this.key(PREKEY_META), id.toString());
	}

	async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, _direction: Direction): Promise<boolean> {
		const stored = await signalKv.getString(this.key(`${TRUSTED_PREFIX}:${identifier}`));
		if (!stored) {
			return true; // TOFU
		}
		return stored === arrayBufferToBase64(identityKey);
	}

	async saveIdentity(identifier: string, publicKey: ArrayBuffer): Promise<boolean> {
		const encoded = arrayBufferToBase64(publicKey);
		const storageKey = this.key(`${TRUSTED_PREFIX}:${identifier}`);
		const current = await signalKv.getString(storageKey);
		if (current === encoded) {
			return false;
		}
		await signalKv.set(storageKey, encoded);
		return true;
	}

	async loadPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
		return decodePair(await this.readObject<EncodedKeyPair>(`${PREKEY_PREFIX}:${keyId}`));
	}

	async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
		await this.writeObject(`${PREKEY_PREFIX}:${keyId}`, encodePair(keyPair));
	}

	async removePreKey(keyId: number | string): Promise<void> {
		await this.remove(`${PREKEY_PREFIX}:${keyId}`);
	}

	async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
		return decodePair(await this.readObject<EncodedKeyPair>(`${SIGNED_PREKEY_PREFIX}:${keyId}`));
	}

	async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
		await this.writeObject(`${SIGNED_PREKEY_PREFIX}:${keyId}`, encodePair(keyPair));
	}

	async removeSignedPreKey(keyId: number | string): Promise<void> {
		await this.remove(`${SIGNED_PREKEY_PREFIX}:${keyId}`);
		await this.remove(`${SIGNED_PREKEY_SIG_PREFIX}:${keyId}`);
	}

	async storeSignedPreKeySignature(keyId: number | string, signature: ArrayBuffer): Promise<void> {
		await signalKv.set(this.key(`${SIGNED_PREKEY_SIG_PREFIX}:${keyId}`), arrayBufferToBase64(signature));
	}

	async loadSignedPreKeySignature(keyId: number | string): Promise<ArrayBuffer | undefined> {
		const raw = await signalKv.getString(this.key(`${SIGNED_PREKEY_SIG_PREFIX}:${keyId}`));
		return raw ? base64ToArrayBuffer(raw) : undefined;
	}

	async storeSession(encodedAddress: string, record: string): Promise<void> {
		await signalKv.set(this.key(`${SESSION_PREFIX}:${encodedAddress}`), record);
	}

	async loadSession(encodedAddress: string): Promise<string | undefined> {
		return (await signalKv.getString(this.key(`${SESSION_PREFIX}:${encodedAddress}`))) ?? undefined;
	}

	async deleteSession(encodedAddress: string): Promise<void> {
		await this.remove(`${SESSION_PREFIX}:${encodedAddress}`);
	}

	async clearAll(): Promise<void> {
		const prefix = this.key("");
		const keys = await signalKv.getAllKeys();
		const scopedKeys = keys.filter((key) => key.startsWith(prefix));
		await Promise.all(scopedKeys.map((key) => signalKv.remove(key)));
	}
}

export const getSignalStorage = (userId: string): SignalStorage => new SignalStorage(userId);
