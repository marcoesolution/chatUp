/**
 * Serviço de banco de dados local (expo-sqlite)
 * Gerencia operações de leitura/escrita no SQLite local
 */

import * as SQLite from "expo-sqlite";
import { SCHEMA_VERSION, CREATE_MESSAGES_TABLE, CREATE_MESSAGES_INDEXES, type MessageRow } from "./schema";
import { runMigrations } from "./migrations";
import type { Message } from "@/modules/chat/types";

const DB_NAME = "chatup.db";
let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Inicializa o banco de dados
 * Cria tabelas e índices se não existirem
 */
export async function initDatabase(): Promise<void> {
	if (isInitialized && dbInstance) {
		return;
	}

	try {
		dbInstance = await SQLite.openDatabaseAsync(DB_NAME);

		// Criar tabela de versão do schema
		await dbInstance.execAsync(`
			CREATE TABLE IF NOT EXISTS schema_version (
				version INTEGER PRIMARY KEY
			);
		`);

		// Verificar versão atual
		const versionResult = await dbInstance.getFirstAsync<{ version: number }>(
			"SELECT version FROM schema_version LIMIT 1;"
		);
		let currentVersion = 0;

		if (versionResult) {
			currentVersion = versionResult.version;
		}

		// Executar migrações
		const newVersion = await runMigrations(dbInstance, currentVersion);

		// Atualizar versão do schema
		if (newVersion > currentVersion) {
			if (currentVersion === 0) {
				await dbInstance.runAsync(`INSERT INTO schema_version (version) VALUES (${newVersion});`);
			} else {
				await dbInstance.runAsync(`UPDATE schema_version SET version = ${newVersion};`);
			}
		}

		isInitialized = true;
		console.log("✅ Banco de dados local inicializado com sucesso");
	} catch (error) {
		console.error("❌ Erro ao inicializar banco de dados:", error);
		throw error;
	}
}

/**
 * Obtém instância do banco de dados
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
	if (!dbInstance) {
		await initDatabase();
	}
	if (!dbInstance) {
		throw new Error("Banco de dados não inicializado");
	}
	return dbInstance;
}

/**
 * Busca mensagens de um chat específico
 */
export async function getMessages(chatId: string, limit: number = 15, offset: number = 0): Promise<Message[]> {
	const db = await getDb();

	try {
		const result = await db.getAllAsync<MessageRow>(
			`
			SELECT * FROM messages
			WHERE chatId = ?
			ORDER BY timestamp ASC
			LIMIT ? OFFSET ?
		`,
			[chatId, limit, offset]
		);

		if (!result || result.length === 0) {
			return [];
		}

		return result.map((row) => ({
			id: row.id,
			chatId: row.chatId,
			senderId: row.senderId,
			receiverId: row.receiverId,
			text: row.text,
			timestamp: new Date(row.timestamp),
			read: row.read === 1,
			viewedAt: row.viewedAt ? new Date(row.viewedAt) : null,
			createdAt: row.createdAt ? new Date(row.createdAt) : null,
			updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
		}));
	} catch (error) {
		console.error("❌ Erro ao buscar mensagens:", error);
		return [];
	}
}

/**
 * Insere uma mensagem no banco local
 */
