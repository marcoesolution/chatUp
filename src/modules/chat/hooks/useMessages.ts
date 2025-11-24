import { useState, useEffect, useRef } from "react";
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
	startAfter,
	QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/core/firebase";
import { useAuth } from "@/modules/auth";
import { encryptMessage, decryptMessage } from "@/core/security";
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
 */
const MESSAGES_PER_PAGE = 50;

export function useMessages(contactId: string) {
	const { firebaseUser } = useAuth();
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const lastMessageRef = useRef<QueryDocumentSnapshot | null>(null);
	const chatIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!firebaseUser || !contactId || !db) {
			setIsLoading(false);
			return;
		}

		const currentUserId = firebaseUser.uid;
		const chatId = generateChatId(currentUserId, contactId);
		chatIdRef.current = chatId;
		const firestoreDb = db; // Variável local para garantir tipo não-null

		// Query para mensagens (sem orderBy para evitar necessidade de índice composto)
		// Ordenaremos manualmente no cliente e limitaremos a quantidade
		// NOTA: Para melhor performance com paginação, crie um índice composto no Firestore:
		// Collection: messages, Fields: chatId (Ascending), timestamp (Descending)
		const messagesQuery = query(
			collection(firestoreDb, "messages"),
			where("chatId", "==", chatId),
			limit(MESSAGES_PER_PAGE * 2) // Buscar mais para garantir que temos MESSAGES_PER_PAGE após ordenação
		);

		// Escutar mudanças em tempo real
		const unsubscribe = onSnapshot(
			messagesQuery,
			async (snapshot) => {
				// Processar mensagens e descriptografar de forma assíncrona para não bloquear UI

				// Processar todas as mensagens de uma vez, mas de forma assíncrona
				// Isso permite que a UI continue responsiva
				(async () => {
					const messagesData: Message[] = [];

					for (const docSnapshot of snapshot.docs) {
						const data = docSnapshot.data();

						// Tentar descriptografar a mensagem
						let decryptedText = data.text;
						try {
							// Descriptografar usando a chave do usuário atual
							decryptedText = await decryptMessage(data.text, chatId, currentUserId);
						} catch (error) {
							// Se falhar, usar o texto original (pode ser mensagem antiga não criptografada)
						}

						// Converter viewedAt de Timestamp para Date se existir
						let viewedAt: Date | null = null;
						if (data.viewedAt) {
							if (data.viewedAt.toDate) {
								viewedAt = data.viewedAt.toDate();
							} else if (data.viewedAt instanceof Date) {
								viewedAt = data.viewedAt;
							}
						}

						messagesData.push({
							id: docSnapshot.id,
							chatId: data.chatId,
							senderId: data.senderId,
							receiverId: data.receiverId,
							text: decryptedText,
							timestamp: data.timestamp?.toDate() || new Date(),
							read: data.read || false,
							viewedAt: viewedAt || null,
							createdAt: data.createdAt,
							updatedAt: data.updatedAt,
						});
					}

					// Ordenar manualmente por timestamp (mais antigas primeiro)
					messagesData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

					// Guardar referência da última mensagem para paginação
					if (snapshot.docs.length > 0) {
						lastMessageRef.current = snapshot.docs[snapshot.docs.length - 1];
						setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
					} else {
						setHasMore(false);
					}

					setMessages(messagesData);
					setIsLoading(false);
					setError(null);
				})();
			},
			(err) => {
				console.error("❌ Erro ao buscar mensagens:", err);
				setError("Erro ao carregar mensagens");
				setIsLoading(false);
			}
		);

		// Marcar mensagens como lidas quando o usuário visualiza o chat
		// Fazer isso de forma assíncrona sem bloquear a renderização
		const markAsRead = async () => {
		const firestoreDb = db;
		if (!firestoreDb) {
			return;
		}

			try {
				// Buscar mensagens não lidas do usuário atual neste chat
				const unreadQuery = query(
					collection(firestoreDb, "messages"),
					where("chatId", "==", chatId),
					where("receiverId", "==", currentUserId),
					where("read", "==", false)
				);

				const unreadSnapshot = await getDocs(unreadQuery);

				if (unreadSnapshot.empty) {
					return;
				}

				// Atualizar todas as mensagens não lidas
				const updatePromises = unreadSnapshot.docs.map((docSnapshot) =>
					updateDoc(doc(firestoreDb, "messages", docSnapshot.id), {
						read: true,
						updatedAt: serverTimestamp(),
					})
				);

				await Promise.all(updatePromises);
			} catch (err: any) {
				// Se o erro for de índice faltando, ignorar (não é crítico)
				if (err.code !== "failed-precondition") {
					console.error("Erro ao marcar mensagens como lidas:", err);
				}
			}
		};

		// Executar após um pequeno delay para não bloquear a renderização inicial
		setTimeout(() => {
			markAsRead();
		}, 500);

		return () => unsubscribe();
	}, [firebaseUser, contactId]);

	// Função para marcar mensagens como visualizadas (chamada quando tela recebe foco)
	const markAsViewed = async () => {
		if (!firebaseUser || !contactId || !db) {
			return;
		}

		const currentUserId = firebaseUser.uid;
		const chatId = generateChatId(currentUserId, contactId);
		const firestoreDb = db;

		try {
			// Buscar mensagens lidas mas não visualizadas do usuário atual neste chat
			const viewedQuery = query(
				collection(firestoreDb, "messages"),
				where("chatId", "==", chatId),
				where("receiverId", "==", currentUserId),
				where("read", "==", true)
			);

			const viewedSnapshot = await getDocs(viewedQuery);

			if (viewedSnapshot.empty) {
				return;
			}

			// Filtrar apenas mensagens que ainda não foram visualizadas (viewedAt === null ou não existe)
			const unviewedMessages = viewedSnapshot.docs.filter((docSnapshot) => {
				const data = docSnapshot.data();
				return !data.viewedAt;
			});

			if (unviewedMessages.length === 0) {
				return;
			}

			// Atualizar todas as mensagens lidas mas não visualizadas
			const updatePromises = unviewedMessages.map((docSnapshot) =>
				updateDoc(doc(firestoreDb, "messages", docSnapshot.id), {
					viewedAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				})
			);

				await Promise.all(updatePromises);
			} catch (err: any) {
				// Se o erro for de índice faltando, ignorar (não é crítico)
				if (err.code !== "failed-precondition") {
					console.error("Erro ao marcar mensagens como visualizadas:", err);
				}
			}
	};

	/**
	 * Enviar uma nova mensagem (com criptografia automática)
	 */
	const sendMessage = async (messageData: CreateMessageData) => {
		if (!firebaseUser || !db) {
			throw new Error("Usuário não autenticado");
		}

		if (!messageData.text.trim()) {
			throw new Error("Mensagem não pode estar vazia");
		}

		const currentUserId = firebaseUser.uid;
		const chatId = generateChatId(currentUserId, messageData.receiverId);
		const firestoreDb = db; // Variável local para garantir tipo não-null

		try {
			// Criptografar a mensagem antes de enviar
			const plaintext = messageData.text.trim();
			let encryptedText: string;

			try {
				encryptedText = await Promise.race([
					encryptMessage(plaintext, chatId, currentUserId),
					new Promise<string>((_, reject) =>
						setTimeout(() => reject(new Error("Timeout: Criptografia demorou mais de 30 segundos")), 30000)
					),
				]);
			} catch (encryptError) {
				console.error("Erro ao criptografar mensagem:", encryptError);
				// Se a criptografia falhar, ainda podemos enviar a mensagem não criptografada
				// (para compatibilidade, mas em produção você pode querer falhar aqui)
				encryptedText = plaintext;
			}

			const newMessage = {
				chatId,
				senderId: currentUserId,
				receiverId: messageData.receiverId,
				text: encryptedText, // Armazenar mensagem criptografada
				timestamp: serverTimestamp(),
				read: false,
				viewedAt: null, // Nova mensagem ainda não foi visualizada
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			await addDoc(collection(firestoreDb, "messages"), newMessage);


			// Atualizar última mensagem do chat (opcional, pode ser feito via Cloud Function)
			// Por enquanto, vamos apenas enviar a mensagem
		} catch (err: any) {
			console.error("Erro ao enviar mensagem:", err);
			throw new Error("Erro ao enviar mensagem. Tente novamente.");
		}
	};

	/**
	 * Carregar mais mensagens antigas (paginação)
	 */
	const loadMoreMessages = async () => {
		if (!firebaseUser || !db || !chatIdRef.current || !lastMessageRef.current || isLoadingMore || !hasMore) {
			return;
		}

		setIsLoadingMore(true);
		try {
			const currentUserId = firebaseUser.uid;
			const chatId = chatIdRef.current;
			const firestoreDb = db;

			// Verificar novamente se db está disponível (TypeScript safety)
			if (!firestoreDb) {
				setHasMore(false);
				setIsLoadingMore(false);
				return;
			}

			// Query para mensagens mais antigas
			// NOTA: Esta query requer índice composto. Se não existir, a paginação será limitada.
			// Crie um índice: Collection: messages, Fields: chatId (Ascending), timestamp (Descending)
			let olderMessagesQuery;
			try {
				olderMessagesQuery = query(
					collection(firestoreDb, "messages"),
					where("chatId", "==", chatId),
					orderBy("timestamp", "desc"),
					startAfter(lastMessageRef.current),
					limit(MESSAGES_PER_PAGE)
				);
			} catch (err: any) {
				// Se o índice não existir, não podemos fazer paginação eficiente
				setHasMore(false);
				setIsLoadingMore(false);
				return;
			}

			const snapshot = await getDocs(olderMessagesQuery);

			if (snapshot.empty) {
				setHasMore(false);
				setIsLoadingMore(false);
				return;
			}

			const olderMessages: Message[] = [];

			for (const docSnapshot of snapshot.docs) {
				const data = docSnapshot.data();
				let decryptedText = data.text;

				try {
					decryptedText = await decryptMessage(data.text, chatId, currentUserId);
				} catch (error) {
					// Se falhar, usar texto original
				}

				// Converter viewedAt de Timestamp para Date se existir
				let viewedAt: Date | null = null;
				if (data.viewedAt) {
					if (data.viewedAt.toDate) {
						viewedAt = data.viewedAt.toDate();
					} else if (data.viewedAt instanceof Date) {
						viewedAt = data.viewedAt;
					}
				}

				olderMessages.push({
					id: docSnapshot.id,
					chatId: data.chatId,
					senderId: data.senderId,
					receiverId: data.receiverId,
					text: decryptedText,
					timestamp: data.timestamp?.toDate() || new Date(),
					read: data.read || false,
					viewedAt: viewedAt || null,
					createdAt: data.createdAt,
					updatedAt: data.updatedAt,
				});
			}

			// Ordenar e combinar com mensagens existentes
			olderMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			setMessages((prev) => [...olderMessages, ...prev]);

			// Atualizar referência e hasMore
			lastMessageRef.current = snapshot.docs[snapshot.docs.length - 1];
			setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
		} catch (err: any) {
			console.error("Erro ao carregar mais mensagens:", err);
			setError("Erro ao carregar mais mensagens");
		} finally {
			setIsLoadingMore(false);
		}
	};

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
