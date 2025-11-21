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

