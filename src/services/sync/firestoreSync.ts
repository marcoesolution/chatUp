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
	messageExists,
	getMessageById,
} from "@/core/database";
import type { MessageRow } from "@/core/database/schema";
import type { Message } from "@/modules/chat/types";
import { handleNewMessage } from "@/services/notifications";

/**
 * Sincroniza um chat específico do Firestore para o banco local
 */
export async function syncChat(chatId: string, userId: string): Promise<number> {
	if (!db) {
		throw new Error("Firestore não inicializado");
	}

	// Obter lastSync antes do try para estar disponível no catch
	let lastSync: number | null = null;
	try {
		lastSync = await getLastSyncTimestamp(chatId);
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

			// Validar dados da mensagem
			if (!data || !data.text || typeof data.text !== "string") {
				console.warn("⚠️ Mensagem com dados inválidos ignorada:", data);
				continue;
			}

			// Verificar se é mensagem própria ANTES de tentar descriptografar
			const isOwnMessage = data.senderId === userId;

			// Tentar descriptografar a mensagem (pular se for mensagem própria)
			let decryptedText = data.text;
			
			if (isOwnMessage) {
				// Mensagem própria: verificar se já existe no banco local
				console.log("ℹ️ Mensagem própria durante sync - verificando banco local");
				const alreadyExists = await messageExists(messageId);
				if (alreadyExists) {
					// Se mensagem já existe no banco local, pular sync (já tem texto plano)
					console.log("ℹ️ Mensagem própria já existe no banco local, pulando sync");
					continue;
				}
				// Se não encontrar no banco local, usar placeholder (não deve acontecer normalmente)
				decryptedText = "[Mensagem própria]";
			} else {
				// Mensagem de outro usuário: descriptografar normalmente
				try {
					// Verificar se é mensagem criptografada (começa com "ENC:")
					if (data.text.startsWith("ENC:")) {
						decryptedText = await decryptMessage(
							data.text,
							chatId,
							userId,
							data.senderId ?? "",
							data.receiverId ?? ""
						);
					} else {
						// Mensagem não criptografada (legado ou erro)
						decryptedText = data.text;
					}
				} catch (error) {
					console.warn("⚠️ Erro ao descriptografar mensagem durante sync:", error);
					// Tentar usar texto original se descriptografia falhar
					decryptedText = data.text;
				}
			}

			// Validar texto descriptografado
			if (!decryptedText || typeof decryptedText !== "string") {
				console.warn("⚠️ Texto descriptografado inválido, usando texto original");
				decryptedText = data.text || "";
			}

			// Converter timestamps com validação
			let timestamp: Date;
			try {
				timestamp = data.timestamp?.toDate() || new Date();
				if (isNaN(timestamp.getTime())) {
					timestamp = new Date();
				}
			} catch (err) {
				console.warn("⚠️ Erro ao converter timestamp, usando data atual:", err);
				timestamp = new Date();
			}

			let createdAt: Date;
			try {
				createdAt = data.createdAt?.toDate() || timestamp;
				if (isNaN(createdAt.getTime())) {
					createdAt = timestamp;
				}
			} catch (err) {
				createdAt = timestamp;
			}

			let updatedAt: Date;
			try {
				updatedAt = data.updatedAt?.toDate() || timestamp;
				if (isNaN(updatedAt.getTime())) {
					updatedAt = timestamp;
				}
			} catch (err) {
				updatedAt = timestamp;
			}

			let viewedAt: Date | null = null;
			try {
				if (data.viewedAt) {
					const viewedAtDate = data.viewedAt.toDate();
					if (!isNaN(viewedAtDate.getTime())) {
						viewedAt = viewedAtDate;
					}
				}
			} catch (err) {
				viewedAt = null;
			}

			// Validar campos obrigatórios antes de inserir
			if (!data.chatId || !data.senderId || !data.receiverId) {
				console.warn("⚠️ Mensagem com campos obrigatórios faltando ignorada:", data);
				continue;
			}

			// Verificar se mensagem já existe no banco local antes de inserir
			const messageId = docSnapshot.id;
			const alreadyExists = await messageExists(messageId);

			if (alreadyExists) {
				console.log("ℹ️ Mensagem já existe no banco local durante sync, ignorando:", messageId);
				continue; // Pular mensagem duplicada
			}

			// Inserir no banco local
			try {
				await insertMessage({
					id: messageId,
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
			} catch (insertError) {
				console.error("❌ Erro ao inserir mensagem no banco local:", insertError);
				// Continuar com próxima mensagem
				continue;
			}

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
			const messageId = docSnapshot.id;

			// Verificar se mensagem já existe no banco local antes de inserir
			const alreadyExists = await messageExists(messageId);

			if (alreadyExists) {
				console.log("ℹ️ Mensagem já existe no banco local durante sync (fallback), ignorando:", messageId);
				continue; // Pular mensagem duplicada
			}

			// Verificar se é mensagem própria ANTES de tentar descriptografar
			const isOwnMessage = data.senderId === userId;

			// Descriptografar mensagem (pular se for mensagem própria)
			let decryptedText = data.text;
			
			if (isOwnMessage) {
				// Mensagem própria: verificar se já existe no banco local
				console.log("ℹ️ Mensagem própria durante sync (fallback) - verificando banco local");
				const alreadyExists = await messageExists(messageId);
				if (alreadyExists) {
					// Se mensagem já existe no banco local, pular sync (já tem texto plano)
					console.log("ℹ️ Mensagem própria já existe no banco local (fallback), pulando sync");
					continue;
				}
				// Se não encontrar no banco local, usar placeholder (não deve acontecer normalmente)
				decryptedText = "[Mensagem própria]";
			} else {
				// Mensagem de outro usuário: descriptografar normalmente
				try {
					decryptedText = await decryptMessage(
						data.text,
						chatId,
						userId,
						data.senderId ?? "",
						data.receiverId ?? ""
					);
				} catch (error) {
					console.warn("⚠️ Erro ao descriptografar mensagem durante sync:", error);
				}
			}

			const timestamp = data.timestamp?.toDate() || new Date();
			const createdAt = data.createdAt?.toDate() || timestamp;
			const updatedAt = data.updatedAt?.toDate() || timestamp;
			const viewedAt = data.viewedAt?.toDate() || null;

			try {
				await insertMessage({
					id: messageId,
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
			} catch (insertError) {
				console.error("❌ Erro ao inserir mensagem no banco local (fallback):", insertError);
				// Continuar com próxima mensagem
			}
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
				// Tentar criptografar se não estiver criptografada
				let textToSend = msg.encryptedText;

				if (!textToSend) {
					// Tentar criptografar a mensagem
					try {
						const { encryptMessage } = await import("@/core/security");
						textToSend = await encryptMessage(msg.text, msg.chatId, msg.senderId, msg.receiverId);

						// Atualizar mensagem local com texto criptografado
						await updateMessage(msg.id, {
							encryptedText: textToSend,
						});

						console.log(`✅ Mensagem ${msg.id} criptografada com sucesso`);
					} catch (encryptError) {
						console.warn(`⚠️ Erro ao criptografar mensagem pendente ${msg.id}:`, encryptError);
						// Se não conseguir criptografar, pular esta mensagem (será tentada depois)
						continue;
					}
				}

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
		// Obter lastSync para ignorar mensagens antigas
		let lastSync: number | null = null;
		getLastSyncTimestamp(chatId)
			.then((syncTime) => {
				lastSync = syncTime;
			})
			.catch((err) => {
				console.warn("⚠️ Erro ao obter lastSync no listener:", err);
			});

		const messagesQuery = query(
			collection(db, "messages"),
			where("chatId", "==", chatId),
			orderBy("timestamp", "desc"),
			limit(50) // Aumentar limite para pegar mensagens recentes
		);

		const unsubscribe = onSnapshot(
			messagesQuery,
			async (snapshot) => {
				// Atualizar lastSync se ainda não foi carregado
				if (lastSync === null) {
					try {
						lastSync = await getLastSyncTimestamp(chatId);
					} catch (err) {
						console.warn("⚠️ Erro ao obter lastSync no listener:", err);
					}
				}

				const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

				for (const docChange of snapshot.docChanges()) {
					if (docChange.type === "added") {
						const data = docChange.doc.data();

						// Validar dados da mensagem
						if (!data || !data.text || typeof data.text !== "string") {
							console.warn("⚠️ Mensagem com dados inválidos ignorada em tempo real:", data);
							continue;
						}

						// Converter timestamp ANTES de usar (necessário para busca por timestamp)
						let timestamp: Date;
						try {
							timestamp = data.timestamp?.toDate() || new Date();
							if (isNaN(timestamp.getTime())) {
								timestamp = new Date();
							}
						} catch (err) {
							timestamp = new Date();
						}

						// Verificar se é mensagem própria ANTES de tentar descriptografar
						const isOwnMessage = data.senderId === userId;

						// Descriptografar mensagem (pular se for mensagem própria - texto já está no banco local)
						let decryptedText = data.text;
						let decryptionError = false;
						
						if (isOwnMessage) {
							// Mensagem própria: buscar texto do banco local
							console.log("ℹ️ Mensagem própria recebida do Firestore - buscando texto do banco local");
							const messageId = docChange.doc.id;
							
							// Primeiro tentar buscar pelo ID do Firestore
							let localMessage = await getMessageById(messageId);
							
							// Se não encontrar, pode ser que ainda tenha tempId - buscar por timestamp
							if (!localMessage || !localMessage.text || localMessage.text === "[Mensagem própria]") {
								console.log("ℹ️ Mensagem não encontrada pelo ID, buscando por timestamp...");
								const allMessages = await getMessages(chatId, 100, 0);
								const matchingMessage = allMessages.find(
									(msg) =>
										msg.senderId === userId &&
										Math.abs(msg.timestamp.getTime() - timestamp.getTime()) < 10000 // 10 segundos de tolerância
								);
								if (matchingMessage && matchingMessage.text && matchingMessage.text !== "[Mensagem própria]") {
									localMessage = matchingMessage;
									console.log("✅ Mensagem encontrada por timestamp, ID:", matchingMessage.id);
								}
							}
							
							if (localMessage && localMessage.text && localMessage.text !== "[Mensagem própria]") {
								// Usar texto do banco local (já descriptografado)
								decryptedText = localMessage.text;
								console.log("✅ Texto recuperado do banco local para mensagem própria:", decryptedText.substring(0, 50));
							} else {
								// Se ainda não encontrou, pode ser que a mensagem ainda não foi salva no banco local
								// Neste caso, não devemos processar ainda - a mensagem já está na UI com texto correto
								console.log("ℹ️ Mensagem própria não encontrada no banco local ainda - mensagem já está na UI, ignorando");
								// Não processar esta mensagem agora - ela será processada quando o banco local for atualizado
								continue;
							}
						} else {
							// Mensagem de outro usuário: descriptografar normalmente
							try {
								// Verificar se é mensagem criptografada (começa com "ENC:")
								if (data.text.startsWith("ENC:")) {
									decryptedText = await decryptMessage(
										data.text,
										chatId,
										userId,
										data.senderId ?? "",
										data.receiverId ?? ""
									);
									// Verificar se descriptografia retornou erro (começa com "[")
									if (decryptedText.startsWith("[") && decryptedText.includes("Erro")) {
										decryptionError = true;
										console.warn("⚠️ Mensagem não pôde ser descriptografada:", decryptedText);
									}
								} else {
									// Mensagem não criptografada (legado ou erro)
									decryptedText = data.text;
								}
							} catch (error) {
								console.warn("⚠️ Erro ao descriptografar mensagem em tempo real:", error);
								decryptedText = "[Erro ao descriptografar mensagem]";
								decryptionError = true;
							}

							// Validar texto descriptografado
							if (!decryptedText || typeof decryptedText !== "string") {
								console.warn("⚠️ Texto descriptografado inválido em tempo real, usando texto original");
								decryptedText = data.text || "";
							}
						}

						// Timestamp já foi convertido acima, não precisa converter novamente

						// Verificar se mensagem é mais recente que lastSync (antes de processar)
						const messageTimestamp = timestamp.getTime();
						if (lastSync && messageTimestamp <= lastSyncDate.getTime()) {
							console.log(
								"ℹ️ Mensagem antiga ignorada pelo listener (já sincronizada):",
								docChange.doc.id
							);
							continue; // Ignorar mensagens já sincronizadas
						}

						let createdAt: Date;
						try {
							createdAt = data.createdAt?.toDate() || timestamp;
							if (isNaN(createdAt.getTime())) {
								createdAt = timestamp;
							}
						} catch (err) {
							createdAt = timestamp;
						}

						let updatedAt: Date;
						try {
							updatedAt = data.updatedAt?.toDate() || timestamp;
							if (isNaN(updatedAt.getTime())) {
								updatedAt = timestamp;
							}
						} catch (err) {
							updatedAt = timestamp;
						}

						let viewedAt: Date | null = null;
						try {
							if (data.viewedAt) {
								const viewedAtDate = data.viewedAt.toDate();
								if (!isNaN(viewedAtDate.getTime())) {
									viewedAt = viewedAtDate;
								}
							}
						} catch (err) {
							viewedAt = null;
						}

						// Validar campos obrigatórios
						if (!data.chatId || !data.senderId || !data.receiverId) {
							console.warn("⚠️ Mensagem com campos obrigatórios faltando ignorada em tempo real:", data);
							continue;
						}

						// Verificar se mensagem já existe no banco local antes de inserir
						const messageId = docChange.doc.id;
						const alreadyExists = await messageExists(messageId);

						if (alreadyExists) {
							// Se for mensagem própria e já existe, verificar se precisa atualizar o texto
							if (isOwnMessage) {
								const localMessage = await getMessageById(messageId);
								if (localMessage && localMessage.text && localMessage.text !== "[Mensagem própria]") {
									// Mensagem já existe com texto correto, não precisa fazer nada
									console.log("ℹ️ Mensagem própria já existe no banco local com texto correto, ignorando:", messageId);
									continue;
								} else if (localMessage && decryptedText && decryptedText !== "[Mensagem própria]") {
									// Mensagem existe mas tem placeholder, atualizar com texto correto
									console.log("ℹ️ Atualizando mensagem própria com texto do banco local:", messageId);
									await updateMessage(messageId, {
										text: decryptedText,
									});
									// Continuar para atualizar UI
								} else {
									console.log("ℹ️ Mensagem própria já existe no banco local, ignorando:", messageId);
									continue;
								}
							} else {
								console.log("ℹ️ Mensagem já existe no banco local, ignorando:", messageId);
								continue; // Não processar mensagem duplicada
							}
						}

						// Inserir no banco local
						try {
							await insertMessage({
								id: messageId,
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
						} catch (insertError) {
							console.error("❌ Erro ao inserir mensagem no banco local em tempo real:", insertError);
							// Continuar mesmo se inserção falhar
							continue;
						}

						// Notificar UI apenas se mensagem foi inserida com sucesso
						try {
							// Para mensagens próprias, garantir que usamos o texto do banco local
							let finalText = decryptedText;
							if (isOwnMessage && decryptedText === "[Mensagem própria]") {
								const localMessage = await getMessageById(messageId);
								if (localMessage && localMessage.text && localMessage.text !== "[Mensagem própria]") {
									finalText = localMessage.text;
									console.log("✅ Usando texto do banco local para notificar UI:", finalText.substring(0, 50));
								}
							}

							const message: Message = {
								id: messageId,
								chatId: data.chatId,
								senderId: data.senderId,
								receiverId: data.receiverId,
								text: finalText,
								timestamp,
								read: data.read || false,
								viewedAt,
								createdAt,
								updatedAt,
							};
							onNewMessage(message);

							// Processar notificação se mensagem é para o usuário atual e não é própria
							// Processar mesmo se houver erro de descriptografia (badge precisa funcionar)
							if (data.receiverId === userId && !isOwnMessage) {
								handleNewMessage(message, userId).catch((notifError) => {
									console.warn("⚠️ Erro ao processar notificação:", notifError);
								});
							}
						} catch (notifyError) {
							console.error("❌ Erro ao notificar UI sobre nova mensagem:", notifyError);
						}
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

						const messageId = docChange.doc.id;

						// Verificar se mensagem já existe no banco local antes de inserir
						const alreadyExists = await messageExists(messageId);

						if (alreadyExists) {
							console.log("ℹ️ Mensagem já existe no banco local (fallback), ignorando:", messageId);
							continue; // Não processar mensagem duplicada
						}

						// Verificar se é mensagem própria ANTES de tentar descriptografar
						const isOwnMessage = data.senderId === userId;

						// Descriptografar mensagem (pular se for mensagem própria)
						let decryptedText = data.text;
						
						if (isOwnMessage) {
							// Mensagem própria: buscar texto do banco local
							console.log("ℹ️ Mensagem própria recebida (fallback) - buscando texto do banco local");
							const localMessage = await getMessageById(messageId);
							if (localMessage && localMessage.text) {
								// Usar texto do banco local (já descriptografado)
								decryptedText = localMessage.text;
								console.log("✅ Texto recuperado do banco local para mensagem própria (fallback)");
							} else {
								// Tentar buscar por timestamp aproximado
								const allMessages = await getMessages(chatId, 100, 0);
								const matchingMessage = allMessages.find(
									(msg) =>
										msg.senderId === userId &&
										Math.abs(msg.timestamp.getTime() - timestamp.getTime()) < 5000
								);
								if (matchingMessage && matchingMessage.text) {
									decryptedText = matchingMessage.text;
									console.log("✅ Texto recuperado do banco local (por timestamp) para mensagem própria (fallback)");
								} else {
									decryptedText = "[Mensagem própria]";
									console.warn("⚠️ Mensagem própria não encontrada no banco local (fallback), usando placeholder");
								}
							}
						} else {
							// Mensagem de outro usuário: descriptografar normalmente
							try {
								decryptedText = await decryptMessage(
									data.text,
									chatId,
									userId,
									data.senderId ?? "",
									data.receiverId ?? ""
								);
							} catch (error) {
								console.warn("⚠️ Erro ao descriptografar mensagem (fallback):", error);
								decryptedText = "[Erro ao descriptografar mensagem]";
							}

							// Validar texto descriptografado
							if (!decryptedText || typeof decryptedText !== "string") {
								decryptedText = "[Erro ao descriptografar mensagem]";
							}
						}

						const timestamp = data.timestamp?.toDate() || new Date();
						const createdAt = data.createdAt?.toDate() || timestamp;
						const updatedAt = data.updatedAt?.toDate() || timestamp;
						const viewedAt = data.viewedAt?.toDate() || null;

						try {
							await insertMessage({
								id: messageId,
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

							const message: Message = {
								id: messageId,
								chatId: data.chatId,
								senderId: data.senderId,
								receiverId: data.receiverId,
								text: decryptedText,
								timestamp,
								read: data.read || false,
								viewedAt,
								createdAt,
								updatedAt,
							};
							onNewMessage(message);

							// Processar notificação se mensagem é para o usuário atual e não é própria
							if (data.receiverId === userId && !isOwnMessage) {
								handleNewMessage(message, userId).catch((notifError) => {
									console.warn("⚠️ Erro ao processar notificação (fallback):", notifError);
								});
							}
						} catch (insertError) {
							console.error("❌ Erro ao inserir mensagem no banco local (fallback):", insertError);
						}
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
