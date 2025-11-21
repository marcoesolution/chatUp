import { useState, useEffect } from "react";
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
} from "firebase/firestore";
import { db } from "@/core/firebase";
import { useAuth } from "@/modules/auth";
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
export function useMessages(contactId: string) {
	const { firebaseUser } = useAuth();
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

		console.log("🔍 useMessages: Configurando listener", {
			currentUserId,
			contactId,
			chatId,
		});

		// Usar query simples sem orderBy para evitar necessidade de índice composto
		// Ordenaremos manualmente no cliente
		const messagesQuery = query(
			collection(db, "messages"),
			where("chatId", "==", chatId),
			limit(100) // Limitar a 100 mensagens por vez
		);

		// Escutar mudanças em tempo real
		const unsubscribe = onSnapshot(
			messagesQuery,
			(snapshot) => {
				console.log("📨 useMessages: Snapshot recebido", {
					size: snapshot.size,
					empty: snapshot.empty,
				});

				const messagesData: Message[] = [];
				
				snapshot.forEach((docSnapshot) => {
					const data = docSnapshot.data();
					messagesData.push({
						id: docSnapshot.id,
						chatId: data.chatId,
						senderId: data.senderId,
						receiverId: data.receiverId,
						text: data.text,
						timestamp: data.timestamp?.toDate() || new Date(),
						read: data.read || false,
						createdAt: data.createdAt,
						updatedAt: data.updatedAt,
					});
				});
				
				// Ordenar manualmente por timestamp (mais antigas primeiro)
				messagesData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

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
			try {
				// Buscar mensagens não lidas do usuário atual neste chat
				const unreadQuery = query(
					collection(db, "messages"),
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
					updateDoc(doc(db, "messages", docSnapshot.id), {
						read: true,
						updatedAt: serverTimestamp(),
					})
				);

				await Promise.all(updatePromises);
				console.log(`✅ ${unreadSnapshot.size} mensagem(ns) marcada(s) como lida(s)`);
			} catch (err: any) {
				// Se o erro for de índice faltando, apenas logar (não é crítico)
				if (err.code === 'failed-precondition') {
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
	 * Enviar uma nova mensagem
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

		try {
			const newMessage = {
				chatId,
				senderId: currentUserId,
				receiverId: messageData.receiverId,
				text: messageData.text.trim(),
				timestamp: serverTimestamp(),
				read: false,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			await addDoc(collection(db, "messages"), newMessage);

			// Atualizar última mensagem do chat (opcional, pode ser feito via Cloud Function)
			// Por enquanto, vamos apenas enviar a mensagem
		} catch (err: any) {
			console.error("Erro ao enviar mensagem:", err);
			throw new Error("Erro ao enviar mensagem. Tente novamente.");
		}
	};

	return {
		messages,
		isLoading,
		error,
		sendMessage,
	};
}

