/**
 * Hook para buscar informações de contatos (última mensagem, não lidas, etc)
 */

import { useState, useEffect } from 'react';
import {
	collection,
	query,
	where,
	limit,
	getDocs,
	onSnapshot,
	QuerySnapshot,
	DocumentData,
} from 'firebase/firestore';
import { db } from '@/core/firebase';
import { useAuth } from '@/modules/auth';
import { decryptMessage } from '@/core/security';
import type { Contact } from '../types';
import type { NearbyUser } from '@/modules/location/types';

/**
 * Gera um ID de chat único baseado nos IDs dos participantes
 */
function generateChatId(userId1: string, userId2: string): string {
	const sorted = [userId1, userId2].sort();
	return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Hook para buscar informações de chat para uma lista de usuários próximos
 * Retorna contatos com última mensagem e contagem de não lidas
 */
export function useContacts(nearbyUsers: NearbyUser[]): {
	contacts: Contact[];
	isLoading: boolean;
} {
	const { firebaseUser } = useAuth();
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const firestoreDb = db;
		if (!firebaseUser || !firestoreDb || nearbyUsers.length === 0) {
			setContacts([]);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		const currentUserId = firebaseUser.uid;
		const contactsMap = new Map<string, Contact>();

		// Inicializar contatos com dados básicos
		nearbyUsers.forEach((user) => {
			contactsMap.set(user.id, {
				id: user.id,
				name: user.name,
				avatar: user.avatar,
				unreadCount: 0,
			});
		});

		// Buscar última mensagem e contagem de não lidas para cada contato
		const unsubscribeFunctions: (() => void)[] = [];

		nearbyUsers.forEach((nearbyUser) => {
			const chatId = generateChatId(currentUserId, nearbyUser.id);

			// Buscar última mensagem
			// NOTA: Removemos orderBy para evitar necessidade de índice composto
			// Ordenaremos manualmente no cliente
			const lastMessageQuery = query(
				collection(firestoreDb, 'messages'),
				where('chatId', '==', chatId),
				limit(50) // Buscar últimas 50 mensagens e ordenar no cliente
			);

			// Buscar mensagens não lidas
			const unreadQuery = query(
				collection(firestoreDb, 'messages'),
				where('chatId', '==', chatId),
				where('receiverId', '==', currentUserId),
				where('read', '==', false)
			);

			// Escutar última mensagem
			const unsubscribeLastMessage = onSnapshot(
				lastMessageQuery,
				async (snapshot: QuerySnapshot<DocumentData>) => {
					const contact = contactsMap.get(nearbyUser.id);
					if (!contact) return;

					if (!snapshot.empty) {
						// Ordenar mensagens por timestamp (mais recente primeiro)
						const sortedDocs = [...snapshot.docs].sort((a, b) => {
							const dataA = a.data();
							const dataB = b.data();
							
							// Extrair timestamp de diferentes formatos
							let timestampA = 0;
							let timestampB = 0;
							
							if (dataA.timestamp) {
								if (dataA.timestamp.toMillis) {
									timestampA = dataA.timestamp.toMillis();
								} else if (dataA.timestamp.toDate) {
									timestampA = dataA.timestamp.toDate().getTime();
								} else if (dataA.timestamp instanceof Date) {
									timestampA = dataA.timestamp.getTime();
								} else if (typeof dataA.timestamp === 'number') {
									timestampA = dataA.timestamp;
								}
							}
							
							if (dataB.timestamp) {
								if (dataB.timestamp.toMillis) {
									timestampB = dataB.timestamp.toMillis();
								} else if (dataB.timestamp.toDate) {
									timestampB = dataB.timestamp.toDate().getTime();
								} else if (dataB.timestamp instanceof Date) {
									timestampB = dataB.timestamp.getTime();
								} else if (typeof dataB.timestamp === 'number') {
									timestampB = dataB.timestamp;
								}
							}
							
							return timestampB - timestampA; // Descendente (mais recente primeiro)
						});
						
						const lastMessageDoc = sortedDocs[0];
						const messageData = lastMessageDoc.data();
						
						// Formatar hora da última mensagem
						const timestamp = messageData.timestamp?.toDate();
						let lastMessageTime: string | undefined;
						if (timestamp) {
							const now = new Date();
							const diffMs = now.getTime() - timestamp.getTime();
							const diffMins = Math.floor(diffMs / 60000);
							const diffHours = Math.floor(diffMs / 3600000);
							const diffDays = Math.floor(diffMs / 86400000);

							if (diffMins < 1) {
								lastMessageTime = 'Agora';
							} else if (diffMins < 60) {
								lastMessageTime = `${diffMins}m`;
							} else if (diffHours < 24) {
								lastMessageTime = `${diffHours}h`;
							} else if (diffDays < 7) {
								lastMessageTime = `${diffDays}d`;
							} else {
								lastMessageTime = timestamp.toLocaleDateString('pt-BR', {
									day: '2-digit',
									month: '2-digit',
								});
							}
						}

						// Descriptografar mensagem se estiver criptografada
						let messageText = messageData.text || '';
						if (messageText.startsWith('ENC:')) {
							try {
								const decryptedText = await decryptMessage(
									messageText,
									chatId,
									currentUserId,
									messageData.senderId ?? "",
									messageData.receiverId ?? ""
								);
								// Mostrar apenas uma prévia (primeiros 50 caracteres)
								messageText = decryptedText.length > 50 ? decryptedText.substring(0, 50) + '...' : decryptedText;
							} catch (error) {
								console.error('❌ Erro ao descriptografar última mensagem:', error);
								// Em caso de erro, mostrar mensagem genérica
								messageText = 'Mensagem criptografada';
							}
						} else if (messageText.length > 50) {
							// Truncar mensagem não criptografada também se for muito longa
							messageText = messageText.substring(0, 50) + '...';
						}

						contact.lastMessage = messageText;
						contact.lastMessageTime = lastMessageTime;
					} else {
						contact.lastMessage = undefined;
						contact.lastMessageTime = undefined;
					}

					contactsMap.set(nearbyUser.id, contact);
					setContacts(Array.from(contactsMap.values()));
				},
				(err) => {
					// Se o erro for de índice faltando, apenas logar (não é crítico)
					if (err.code === 'failed-precondition') {
						console.warn('⚠️ Índice do Firestore não encontrado. A query funcionará, mas pode ser mais lenta.');
					} else {
						console.error('❌ Erro ao buscar última mensagem:', err);
					}
				}
			);

			// Escutar mensagens não lidas
			const unsubscribeUnread = onSnapshot(
				unreadQuery,
				(snapshot: QuerySnapshot<DocumentData>) => {
					const contact = contactsMap.get(nearbyUser.id);
					if (!contact) return;

					contact.unreadCount = snapshot.size;
					contactsMap.set(nearbyUser.id, contact);
					setContacts(Array.from(contactsMap.values()));
				},
				(err) => {
					console.error('Erro ao buscar mensagens não lidas:', err);
				}
			);

			unsubscribeFunctions.push(unsubscribeLastMessage, unsubscribeUnread);
		});

		setIsLoading(false);

		return () => {
			unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
		};
	}, [firebaseUser?.uid, nearbyUsers]);

	return {
		contacts,
		isLoading,
	};
}

