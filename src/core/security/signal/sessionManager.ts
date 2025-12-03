import "react-native-get-random-values";
import { SignalProtocolAddress, SessionBuilder, SessionCipher } from "libsignal-protocol-typescript";
import { onSnapshot, doc } from "firebase/firestore";
import {
	stringToArrayBuffer,
	arrayBufferToString,
	ensureArrayBuffer,
	base64ToArrayBuffer,
} from "@/core/security/utils";
import {
	bootstrapSignalAccount,
	consumeRemotePreKey,
	fetchRemotePreKeyBundle,
	type RemotePreKeyBundle,
} from "./preKeyService";
import { getSignalStorage } from "./SignalStorage";
import { db } from "@/core/firebase";

const DEVICE_ID = 1;

const binaryStringToUint8Array = (value: string): Uint8Array => {
	const bytes = new Uint8Array(value.length);
	for (let i = 0; i < value.length; i += 1) {
		bytes[i] = value.charCodeAt(i) & 0xff;
	}
	return bytes;
};

/**
 * Aguarda o bundle de prekeys do contato ser publicado usando listener em tempo real
 * @param contactId ID do contato
 * @param timeoutMs Timeout em milissegundos (padrão: 10 segundos)
 * @returns Bundle de prekeys ou null se timeout
 */
async function waitForRemoteBundle(contactId: string, timeoutMs: number = 10000): Promise<RemotePreKeyBundle | null> {
	if (!db) {
		throw new Error("Firestore não está inicializado");
	}

	// Verificar se já existe antes de começar a ouvir
	const existingBundle = await fetchRemotePreKeyBundle(contactId);
	if (existingBundle) {
		return existingBundle;
	}

	// Garantir que db não é null para o TypeScript (já verificado acima, mas necessário para type narrowing)
	const firestoreDb = db;
	if (!firestoreDb) {
		return null;
	}

	return new Promise((resolve) => {
		const bundleRef = doc(firestoreDb, "users", contactId, "prekeys", "bundle");

		let resolved = false;
		const timeoutId = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				unsubscribe();
				console.warn("⏱️ Timeout aguardando bundle de prekeys do contato:", contactId);
				resolve(null);
			}
		}, timeoutMs);

		const unsubscribe = onSnapshot(
			bundleRef,
			(snapshot) => {
				if (resolved) return;

				if (snapshot.exists()) {
					const data = snapshot.data();
					if (data?.identityKey && data?.registrationId && data?.signedPreKey) {
						const preKeyEntry = data.preKeys?.[0];
						const bundle: RemotePreKeyBundle = {
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

						resolved = true;
						clearTimeout(timeoutId);
						unsubscribe();
						console.log("✅ Bundle de prekeys encontrado via listener em tempo real");
						resolve(bundle);
					}
				}
			},
			(error) => {
				console.warn("⚠️ Erro no listener de bundle:", error);
				if (!resolved) {
					resolved = true;
					clearTimeout(timeoutId);
					unsubscribe();
					resolve(null);
				}
			}
		);
	});
}

/**
 * Busca bundle com retry e backoff exponencial
 * @param contactId ID do contato
 * @param maxRetries Número máximo de tentativas (padrão: 3)
 * @param initialDelayMs Delay inicial em milissegundos (padrão: 500)
 * @returns Bundle de prekeys ou null se não encontrado após todas as tentativas
 */
async function fetchRemoteBundleWithRetry(
	contactId: string,
	maxRetries: number = 2, // Reduzido de 3 para 2 (mais rápido)
	initialDelayMs: number = 300 // Reduzido de 500ms para 300ms (mais rápido)
): Promise<RemotePreKeyBundle | null> {
	let delay = initialDelayMs;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		const bundle = await fetchRemotePreKeyBundle(contactId);
		if (bundle) {
			return bundle;
		}

		if (attempt < maxRetries - 1) {
			console.log(
				`🔄 Bundle não encontrado, tentando novamente em ${delay}ms... (tentativa ${attempt + 1}/${maxRetries})`
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
			delay *= 2; // Backoff exponencial
		}
	}

	return null;
}

