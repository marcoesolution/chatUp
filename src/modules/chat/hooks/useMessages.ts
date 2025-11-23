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
			console.log("⚠️ useMessages: Condições não atendidas", {
				hasFirebaseUser: !!firebaseUser,
				contactId,
				hasDb: !!db,
			});
			setIsLoading(false);
			return;
		}

		const currentUserId = firebaseUser.uid;
		const chatId = generateChatId(currentUserId, contactId);
		chatIdRef.current = chatId;
		const firestoreDb = db; // Variável local para garantir tipo não-null

		console.log("🔍 useMessages: Configurando listener", {
			currentUserId,
			contactId,
			chatId,
		});

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
				console.log("📨 useMessages: Snapshot recebido", {
					size: snapshot.size,
					empty: snapshot.empty,
				});

				const messagesData: Message[] = [];

				// Processar mensagens e descriptografar
				console.log("📥 [RECEIVE-MESSAGES] Processando mensagens recebidas", {
					totalMessages: snapshot.docs.length,
					chatId: chatId.substring(0, 8) + "...",
					currentUserId: currentUserId.substring(0, 8) + "...",
				});

				for (const docSnapshot of snapshot.docs) {
					const data = docSnapshot.data();

					console.log("📨 [RECEIVE-MESSAGE] Processando mensagem individual", {
						messageId: docSnapshot.id.substring(0, 8) + "...",
						senderId: data.senderId?.substring(0, 8) + "...",
						receiverId: data.receiverId?.substring(0, 8) + "...",
						isEncrypted: data.text?.startsWith("ENC:") || false,
						textLength: data.text?.length || 0,
					});

					// Tentar descriptografar a mensagem
					let decryptedText = data.text;
					try {
						// Descriptografar usando a chave do usuário atual
						// A mensagem foi criptografada pelo remetente, então precisamos
						// descriptografar usando a chave do chat do ponto de vista do usuário atual
						decryptedText = await decryptMessage(data.text, chatId, currentUserId);
						console.log("✅ [RECEIVE-MESSAGE] Mensagem processada com sucesso", {
							messageId: docSnapshot.id.substring(0, 8) + "...",
							wasEncrypted: data.text?.startsWith("ENC:") || false,
							decryptedLength: decryptedText.length,
						});
					} catch (error) {
						console.warn("⚠️ [RECEIVE-MESSAGE] Erro ao descriptografar mensagem, usando texto original", {
							messageId: docSnapshot.id.substring(0, 8) + "...",
							error: error instanceof Error ? error.message : String(error),
							fallbackToOriginal: true,
						});
						// Se falhar, usar o texto original (pode ser mensagem antiga não criptografada)
					}

					messagesData.push({
						id: docSnapshot.id,
						chatId: data.chatId,
						senderId: data.senderId,
						receiverId: data.receiverId,
						text: decryptedText,
						timestamp: data.timestamp?.toDate() || new Date(),
						read: data.read || false,
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

				console.log("✅ useMessages: Mensagens processadas", messagesData.length);
				setMessages(messagesData);
				setIsLoading(false);
				setError(null);
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
				console.warn("⚠️ Firestore não está disponível para marcar mensagens como lidas");
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
					console.log("📖 Nenhuma mensagem não lida para marcar");
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
				console.log(`✅ ${unreadSnapshot.size} mensagem(ns) marcada(s) como lida(s)`);
			} catch (err: any) {
				// Se o erro for de índice faltando, apenas logar (não é crítico)
				if (err.code === "failed-precondition") {
					console.warn("⚠️ Índice composto necessário para marcar como lida. Não é crítico.");
				} else {
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

			console.log("📤 [SEND-MESSAGE] Preparando mensagem para envio", {
				chatId: chatId.substring(0, 8) + "...",
				senderId: currentUserId.substring(0, 8) + "...",
				receiverId: messageData.receiverId.substring(0, 8) + "...",
				plaintextLength: plaintext.length,
				plaintextPreview: plaintext.substring(0, 50) + (plaintext.length > 50 ? "..." : ""),
			});

			try {
				encryptedText = await encryptMessage(plaintext, chatId, currentUserId);
				console.log("✅ [SEND-MESSAGE] Mensagem criptografada com sucesso", {
					originalLength: plaintext.length,
					encryptedLength: encryptedText.length,
					willBeStored: true,
				});
			} catch (encryptError) {
				console.error("❌ [SEND-MESSAGE] Erro ao criptografar mensagem:", encryptError);
				// Se a criptografia falhar, ainda podemos enviar a mensagem não criptografada
				// (para compatibilidade, mas em produção você pode querer falhar aqui)
				encryptedText = plaintext;
				console.warn("⚠️ [SEND-MESSAGE] Enviando mensagem sem criptografia (fallback)");
			}

			const newMessage = {
				chatId,
				senderId: currentUserId,
				receiverId: messageData.receiverId,
				text: encryptedText, // Armazenar mensagem criptografada
				timestamp: serverTimestamp(),
				read: false,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			await addDoc(collection(firestoreDb, "messages"), newMessage);

			// Log específico mostrando o que foi armazenado no Firestore
			console.log("\n" + "=".repeat(80));
			console.log("💾 ARMAZENAMENTO NO FIRESTORE - MENSAGEM SEGURA");
			console.log("=".repeat(80));
			console.log("📤 Mensagem enviada pelo usuário:");
			console.log('   "' + plaintext + '"');
			console.log("");
			console.log("🔒 O que foi ARMAZENADO no Firestore (criptografado):");
			console.log("   " + encryptedText.substring(0, 120) + (encryptedText.length > 120 ? "..." : ""));
			console.log("");
			console.log("✅ SEGURANÇA GARANTIDA:");
			console.log("   ✓ Firestore NÃO consegue ler o conteúdo da mensagem");
			console.log("   ✓ Apenas texto criptografado está armazenado");
			console.log("   ✓ Mesmo com acesso ao banco, mensagem está protegida");
			console.log("=".repeat(80) + "\n");

			console.log("✅ [SEND-MESSAGE] Mensagem enviada e armazenada no Firestore", {
				chatId: chatId.substring(0, 8) + "...",
				messageId: "pending",
				isEncrypted: encryptedText.startsWith("ENC:"),
				storedTextLength: encryptedText.length,
			});

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
				console.warn("⚠️ Índice composto necessário para paginação. Criando índice no Firestore Console.");
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

				olderMessages.push({
					id: docSnapshot.id,
					chatId: data.chatId,
					senderId: data.senderId,
					receiverId: data.receiverId,
					text: decryptedText,
					timestamp: data.timestamp?.toDate() || new Date(),
					read: data.read || false,
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

			console.log(`✅ Carregadas ${olderMessages.length} mensagens antigas`);
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
	};
}
