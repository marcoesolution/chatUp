/**
 * Script para limpar todas as mensagens do banco local (SQLite)
 * Executa imediatamente sem confirmação
 */

import { clearAllMessages, initDatabase } from "../src/core/database/index";

async function main() {
	try {
		console.log("🚀 Inicializando banco de dados...");
		await initDatabase();
		
		console.log("🗑️  Limpando todas as mensagens locais...");
		await clearAllMessages();
		
		console.log("✅ Limpeza concluída com sucesso!");
	} catch (error) {
		console.error("❌ Erro ao limpar mensagens:", error);
		process.exit(1);
	}
}

main();

