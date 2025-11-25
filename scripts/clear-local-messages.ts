/**
 * Script para limpar todas as mensagens do banco local (SQLite)
 * 
 * Este script apaga TODAS as mensagens armazenadas localmente no SQLite
 * Útil quando você deletou mensagens no Firestore e quer sincronizar o banco local
 * 
 * Uso:
 *   npx ts-node scripts/clear-local-messages.ts
 * 
 * Ou com confirmação:
 *   npx ts-node scripts/clear-local-messages.ts --confirm
 */

import { clearAllMessages, clearChatMessages, initDatabase } from "../src/core/database/index";

/**
 * Limpa todas as mensagens do banco local
 */
async function clearLocalMessages(confirm: boolean = false, chatId?: string): Promise<void> {
	if (!confirm) {
		console.log('⚠️  ATENÇÃO: Este script vai apagar mensagens do banco local (SQLite)!');
		if (chatId) {
			console.log(`⚠️  Chat específico: ${chatId}`);
		} else {
			console.log('⚠️  TODAS as mensagens serão apagadas!');
		}
		console.log('⚠️  Para confirmar, execute: npx ts-node scripts/clear-local-messages.ts --confirm');
		if (chatId) {
			console.log(`⚠️  Ou para um chat específico: npx ts-node scripts/clear-local-messages.ts --chat ${chatId} --confirm`);
		}
		return;
	}

	console.log('🚀 Iniciando limpeza de mensagens do banco local...');
	console.log('');

	try {
		// Inicializar banco de dados
		await initDatabase();

		if (chatId) {
			// Limpar apenas um chat específico
			await clearChatMessages(chatId);
			console.log(`✅ Mensagens do chat ${chatId} foram removidas do banco local`);
		} else {
			// Limpar todas as mensagens
			await clearAllMessages();
			console.log('✅ Todas as mensagens foram removidas do banco local');
		}

		console.log('');
		console.log('✅ Limpeza concluída com sucesso!');
		console.log('💡 As mensagens serão sincronizadas novamente do Firestore quando você abrir os chats');
	} catch (error) {
		console.error('❌ Erro ao limpar mensagens:', error);
		throw error;
	}
}

// Executar script
const args = process.argv.slice(2);
const confirm = args.includes('--confirm') || args.includes('-y') || args.includes('--yes');
const chatIndex = args.indexOf('--chat');
const chatId = chatIndex >= 0 && args[chatIndex + 1] ? args[chatIndex + 1] : undefined;

clearLocalMessages(confirm, chatId)
	.then(() => {
		console.log('');
		console.log('✅ Script executado com sucesso!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Erro ao executar script:', error);
		process.exit(1);
	});

