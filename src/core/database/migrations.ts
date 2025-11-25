/**
 * Migrações do banco de dados
 * Gerencia versões do schema e atualizações
 */

import { SCHEMA_VERSION, CREATE_MESSAGES_TABLE, CREATE_MESSAGES_INDEXES } from "./schema";

import type * as SQLite from "expo-sqlite";

export interface Migration {
	version: number;
	up: (db: SQLite.SQLiteDatabase) => Promise<void>;
	down?: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

/**
 * Migração inicial - cria tabela de mensagens
 */
const migration_1: Migration = {
	version: 1,
	up: async (db) => {
		// Criar tabela de mensagens
		await db.execAsync(CREATE_MESSAGES_TABLE);

		// Criar índices
		for (const indexSql of CREATE_MESSAGES_INDEXES) {
			await db.execAsync(indexSql);
		}
	},
	down: async (db) => {
		await db.execAsync(`DROP TABLE IF EXISTS messages;`);
	},
};

export const migrations: Migration[] = [migration_1];

/**
 * Executa todas as migrações pendentes
 */
export async function runMigrations(db: any, currentVersion: number): Promise<number> {
	let version = currentVersion;

	for (const migration of migrations) {
		if (migration.version > version) {
			console.log(`🔄 Executando migração ${migration.version}...`);
			await migration.up(db);
			version = migration.version;
		}
	}

	return version;
}