export async function insertMessage(
	message: Omit<Message, "id"> & { id?: string; encryptedText?: string; isLocal?: boolean }
): Promise<string> {
	const db = await getDb();

	try {
		const messageId = message.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const timestamp = message.timestamp.getTime();
		const createdAt = message.createdAt
			? message.createdAt instanceof Date
				? message.createdAt.getTime()
				: message.createdAt
			: timestamp;
		const updatedAt = message.updatedAt
			? message.updatedAt instanceof Date
				? message.updatedAt.getTime()
				: message.updatedAt
			: timestamp;
		const viewedAt = message.viewedAt ? (message.viewedAt instanceof Date ? message.viewedAt.getTime() : null) : null;

		await db.runAsync(
			`
			INSERT OR REPLACE INTO messages (
				id, chatId, senderId, receiverId, text, encryptedText,
				timestamp, read, viewedAt, createdAt, updatedAt, syncedAt, isLocal
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			[
				messageId,
				message.chatId,
				message.senderId,
				message.receiverId,
				message.text,
				message.encryptedText || null,
				timestamp,
				message.read ? 1 : 0,
				viewedAt,
				createdAt,
				updatedAt,
				message.isLocal ? null : Date.now(), // syncedAt só se não for local
				message.isLocal ? 1 : 0,
			]
		);

		return messageId;
	} catch (error) {
		console.error("❌ Erro ao inserir mensagem:", error);
		throw error;
	}
}

/**
 * Atualiza uma mensagem existente
 */
export async function updateMessage(id: string, updates: Partial<MessageRow>): Promise<void> {
	const db = await getDb();

	try {
		const fields: string[] = [];
		const values: any[] = [];

		if (updates.text !== undefined) {
			fields.push("text = ?");
			values.push(updates.text);
		}
		if (updates.read !== undefined) {
			fields.push("read = ?");
			values.push(updates.read);
		}
		if (updates.viewedAt !== undefined) {
			fields.push("viewedAt = ?");
			values.push(updates.viewedAt);
		}
		if (updates.syncedAt !== undefined) {
			fields.push("syncedAt = ?");
			values.push(updates.syncedAt);
		}
		if (updates.isLocal !== undefined) {
			fields.push("isLocal = ?");
			values.push(updates.isLocal);
		}
		if (updates.id !== undefined && updates.id !== id) {
			// Se o ID mudou, precisamos fazer DELETE + INSERT
			const oldResult = await db.getFirstAsync<MessageRow>("SELECT * FROM messages WHERE id = ?", [id]);
			if (oldResult) {
				// Deletar antiga
				await db.runAsync("DELETE FROM messages WHERE id = ?", [id]);
				// Inserir com novo ID
				await db.runAsync(
					`
					INSERT INTO messages (
						id, chatId, senderId, receiverId, text, encryptedText,
						timestamp, read, viewedAt, createdAt, updatedAt, syncedAt, isLocal
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
					[
						updates.id,
						oldResult.chatId,
						oldResult.senderId,
						oldResult.receiverId,
						oldResult.text,
						oldResult.encryptedText,
						oldResult.timestamp,
						oldResult.read,
						oldResult.viewedAt,
						oldResult.createdAt,
						oldResult.updatedAt,
						updates.syncedAt !== undefined ? updates.syncedAt : oldResult.syncedAt,
						updates.isLocal !== undefined ? updates.isLocal : oldResult.isLocal,
					]
				);
				return;
			}
		}

		if (fields.length === 0) {
			return;
		}

		// Atualização normal
		values.push(id);
		await db.runAsync(`UPDATE messages SET ${fields.join(", ")} WHERE id = ?`, values);
	} catch (error) {
		console.error("❌ Erro ao atualizar mensagem:", error);
		throw error;
	}
}

/**
 * Marca mensagens como lidas
 */
export async function markAsRead(chatId: string, receiverId: string): Promise<void> {
	const db = await getDb();

	try {
		await db.runAsync(
			`
			UPDATE messages
			SET read = 1, updatedAt = ?
			WHERE chatId = ? AND receiverId = ? AND read = 0
		`,
			[Date.now(), chatId, receiverId]
		);
	} catch (error) {
		console.error("❌ Erro ao marcar mensagens como lidas:", error);
		throw error;
	}
}

/**
 * Obtém timestamp da última sincronização de um chat
 */
export async function getLastSyncTimestamp(chatId: string): Promise<number | null> {
	const db = await getDb();

	try {
		const result = await db.getFirstAsync<{ lastSync: number }>(
			`
			SELECT MAX(syncedAt) as lastSync FROM messages
			WHERE chatId = ? AND syncedAt IS NOT NULL
		`,
			[chatId]
		);

		if (result && result.lastSync) {
			return result.lastSync;
		}

		return null;
	} catch (error) {
		console.error("❌ Erro ao buscar último timestamp de sincronização:", error);
		return null;
	}
}

/**
 * Obtém mensagens locais não sincronizadas
 */
export async function getPendingMessages(): Promise<MessageRow[]> {
	const db = await getDb();

	try {
		const result = await db.getAllAsync<MessageRow>(`
			SELECT * FROM messages
			WHERE isLocal = 1
			ORDER BY timestamp ASC
		`);

		if (!result || result.length === 0) {
			return [];
		}

		return result;
	} catch (error) {
		console.error("❌ Erro ao buscar mensagens pendentes:", error);
		return [];
	}
}

/**
 * Obtém lista de chatIds únicos do banco local
 */
export async function getChatIds(): Promise<string[]> {
	const db = await getDb();

	try {
		const result = await db.getAllAsync<{ chatId: string }>(`
			SELECT DISTINCT chatId FROM messages
			ORDER BY MAX(timestamp) DESC
		`);

		if (!result || result.length === 0) {
			return [];
		}

		return result.map((row) => row.chatId);
	} catch (error) {
		console.error("❌ Erro ao buscar chatIds:", error);
		return [];
	}
}

/**
 * Limpa todas as mensagens do banco (útil para testes/logout)
 */
export async function clearAllMessages(): Promise<void> {
	const db = await getDb();

	try {
		await db.runAsync("DELETE FROM messages;");
		console.log("✅ Todas as mensagens foram removidas do banco local");
	} catch (error) {
		console.error("❌ Erro ao limpar mensagens:", error);
		throw error;
	}
}
