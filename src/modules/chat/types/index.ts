/**
 * Tipos relacionados ao módulo de chat
 */

export interface Contact {
	id: string;
	name: string;
	avatar?: string;
	unreadCount: number;
	lastMessage?: string;
	lastMessageTime?: string;
}

export interface Message {
	id: string;
	chatId: string; // ID da conversa (combinação ordenada dos IDs dos usuários)
	senderId: string; // ID do usuário que enviou
	receiverId: string; // ID do usuário que recebeu
	text: string;
	timestamp: Date;
	read: boolean;
	createdAt: any; // Timestamp do Firestore
	updatedAt?: any; // Timestamp do Firestore
}

export interface CreateMessageData {
	text: string;
	receiverId: string;
}

export interface Chat {
	id: string; // chatId
	participants: string[]; // IDs dos participantes [userId1, userId2] ordenados
	lastMessage?: Message;
	lastMessageTime?: Date;
	unreadCount?: number;
}

