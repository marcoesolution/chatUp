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
import { encryptMessage, decryptMessage, preloadChatKey } from "@/core/security";
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
const MESSAGES_PER_PAGE = 15; // Limitar a 15 mensagens por vez para melhor performance

export function useMessages(contactId: string) {
	const { firebaseUser } = useAuth();
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const lastMessageRef = useRef<QueryDocumentSnapshot | null>(null);
	const chatIdRef = useRef<string | null>(null);
	const currentMessageIdsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!firebaseUser || !contactId || !db) {
			setIsLoading(false);
			return;
		}

		const currentUserId = firebaseUser.uid;
		const chatId = generateChatId(currentUserId, contactId);
		chatIdRef.current = chatId;
		const firestoreDb = db; // Variável local para garantir tipo não-null

		// Pré-carregar chave de criptografia IMEDIATAMENTE em background
		// Prioridade alta - executar sem delay para garantir que a chave esteja pronta
		// Isso evita delay na primeira mensagem do chat
		preloadChatKey(chatId, currentUserId)
			.then(() => {
				console.log("✅ Chave pré-carregada com sucesso", { chatId });
			})
			.catch((err) => {
				console.warn("⚠️ Erro ao pré-carregar chave:", err);
			});

		// Query para as 15 mensagens mais recentes
		// NOTA: Requer índice composto: Collection: messages, Fields: chatId (Ascending), timestamp (Descending)
		// Se o índice não existir, o Firestore retornará erro que será tratado no catch
		const messagesQuery = query(
			collection(firestoreDb, "messages"),
			where("chatId", "==", chatId),
			orderBy("timestamp", "desc"), // Mais recentes primeiro
			limit(MESSAGES_PER_PAGE) // Apenas 15 mensagens iniciais
		);

		// Função auxiliar para processar documentos e descriptografar
		const processMessages = async (docs: QueryDocumentSnapshot[]): Promise<Message[]> => {
			const messagesData: Message[] = [];

			for (const docSnapshot of docs) {
				const data = docSnapshot.data();

				// Tentar descriptografar a mensagem
				let decryptedText = data.text;
				try {
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

			// Ordenar por timestamp (mais antigas primeiro)
			messagesData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			return messagesData;
		};

		// Carregar mensagens iniciais (apenas 15 mais recentes)
		(async () => {
			try {
				const initialSnapshot = await getDocs(messagesQuery);
				const initialMessages = await processMessages(initialSnapshot.docs);

				// Guardar referência da mensagem mais antiga para paginação
				if (initialSnapshot.docs.length > 0) {
					// A query retorna mais recentes primeiro, então a última é a mais antiga
					lastMessageRef.current = initialSnapshot.docs[initialSnapshot.docs.length - 1];
					setHasMore(initialSnapshot.docs.length === MESSAGES_PER_PAGE);
				} else {
					setHasMore(false);
				}

				// Atualizar ref com IDs das mensagens iniciais
				currentMessageIdsRef.current = new Set(initialMessages.map((m) => m.id));

				setMessages(initialMessages);
				setIsLoading(false);
				setError(null);
			} catch (err: any) {
				// Se o erro for de índice faltando, usar fallback sem orderBy
				if (err.code === "failed-precondition" && err.message?.includes("index")) {
					console.warn("⚠️ Índice composto não encontrado. Usando fallback sem orderBy");
					try {
						// Fallback: buscar sem orderBy e ordenar no cliente
						const fallbackQuery = query(
							collection(firestoreDb, "messages"),
							where("chatId", "==", chatId),
							limit(MESSAGES_PER_PAGE * 3) // Buscar mais para garantir que temos 15 após ordenação
						);
						const fallbackSnapshot = await getDocs(fallbackQuery);
						const allMessages = await processMessages(fallbackSnapshot.docs);

						// Pegar apenas as 15 mais recentes
						const recentMessages = allMessages.slice(-MESSAGES_PER_PAGE);

						// Encontrar o documento correspondente à mensagem mais antiga
						if (recentMessages.length > 0 && fallbackSnapshot.docs.length > 0) {
							const oldestMessage = recentMessages[0];
							const oldestDoc = fallbackSnapshot.docs.find((doc) => doc.id === oldestMessage.id);
							if (oldestDoc) {
								lastMessageRef.current = oldestDoc;
							}
							setHasMore(fallbackSnapshot.docs.length >= MESSAGES_PER_PAGE * 3);
						} else {
							setHasMore(false);
						}

						currentMessageIdsRef.current = new Set(recentMessages.map((m) => m.id));
						setMessages(recentMessages);
						setIsLoading(false);
						setError(null);

						console.warn("💡 Crie o índice composto no Firestore para melhor performance:");
						console.warn("Collection: messages, Fields: chatId (Ascending), timestamp (Descending)");
					} catch (fallbackErr: any) {
						console.error("❌ Erro também no fallback:", fallbackErr);
						setError("Erro ao carregar mensagens. Verifique os índices do Firestore.");
						setIsLoading(false);
					}
				} else {
					console.error("❌ Erro ao carregar mensagens iniciais:", err);
					setError("Erro ao carregar mensagens");
					setIsLoading(false);
				}
			}
		})();

		// Escutar apenas novas mensagens em tempo real
		// Usar fallback se o índice não existir
		let unsubscribe: (() => void) | null = null;

		const setupSnapshot = (queryToUse: any): (() => void) => {
			return onSnapshot(
				queryToUse,
				async (snapshot) => {
					// Processar apenas novas mensagens (que não estão na lista atual)
					(async () => {
						// onSnapshot retorna QuerySnapshot que tem .docs
						const snapshotDocs = (snapshot as any).docs || [];
						const newDocs = snapshotDocs.filter(
							(doc: QueryDocumentSnapshot) => !currentMessageIdsRef.current.has(doc.id)
						);

						if (newDocs.length === 0) {
							return; // Nenhuma mensagem nova
						}

						// Processar apenas as novas mensagens
						const newMessages = await processMessages(newDocs);

						// Adicionar IDs das novas mensagens ao ref
						newMessages.forEach((msg) => currentMessageIdsRef.current.add(msg.id));

						// Adicionar novas mensagens à lista (são mais recentes, vão para o final após reverse)
						setMessages((prev) => {
							const combined = [...prev, ...newMessages];
							// Reordenar para garantir ordem correta
							combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
							return combined;
						});
					})();
				},
				(err: any) => {
					// Se for erro de índice, usar fallback sem orderBy
					if (err.code === "failed-precondition" && err.message?.includes("index")) {
						console.warn("⚠️ Índice não encontrado para onSnapshot. Usando fallback sem orderBy");
						const fallbackQuery = query(collection(firestoreDb, "messages"), where("chatId", "==", chatId));
						if (unsubscribe) {
							unsubscribe(); // Limpar listener anterior
						}
						unsubscribe = setupSnapshot(fallbackQuery);
					} else {
						console.error("❌ Erro ao escutar novas mensagens:", err);
					}
				}
			);
		};

		try {
			unsubscribe = setupSnapshot(messagesQuery);
		} catch (err: any) {
			// Se falhar ao configurar onSnapshot, usar fallback
			if (err.code === "failed-precondition" && err.message?.includes("index")) {
				console.warn("⚠️ Índice não encontrado. Usando onSnapshot sem orderBy");
				const fallbackQuery = query(collection(firestoreDb, "messages"), where("chatId", "==", chatId));
				unsubscribe = setupSnapshot(fallbackQuery);
			} else {
				console.error("❌ Erro ao configurar onSnapshot:", err);
			}
		}

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

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
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
				const startTime = Date.now();
				console.log("🔐 Iniciando criptografia da mensagem...", { chatId, messageLength: plaintext.length });

				// Timeout de 10 segundos (com 5k iterações deve ser ~3-5s no S22, com cache <1s)
				encryptedText = await Promise.race([
					encryptMessage(plaintext, chatId, currentUserId),
					new Promise<string>((_, reject) =>
						setTimeout(() => {
							const elapsed = Date.now() - startTime;
							console.error(`⏱️ Timeout após ${elapsed}ms: Criptografia demorou mais de 10 segundos`);
							reject(new Error("Timeout: Criptografia demorou mais de 10 segundos"));
						}, 10000)
					),
				]);

				const elapsed = Date.now() - startTime;
				console.log(`✅ Mensagem criptografada com sucesso em ${elapsed}ms`);
			} catch (encryptError: any) {
				console.error("❌ Erro ao criptografar mensagem:", encryptError);
				console.error("❌ Detalhes do erro:", {
					message: encryptError.message,
					stack: encryptError.stack,
					chatId,
				});

				// Se for timeout, não tentar novamente (já demorou muito)
				// Apenas logar o erro e enviar mensagem não criptografada como fallback
				if (encryptError.message?.includes("Timeout")) {
					console.error("❌ Timeout na criptografia - a chave pode estar sendo gerada pela primeira vez");
					console.error("💡 Dica: Aguarde alguns segundos e tente novamente, ou reinicie o app");
					// Enviar mensagem não criptografada como fallback
					encryptedText = plaintext;
				} else {
					// Para outros erros, enviar mensagem não criptografada
					encryptedText = plaintext;
				}
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
	 * Carrega 15 mensagens anteriores à mais antiga atual
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

			// Query para mensagens mais antigas que a última carregada
			// NOTA: Requer índice composto: Collection: messages, Fields: chatId (Ascending), timestamp (Descending)
			let olderMessagesQuery;
			try {
				olderMessagesQuery = query(
					collection(firestoreDb, "messages"),
					where("chatId", "==", chatId),
					orderBy("timestamp", "desc"), // Mais recentes primeiro na query
					startAfter(lastMessageRef.current), // Começar após a mensagem mais antiga atual
					limit(MESSAGES_PER_PAGE) // Carregar 15 mensagens
				);
			} catch (err: any) {
				// Se o índice não existir, não podemos fazer paginação eficiente
				console.warn("⚠️ Índice composto não encontrado para paginação");
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

			// Processar mensagens (descriptografar)
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

			// Ordenar por timestamp (mais antigas primeiro)
			olderMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

			// Adicionar IDs das novas mensagens ao ref
			olderMessages.forEach((msg) => currentMessageIdsRef.current.add(msg.id));

			// Adicionar mensagens antigas no início da lista (antes das atuais)
			setMessages((prev) => {
				const combined = [...olderMessages, ...prev];
				// Reordenar para garantir ordem correta
				combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
				return combined;
			});

			// Atualizar referência da mensagem mais antiga (última da query)
			lastMessageRef.current = snapshot.docs[snapshot.docs.length - 1];
			setHasMore(snapshot.docs.length === MESSAGES_PER_PAGE);
		} catch (err: any) {
			console.error("❌ Erro ao carregar mais mensagens:", err);
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
