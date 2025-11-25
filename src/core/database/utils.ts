/**
 * Utilitários para gerenciamento do banco de dados local
 * Funções úteis para limpeza e manutenção
 */

import { clearAllMessages, clearChatMessages } from "./index";

/**
 * Limpa todas as mensagens do banco local
 * Útil quando você deletou mensagens no Firestore e quer sincronizar o banco local
 * 
 * Exemplo de uso no console do React Native:
 *   import { clearAllLocalMessages } from '@/core/database/utils';
 *   await clearAllLocalMessages();
 */
export async function clearAllLocalMessages(): Promise<void> {
	try {
		await clearAllMessages();
		console.log("✅ Todas as mensagens locais foram removidas");
		console.log("💡 As mensagens serão sincronizadas novamente do Firestore quando você abrir os chats");
	} catch (error) {
		console.error("❌ Erro ao limpar mensagens locais:", error);
		throw error;
	}
}

/**
 * Limpa mensagens de um chat específico do banco local
 * 
 * Exemplo de uso no console do React Native:
 *   import { clearChatLocalMessages } from '@/core/database/utils';
 *   await clearChatLocalMessages('chatId_aqui');
 */
export async function clearChatLocalMessages(chatId: string): Promise<void> {
	try {
		await clearChatMessages(chatId);
		console.log(`✅ Mensagens do chat ${chatId} foram removidas do banco local`);
		console.log("💡 As mensagens serão sincronizadas novamente do Firestore quando você abrir o chat");
	} catch (error) {
		console.error("❌ Erro ao limpar mensagens do chat:", error);
		throw error;
	}
}

