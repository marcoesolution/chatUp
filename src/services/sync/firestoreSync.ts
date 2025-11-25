/**
 * Serviço de sincronização entre Firestore e banco local
 * Gerencia upload/download de mensagens
 */

import {
	collection,
	query,
	where,
	orderBy,
	limit,
	addDoc,
	onSnapshot,
	updateDoc,
	doc,
	getDocs,
	serverTimestamp,
	Timestamp,
	QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/core/firebase";
import { decryptMessage } from "@/core/security";
import {
	getMessages,
	insertMessage,
	updateMessage,
	getLastSyncTimestamp,
	getPendingMessages,
	getChatIds,
} from "@/core/database";
import type { MessageRow } from "@/core/database/schema";
import type { Message } from "@/modules/chat/types";

/**
 * Sincroniza um chat específico do Firestore para o banco local
 */
export async function syncChat(chatId: string, userId: string): Promise<number> {
	if (!db) {
		throw new Error("Firestore não inicializado");
	}

	try {
		const lastSync = await getLastSyncTimestamp(chatId);
		const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

		// Buscar mensagens novas do Firestore
		const messagesQuery = query(
			collection(db, "messages"),
			where("chatId", "==", chatId),
			where("timestamp", ">", Timestamp.fromDate(lastSyncDate)),
			orderBy("timestamp", "asc"),
			limit(100) // Limitar a 100 mensagens por sincronização
		);

		const snapshot = await getDocs(messagesQuery);

		if (snapshot.empty) {
			return 0;
		}

		let syncedCount = 0;

		// Processar mensagens em lote
		for (const docSnapshot of snapshot.docs) {
			const data = docSnapshot.data();

			// Tentar descriptografar a mensagem
			let decryptedText = data.text;
			try {
				decryptedText = await decryptMessage(data.text, chatId, userId);
			} catch (error) {
				console.warn("⚠️ Erro ao descriptografar mensagem durante sync:", error);
				// Continuar com texto criptografado se falhar
			}

			// Converter timestamps
			const timestamp = data.timestamp?.toDate() || new Date();
			const createdAt = data.createdAt?.toDate() || timestamp;
			const updatedAt = data.updatedAt?.toDate() || timestamp;
			const viewedAt = data.viewedAt?.toDate() || null;

			// Inserir no banco local
			await insertMessage({
				id: docSnapshot.id,
				chatId: data.chatId,
				senderId: data.senderId,
				receiverId: data.receiverId,
				text: decryptedText,
				encryptedText: data.text, // Manter backup criptografado
				timestamp,
				read: data.read || false,
				viewedAt,
				createdAt,
				updatedAt,
				isLocal: false,
			});

			syncedCount++;
		}

		console.log(`✅ Sincronizadas ${syncedCount} mensagens do chat ${chatId}`);
		return syncedCount;
	} catch (error: any) {
		// Se for erro de índice, tentar sem orderBy
		if (error.code === "failed-precondition" && error.message?.includes("index")) {
			console.warn("⚠️ Índice não encontrado. Sincronizando sem orderBy...");
			return syncChatWithoutOrderBy(chatId, userId, lastSync);
		}
		console.error("❌ Erro ao sincronizar chat:", error);
		throw error;
	}
}

/**
 * Sincronização fallback sem orderBy (quando índice não existe)
 */
async function syncChatWithoutOrderBy(chatId: string, userId: string, lastSync: number | null): Promise<number> {
	if (!db) {
		throw new Error("Firestore não inicializado");
	}

	try {
		const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

		const messagesQuery = query(
			collection(db, "messages"),
			where("chatId", "==", chatId),
			limit(200) // Buscar mais para garantir que pegamos todas
		);

		const snapshot = await getDocs(messagesQuery);

		if (snapshot.empty) {
			return 0;
		}

		let syncedCount = 0;

		// Filtrar por timestamp no cliente
		const newMessages = snapshot.docs.filter((doc) => {
			const data = doc.data();
			const msgTimestamp = data.timestamp?.toDate() || new Date(0);
			return msgTimestamp > lastSyncDate;
		});

		for (const docSnapshot of newMessages) {
			const data = docSnapshot.data();

			let decryptedText = data.text;
			try {
				decryptedText = await decryptMessage(data.text, chatId, userId);
			} catch (error) {
				console.warn("⚠️ Erro ao descriptografar mensagem durante sync:", error);
			}

			const timestamp = data.timestamp?.toDate() || new Date();
			const createdAt = data.createdAt?.toDate() || timestamp;
			const updatedAt = data.updatedAt?.toDate() || timestamp;
			const viewedAt = data.viewedAt?.toDate() || null;

			insertMessage({
				id: docSnapshot.id,
				chatId: data.chatId,
				senderId: data.senderId,
				receiverId: data.receiverId,
				text: decryptedText,
				encryptedText: data.text,
				timestamp,
				read: data.read || false,
				viewedAt,
				createdAt,
				updatedAt,
				isLocal: false,
			});

			syncedCount++;
		}

		console.log(`✅ Sincronizadas ${syncedCount} mensagens (fallback) do chat ${chatId}`);
		return syncedCount;
	} catch (error) {
		console.error("❌ Erro ao sincronizar chat (fallback):", error);
		throw error;
	}
}

/**
 * Sincroniza todos os chats do usuário
 */
export async function syncAllChats(userId: string): Promise<void> {
	try {
		const chatIds = await getChatIds();

		if (chatIds.length === 0) {
			console.log("ℹ️ Nenhum chat encontrado para sincronizar");
			return;
		}

		console.log(`🔄 Sincronizando ${chatIds.length} chats...`);

		// Sincronizar em paralelo (limitado a 5 simultâneos para não sobrecarregar)
		const batchSize = 5;
		for (let i = 0; i < chatIds.length; i += batchSize) {
			const batch = chatIds.slice(i, i + batchSize);
			await Promise.all(batch.map((chatId) => syncChat(chatId, userId)));
		}

		console.log("✅ Todos os chats foram sincronizados");
	} catch (error) {
		console.error("❌ Erro ao sincronizar todos os chats:", error);
		throw error;
	}
}

/**
 * Envia mensagens locais pendentes para o Firestore
 */
export async function uploadPendingMessages(userId: string): Promise<number> {
	if (!db) {
		throw new Error("Firestore não inicializado");
	}

	try {
		const pendingMessages = await getPendingMessages();

		if (pendingMessages.length === 0) {
			return 0;
		}

		console.log(`🔄 Enviando ${pendingMessages.length} mensagens pendentes...`);

		let uploadedCount = 0;

		for (const msg of pendingMessages) {
			try {
				// A mensagem já deve estar criptografada (encryptedText)
				// Se não estiver, precisamos criptografar agora
				const textToSend = msg.encryptedText || msg.text;

				// Enviar para Firestore
				const docRef = await addDoc(collection(db, "messages"), {
					chatId: msg.chatId,
					senderId: msg.senderId,
					receiverId: msg.receiverId,
					text: textToSend,
					timestamp: serverTimestamp(),
					read: msg.read === 1,
					viewedAt: msg.viewedAt ? Timestamp.fromMillis(msg.viewedAt) : null,
					createdAt: msg.createdAt ? Timestamp.fromMillis(msg.createdAt) : serverTimestamp(),
					updatedAt: serverTimestamp(),
				});

				// Atualizar mensagem local com ID do Firestore e marcar como sincronizada
				await updateMessage(msg.id, {
					id: docRef.id,
					isLocal: 0,
					syncedAt: Date.now(),
				});

				uploadedCount++;
			} catch (error) {
				console.error(`❌ Erro ao enviar mensagem pendente ${msg.id}:`, error);
				// Continuar com próxima mensagem
			}
		}

		console.log(`✅ ${uploadedCount} mensagens foram enviadas`);
		return uploadedCount;
	} catch (error) {
		console.error("❌ Erro ao enviar mensagens pendentes:", error);
		throw error;
	}
}

/**
 * Configura listener em tempo real para um chat
 * Retorna função de unsubscribe
 */
export function setupRealtimeListener(
	chatId: string,
	userId: string,
	onNewMessage: (message: Message) => void
): () => void {
	if (!db) {
		console.warn("⚠️ Firestore não inicializado, listener não será configurado");
		return () => {};
	}

	try {
		const messagesQuery = query(
			collection(db, "messages"),
			where("chatId", "==", chatId),
			orderBy("timestamp", "desc"),
			limit(1) // Apenas novas mensagens
		);

		const unsubscribe = onSnapshot(
			messagesQuery,
			async (snapshot) => {
				for (const docChange of snapshot.docChanges()) {
					if (docChange.type === "added") {
						const data = docChange.doc.data();

						// Descriptografar mensagem
						let decryptedText = data.text;
						try {
							decryptedText = await decryptMessage(data.text, chatId, userId);
						} catch (error) {
							console.warn("⚠️ Erro ao descriptografar mensagem em tempo real:", error);
						}

						const timestamp = data.timestamp?.toDate() || new Date();
						const createdAt = data.createdAt?.toDate() || timestamp;
						const updatedAt = data.updatedAt?.toDate() || timestamp;
						const viewedAt = data.viewedAt?.toDate() || null;

						// Inserir no banco local
						await insertMessage({
							id: docChange.doc.id,
							chatId: data.chatId,
							senderId: data.senderId,
							receiverId: data.receiverId,
							text: decryptedText,
							encryptedText: data.text,
							timestamp,
							read: data.read || false,
							viewedAt,
							createdAt,
							updatedAt,
							isLocal: false,
						});

						// Notificar UI
						onNewMessage({
							id: docChange.doc.id,
							chatId: data.chatId,
							senderId: data.senderId,
							receiverId: data.receiverId,
							text: decryptedText,
							timestamp,
							read: data.read || false,
							viewedAt,
							createdAt,
							updatedAt,
						});
					}
				}
			},
			(error) => {
				console.error("❌ Erro no listener em tempo real:", error);
			}
		);

		return unsubscribe;
	} catch (error: any) {
		// Se for erro de índice, usar fallback sem orderBy
		if (error.code === "failed-precondition" && error.message?.includes("index")) {
			console.warn("⚠️ Índice não encontrado. Usando listener sem orderBy...");
			return setupRealtimeListenerWithoutOrderBy(chatId, userId, onNewMessage);
		}
		console.error("❌ Erro ao configurar listener:", error);
		return () => {};
	}
}

/**
 * Listener fallback sem orderBy
 */
function setupRealtimeListenerWithoutOrderBy(
	chatId: string,
	userId: string,
	onNewMessage: (message: Message) => void
): () => void {
	if (!db) {
		return () => {};
	}

	try {
		const messagesQuery = query(collection(db, "messages"), where("chatId", "==", chatId));

		const unsubscribe = onSnapshot(
			messagesQuery,
			async (snapshot) => {
				for (const docChange of snapshot.docChanges()) {
					if (docChange.type === "added") {
						const data = docChange.doc.data();

						let decryptedText = data.text;
						try {
							decryptedText = await decryptMessage(data.text, chatId, userId);
						} catch (error) {
							console.warn("⚠️ Erro ao descriptografar mensagem:", error);
						}

						const timestamp = data.timestamp?.toDate() || new Date();
						const createdAt = data.createdAt?.toDate() || timestamp;
						const updatedAt = data.updatedAt?.toDate() || timestamp;
						const viewedAt = data.viewedAt?.toDate() || null;

						insertMessage({
							id: docChange.doc.id,
							chatId: data.chatId,
							senderId: data.senderId,
							receiverId: data.receiverId,
							text: decryptedText,
							encryptedText: data.text,
							timestamp,
							read: data.read || false,
							viewedAt,
							createdAt,
							updatedAt,
							isLocal: false,
						});

						onNewMessage({
							id: docChange.doc.id,
							chatId: data.chatId,
							senderId: data.senderId,
							receiverId: data.receiverId,
							text: decryptedText,
							timestamp,
							read: data.read || false,
							viewedAt,
							createdAt,
							updatedAt,
						});
					}
				}
			},
			(error) => {
				console.error("❌ Erro no listener (fallback):", error);
			}
		);

		return unsubscribe;
	} catch (error) {
		console.error("❌ Erro ao configurar listener (fallback):", error);
		return () => {};
	}
}

