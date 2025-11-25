/**
 * Schema do banco de dados local (SQLite)
 * Define a estrutura das tabelas e índices
 */

export interface MessageRow {
	id: string; // ID do Firestore (PRIMARY KEY)
	chatId: string; // ID da conversa
	senderId: string; // ID do remetente
	receiverId: string; // ID do destinatário
	text: string; // Mensagem descriptografada
	encryptedText: string | null; // Mensagem criptografada (backup)
	timestamp: number; // Timestamp em ms
	read: number; // 0 ou 1 (boolean)
	viewedAt: number | null; // Timestamp ou NULL
	createdAt: number | null; // Timestamp do Firestore
	updatedAt: number | null; // Timestamp do Firestore
	syncedAt: number | null; // Última sincronização com Firestore
	isLocal: number; // 0 ou 1 (mensagem ainda não sincronizada)
}

export const SCHEMA_VERSION = 1;

export const CREATE_MESSAGES_TABLE = `
CREATE TABLE IF NOT EXISTS messages (
	id TEXT PRIMARY KEY,
	chatId TEXT NOT NULL,
	senderId TEXT NOT NULL,
	receiverId TEXT NOT NULL,
	text TEXT NOT NULL,
	encryptedText TEXT,
	timestamp INTEGER NOT NULL,
	read INTEGER NOT NULL DEFAULT 0,
	viewedAt INTEGER,
	createdAt INTEGER,
	updatedAt INTEGER,
	syncedAt INTEGER,
	isLocal INTEGER NOT NULL DEFAULT 0
);
`;

export const CREATE_MESSAGES_INDEXES = [
	// Índice para queries de chat ordenadas por timestamp
	`CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chatId, timestamp DESC);`,
	// Índice para mensagens não lidas
	`CREATE INDEX IF NOT EXISTS idx_messages_chat_receiver_read ON messages(chatId, receiverId, read);`,
	// Índice para mensagens locais não sincronizadas
	`CREATE INDEX IF NOT EXISTS idx_messages_is_local ON messages(isLocal) WHERE isLocal = 1;`,
];

export const DROP_MESSAGES_TABLE = `DROP TABLE IF EXISTS messages;`;

