/**
 * Dados mockados de contatos para desenvolvimento
 */
import type { Contact } from '../types';

export const mockContacts: Contact[] = [
	{
		id: '1',
		name: 'Ana Silva',
		avatar: undefined,
		unreadCount: 3,
		lastMessage: 'Oi, como você está?',
		lastMessageTime: '10:30',
	},
	{
		id: '2',
		name: 'Carlos Santos',
		avatar: undefined,
		unreadCount: 0,
		lastMessage: 'Vamos marcar aquela reunião?',
		lastMessageTime: '09:15',
	},
	{
		id: '3',
		name: 'Maria Oliveira',
		avatar: undefined,
		unreadCount: 5,
		lastMessage: 'Obrigada pela ajuda!',
		lastMessageTime: 'Ontem',
	},
	{
		id: '4',
		name: 'João Pereira',
		avatar: undefined,
		unreadCount: 1,
		lastMessage: 'Tudo certo por aqui',
		lastMessageTime: 'Ontem',
	},
	{
		id: '5',
		name: 'Fernanda Costa',
		avatar: undefined,
		unreadCount: 0,
		lastMessage: 'Até mais tarde!',
		lastMessageTime: '15/01',
	},
	{
		id: '6',
		name: 'Roberto Alves',
		avatar: undefined,
		unreadCount: 2,
		lastMessage: 'Preciso falar com você',
		lastMessageTime: '14/01',
	},
	{
		id: '7',
		name: 'Juliana Lima',
		avatar: undefined,
		unreadCount: 0,
		lastMessage: 'Perfeito, combinado!',
		lastMessageTime: '13/01',
	},
	{
		id: '8',
		name: 'Pedro Souza',
		avatar: undefined,
		unreadCount: 4,
		lastMessage: 'Quando podemos conversar?',
		lastMessageTime: '12/01',
	},
	{
		id: '9',
		name: 'Larissa Ferreira',
		avatar: undefined,
		unreadCount: 0,
		lastMessage: 'Obrigada!',
		lastMessageTime: '11/01',
	},
	{
		id: '10',
		name: 'Rafael Martins',
		avatar: undefined,
		unreadCount: 1,
		lastMessage: 'Entendi, valeu!',
		lastMessageTime: '10/01',
	},
];

