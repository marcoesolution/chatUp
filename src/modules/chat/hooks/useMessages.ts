import { useState, useEffect, useRef, useCallback } from "react";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "@/core/firebase";
import { useAuth } from "@/modules/auth";
import { encryptMessage, preloadChatKey } from "@/core/security";
import { getMessages, insertMessage, markAsRead as markAsReadLocal, updateMessage } from "@/core/database";
import { syncChat, setupRealtimeListener, uploadPendingMessages } from "@/services/sync/firestoreSync";
import type { Message, CreateMessageData } from "../types";

/**
 * Gera um ID de chat único baseado nos IDs dos participantes
 * O ID é sempre o mesmo independente da ordem dos participantes
 */
function generateChatId(userId1: string, userId2: string): string {
	const sorted = [userId1, userId2].sort();
	return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Hook para gerenciar mensagens de um chat em tempo real
 * Agora usa banco local (Quick-SQLite) para performance máxima
 */
const MESSAGES_PER_PAGE = 15; // Limitar a 15 mensagens por vez para melhor performance

export function useMessages(contactId: string) {
	const { firebaseUser } = useAuth();
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const chatIdRef = useRef<string | null>(null);
	const loadedCountRef = useRef<number>(0);
	const unsubscribeRef = useRef<(() => void) | null>(null);

	// Carregar mensagens do banco local
	const loadMessagesFromLocal = useCallback(
		(chatId: string, limit: number = MESSAGES_PER_PAGE, offset: number = 0) => {
			try {
				const localMessages = getMessages(chatId, limit, offset);
				return localMessages;
			} catch (err) {
				console.error("❌ Erro ao carregar mensagens do banco local:", err);
				return [];
			}
		},
		[]
	);

	// Atualizar estado com mensagens do banco local
	const refreshMessages = useCallback(
		async (chatId: string) => {
			const localMessages = await loadMessagesFromLocal(chatId, MESSAGES_PER_PAGE, 0);
			setMessages(localMessages);
			loadedCountRef.current = localMessages.length;
			setHasMore(localMessages.length >= MESSAGES_PER_PAGE);
		},
		[loadMessagesFromLocal]
	);

	useEffect(() => {
		if (!firebaseUser || !contactId || !db) {
			setIsLoading(false);
			return;
		}

		const currentUserId = firebaseUser.uid;
		const chatId = generateChatId(currentUserId, contactId);
		chatIdRef.current = chatId;

		// Pré-carregar chave de criptografia
		preloadChatKey(chatId, currentUserId)
			.then(() => {
				console.log("✅ Chave pré-carregada com sucesso", { chatId });
			})
			.catch((err) => {
				console.warn("⚠️ Erro ao pré-carregar chave:", err);
			});

		// Sincronizar e carregar mensagens
		(async () => {
			try {
				setIsLoading(true);

				// 1. Sincronizar do Firestore para o banco local
				console.log("🔄 Sincronizando chat do Firestore...", { chatId });
				await syncChat(chatId, currentUserId);

				// 2. Carregar mensagens do banco local (instantâneo)
				console.log("📖 Carregando mensagens do banco local...");
				const localMessages = await loadMessagesFromLocal(chatId, MESSAGES_PER_PAGE, 0);
				setMessages(localMessages);
				loadedCountRef.current = localMessages.length;
				setHasMore(localMessages.length >= MESSAGES_PER_PAGE);
				setIsLoading(false);
				setError(null);

				// 3. Configurar listener em tempo real
				unsubscribeRef.current = setupRealtimeListener(chatId, currentUserId, (newMessage) => {
					// Atualizar mensagens quando nova mensagem chegar
					setMessages((prev) => {
						// Verificar se mensagem já existe (verificação dupla para garantir)
						const exists = prev.some((m) => m.id === newMessage.id);
						if (exists) {
							console.log("ℹ️ Mensagem já existe no estado, ignorando:", newMessage.id);
							return prev;
						}
						// Adicionar nova mensagem e reordenar
						const combined = [...prev, newMessage];
						combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
						return combined;
					});
				});

				// 4. Enviar mensagens pendentes (se houver)
				uploadPendingMessages(currentUserId).catch((err) => {
					console.warn("⚠️ Erro ao enviar mensagens pendentes:", err);
				});

				// 5. Marcar mensagens como lidas
				setTimeout(async () => {
					await markAsReadLocal(chatId, currentUserId);
				}, 500);
			} catch (err: any) {
				console.error("❌ Erro ao inicializar chat:", err);
				setError("Erro ao carregar mensagens");
				setIsLoading(false);
			}
		})();

		return () => {
			if (unsubscribeRef.current) {
				unsubscribeRef.current();
				unsubscribeRef.current = null;
			}
		};
	}, [firebaseUser, contactId, loadMessagesFromLocal]);

	// Função para marcar mensagens como visualizadas
	const markAsViewed = useCallback(async () => {
		if (!firebaseUser || !contactId || !db || !chatIdRef.current) {
			return;
		}

		const currentUserId = firebaseUser.uid;
		const chatId = chatIdRef.current;
		const firestoreDb = db;

		try {
			// Atualizar no banco local
			const localMessages = await getMessages(chatId, 1000, 0); // Buscar todas as mensagens do chat
			const unviewedMessages = localMessages.filter(
				(msg) => msg.receiverId === currentUserId && msg.read && !msg.viewedAt
			);

			if (unviewedMessages.length === 0) {
				return;
			}

			// Atualizar no Firestore
			const updatePromises = unviewedMessages.map((msg) =>
				updateDoc(doc(firestoreDb, "messages", msg.id), {
					viewedAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				})
			);

			await Promise.all(updatePromises);

			// Atualizar no banco local
			for (const msg of unviewedMessages) {
				await updateMessage(msg.id, {
					viewedAt: Date.now(),
				});
			}

			// Atualizar estado
			await refreshMessages(chatId);
		} catch (err: any) {
			console.error("Erro ao marcar mensagens como visualizadas:", err);
		}
	}, [firebaseUser, contactId, refreshMessages]);

	/**
	 * Enviar uma nova mensagem (com criptografia automática)
	 * Usa atualização otimista: insere local primeiro, depois envia
	 */
	const sendMessage = useCallback(
		async (messageData: CreateMessageData) => {
			if (!firebaseUser || !db) {
				throw new Error("Usuário não autenticado");
			}

			if (!messageData.text.trim()) {
				throw new Error("Mensagem não pode estar vazia");
			}

			const currentUserId = firebaseUser.uid;
			const chatId = chatIdRef.current || generateChatId(currentUserId, messageData.receiverId);
			const firestoreDb = db;
			const plaintext = messageData.text.trim();

			// 1. Criptografar mensagem
			let encryptedText: string;
			try {
				const startTime = Date.now();
				console.log("🔐 Iniciando criptografia da mensagem...", { chatId, messageLength: plaintext.length });

				encryptedText = await Promise.race([
					encryptMessage(plaintext, chatId, currentUserId, messageData.receiverId),
					new Promise<string>((_, reject) =>
						setTimeout(() => {
							reject(new Error("Timeout: Criptografia demorou mais de 10 segundos"));
						}, 10000)
					),
				]);

				const elapsed = Date.now() - startTime;
				console.log(`✅ Mensagem criptografada com sucesso em ${elapsed}ms`);
			} catch (encryptError: any) {
				console.error("❌ Erro ao criptografar mensagem:", encryptError);
				// Fallback: enviar sem criptografia
				encryptedText = plaintext;
			}

			// 2. Criar mensagem temporária (otimistic update)
			const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const now = new Date();

			const tempMessage: Message = {
				id: tempId,
				chatId,
				senderId: currentUserId,
				receiverId: messageData.receiverId,
				text: plaintext, // Mostrar texto descriptografado na UI
				timestamp: now,
				read: false,
				viewedAt: null,
				createdAt: now,
				updatedAt: now,
			};

			// 3. Inserir no banco local primeiro (atualização otimista)
			// Não aguardar para não bloquear a UI
			insertMessage({
				...tempMessage,
				encryptedText, // Manter versão criptografada
				isLocal: true, // Marcar como não sincronizada
			}).catch((err) => {
				// Tratar erro silenciosamente (pode ser race condition)
				console.warn("⚠️ Erro ao inserir mensagem local (pode ser race condition):", err);
			});

			// 4. Atualizar UI imediatamente
			setMessages((prev) => {
				const combined = [...prev, tempMessage];
				combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
				return combined;
			});

			// 5. Enviar para Firestore em background
			try {
				const newMessage = {
					chatId,
					senderId: currentUserId,
					receiverId: messageData.receiverId,
					text: encryptedText,
					timestamp: serverTimestamp(),
					read: false,
					viewedAt: null,
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				};

				const docRef = await addDoc(collection(firestoreDb, "messages"), newMessage);

				// 6. Atualizar mensagem local com ID do Firestore e marcar como sincronizada
				await updateMessage(tempId, {
					id: docRef.id,
					isLocal: 0,
					syncedAt: Date.now(),
				});

				// 7. Atualizar UI com ID real
				setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...msg, id: docRef.id } : msg)));
			} catch (err: any) {
				console.error("❌ Erro ao enviar mensagem para Firestore:", err);
				// Mensagem permanece como local e será enviada depois via uploadPendingMessages
			}
		},
		[firebaseUser]
	);

	/**
	 * Carregar mais mensagens antigas (paginação)
	 * Agora busca do banco local (instantâneo)
	 */
	const loadMoreMessages = useCallback(async () => {
		if (!chatIdRef.current || isLoadingMore || !hasMore) {
			return;
		}

		setIsLoadingMore(true);

		try {
			const chatId = chatIdRef.current;
			const offset = loadedCountRef.current;

			// Buscar do banco local (instantâneo)
			const olderMessages = await loadMessagesFromLocal(chatId, MESSAGES_PER_PAGE, offset);

			if (olderMessages.length === 0) {
				setHasMore(false);
				setIsLoadingMore(false);
				return;
			}

			// Adicionar mensagens antigas no início da lista
			setMessages((prev) => {
				const combined = [...olderMessages, ...prev];
				combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
				return combined;
			});

			loadedCountRef.current += olderMessages.length;
			setHasMore(olderMessages.length >= MESSAGES_PER_PAGE);
		} catch (err: any) {
			console.error("❌ Erro ao carregar mais mensagens:", err);
			setError("Erro ao carregar mais mensagens");
		} finally {
			setIsLoadingMore(false);
		}
	}, [isLoadingMore, hasMore, loadMessagesFromLocal]);

	return {
		messages,
		isLoading,
		error,
		sendMessage,
		loadMoreMessages,
		hasMore,
		isLoadingMore,
		markAsViewed,
	};
}
