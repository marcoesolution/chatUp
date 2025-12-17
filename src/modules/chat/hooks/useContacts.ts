/**
 * Hook para buscar informações de contatos (contagem de não lidas)
 */

import { useState, useEffect } from 'react';
import { getAllUnreadCounts } from '@/core/database';
import { socketService } from "@/services/api/socket.service";
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
		if (!firebaseUser || nearbyUsers.length === 0) {
			setContacts([]);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		const currentUserId = firebaseUser.uid;
        // Map references
		const contactsMap = new Map<string, Contact>();

        // Init base contacts
		nearbyUsers.forEach((user) => {
			contactsMap.set(user.id, {
				id: user.id,
				name: user.name,
				avatar: user.avatar,
				unreadCount: 0,
			});
		});

        // Fetch counts from SQLite
        getAllUnreadCounts(currentUserId).then((counts) => {
            nearbyUsers.forEach(user => {
                const chatId = generateChatId(currentUserId, user.id);
                // The query returns counts by chatId. 
                // We need to match chatId to user.
                if (counts[chatId]) {
                   const contact = contactsMap.get(user.id);
                   if (contact) {
                       contact.unreadCount = counts[chatId];
                   }
                }
            });
            setContacts(Array.from(contactsMap.values()));
            setIsLoading(false);
        });

        // Listen for new messages via Socket to increment real-time
        const handleNewMessage = (msg: any) => {
             // msg: { senderId, receiverId, ... }
             if (msg.receiverId === currentUserId) {
                 const senderId = msg.senderId;
                 setContacts(prev => prev.map(c => {
                     if (c.id === senderId) {
                         return { ...c, unreadCount: c.unreadCount + 1 };
                     }
                     return c;
                 }));
             }
        };

        socketService.onNewMessage(handleNewMessage);
        
        // Also listen if we sent a message? No, unread count is incoming. 
        // But if we read them? 
        // Syncing "Read Status" across devices is complex. 
        // Locally, if user enters chat, useMessages calls markAsRead.
        // But useContacts needs to know to decrement?
        // Maybe we just reload on focus? 
        // For now, this is simpler than Firestore listener.

		return () => {
			socketService.offNewMessage(); // Need to ensure offNewMessage removes specific listener or all?
            // SocketService implementation usually allows multiple listeners if using EventEmitter, 
            // OR checks implementation. strict `offNewMessage(cb)` is better.
		};
	}, [firebaseUser?.uid, nearbyUsers]);

	return {
		contacts,
		isLoading,
	};
}