export async function ensureSignalSession(currentUserId: string, contactId: string): Promise<void> {
	const sessionStartTime = Date.now();
	console.log("🔐 [Signal] Iniciando ensureSignalSession", { currentUserId, contactId });

	const storage = await bootstrapSignalAccount(currentUserId);
	const address = new SignalProtocolAddress(contactId, DEVICE_ID);
	const cipher = new SessionCipher(storage, address);

	if (await cipher.hasOpenSession()) {
		console.log("✅ [Signal] Sessão já existe, retornando", { duration: Date.now() - sessionStartTime });
		return;
	}

	console.log("🔄 [Signal] Sessão não existe, buscando bundle...");
	// Tentar buscar bundle com retry
	const retryStartTime = Date.now();
	let remoteBundle = await fetchRemoteBundleWithRetry(contactId);
	console.log("📦 [Signal] Resultado do retry:", { found: !!remoteBundle, duration: Date.now() - retryStartTime });

	// Se ainda não encontrou, aguardar com listener em tempo real (timeout reduzido para 2s - mais rápido)
	if (!remoteBundle) {
		console.log(
			"⏳ [Signal] Bundle não encontrado após retries, aguardando publicação em tempo real (timeout: 2s)..."
		);
		const listenerStartTime = Date.now();
		remoteBundle = await waitForRemoteBundle(contactId, 2000); // Reduzido de 7s para 2s
		console.log("👂 [Signal] Resultado do listener:", {
			found: !!remoteBundle,
			duration: Date.now() - listenerStartTime,
		});
	}

	if (!remoteBundle) {
		throw new Error(
			"Contato não possui bundle de prekeys publicado. O contato precisa estar online e ter feito login recentemente."
		);
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
	const encryptStartTime = Date.now();
	console.log("🔒 [Signal] Iniciando encryptWithSignal", { currentUserId, contactId, textLength: plaintext.length });

	await ensureSignalSession(currentUserId, contactId);
	console.log("✅ [Signal] Sessão garantida, iniciando criptografia", { duration: Date.now() - encryptStartTime });

	const storage = await bootstrapSignalAccount(currentUserId);
	const address = new SignalProtocolAddress(contactId, DEVICE_ID);
	const cipher = new SessionCipher(storage, address);
	const cipherStartTime = Date.now();
	const message = await cipher.encrypt(stringToArrayBuffer(plaintext));
	console.log("✅ [Signal] Mensagem criptografada", {
		duration: Date.now() - cipherStartTime,
		totalDuration: Date.now() - encryptStartTime,
	});

	if (!message.body) {
		throw new Error("Cipher retornou payload vazio");
	}

	return {
		ciphertext: binaryStringToUint8Array(message.body),
		type: message.type,
		registrationId: message.registrationId,
	};
}

/**
 * Deleta a sessão Signal de um contato específico
 */
export async function deleteSignalSession(currentUserId: string, contactId: string): Promise<void> {
	const storage = await bootstrapSignalAccount(currentUserId);
	const address = new SignalProtocolAddress(contactId, DEVICE_ID);
	await storage.deleteSession(address.toString());
	console.log("🔄 [Signal] Sessão deletada para contato:", contactId);
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

	try {
		let plaintext: ArrayBuffer;
		if (type === 3) {
			plaintext = await cipher.decryptPreKeyWhisperMessage(normalizedPayload);
		} else {
			plaintext = await cipher.decryptWhisperMessage(normalizedPayload);
		}

		return arrayBufferToString(plaintext);
	} catch (error: any) {
		// Detectar erro de contador de mensagens (MessageCounterError)
		const errorMessage = error?.message || String(error);
		const isMessageCounterError =
			errorMessage.includes("Message key not found") ||
			errorMessage.includes("counter was repeated") ||
			errorMessage.includes("key was not filled") ||
			errorMessage.includes("MessageCounterError");

		// Detectar erro de "sending chain" - tentativa de descriptografar mensagem própria
		const isSendingChainError =
			errorMessage.includes("Tried to decrypt on a sending chain") || errorMessage.includes("sending chain");

		if (isSendingChainError) {
			console.warn("⚠️ [Signal] Erro de 'sending chain' detectado - mensagem própria ou sessão invertida", {
				contactId,
				error: errorMessage,
			});
			throw new Error("Não é possível descriptografar mensagem na cadeia de envio (mensagem própria)");
		}

		if (isMessageCounterError) {
			console.warn("⚠️ [Signal] Erro de contador de mensagens detectado, resetando sessão...", {
				contactId,
				error: errorMessage,
			});

			try {
				// Deletar sessão corrompida
				await deleteSignalSession(currentUserId, contactId);

				// Tentar descriptografar novamente (isso vai criar uma nova sessão se necessário)
				// Mas primeiro precisamos tentar descriptografar como PreKey message
				// já que a sessão foi deletada
				if (type !== 3) {
					// Se não era PreKey, tentar como PreKey agora
					const plaintext = await cipher.decryptPreKeyWhisperMessage(normalizedPayload);
					console.log("✅ [Signal] Mensagem descriptografada após reset de sessão (como PreKey)");
					return arrayBufferToString(plaintext);
				} else {
					// Se já era PreKey, tentar novamente
					const plaintext = await cipher.decryptPreKeyWhisperMessage(normalizedPayload);
					console.log("✅ [Signal] Mensagem descriptografada após reset de sessão");
					return arrayBufferToString(plaintext);
				}
			} catch (retryError: any) {
				console.error("❌ [Signal] Falha ao descriptografar mesmo após reset de sessão:", retryError);
				throw new Error(
					`Falha ao descriptografar mensagem Signal após reset de sessão: ${
						retryError?.message || String(retryError)
					}`
				);
			}
		}

		// Re-lançar erro se não for MessageCounterError
		throw error;
	}
}

export async function clearSignalSessions(userId: string): Promise<void> {
	const storage = getSignalStorage(userId);
	await storage.clearAll();
}
