/**
 * Hook para buscar informações de contatos (contagem de não lidas)
 */

import { useState, useEffect } from 'react';
import {
	collection,
	query,
	where,
	onSnapshot,
	QuerySnapshot,
	DocumentData,
} from 'firebase/firestore';
import { db } from '@/core/firebase';
import { useAuth } from '@/modules/auth';
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
 * Retorna contatos com contagem de mensagens não lidas
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

		// Buscar apenas contagem de não lidas para cada contato
		const unsubscribeFunctions: (() => void)[] = [];

		nearbyUsers.forEach((nearbyUser) => {
			const chatId = generateChatId(currentUserId, nearbyUser.id);

			// Buscar mensagens não lidas
			const unreadQuery = query(
				collection(firestoreDb, 'messages'),
				where('chatId', '==', chatId),
				where('receiverId', '==', currentUserId),
				where('read', '==', false)
			);

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

			unsubscribeFunctions.push(unsubscribeUnread);
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

