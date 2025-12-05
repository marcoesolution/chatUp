/**
 * Helper para executar operações criptográficas pesadas com indicador de loading
 * 
 * Usa o CryptoLoadingProvider para mostrar um modal de loading durante
 * operações PBKDF2 que podem demorar em produção (100k+ iterações)
 */

// Variável global para armazenar referência ao contexto de loading
// Será definida pelo hook useCryptoLoading quando o app inicializar
let cryptoLoadingContext: {
	showLoading: (message?: string) => void;
	hideLoading: () => void;
	isLoading: boolean;
} | null = null;

/**
 * Define o contexto de loading (chamado internamente pelo provider)
 */
export function setCryptoLoadingContext(context: {
	showLoading: (message?: string) => void;
	hideLoading: () => void;
	isLoading: boolean;
}) {
	cryptoLoadingContext = context;
}

/**
 * Executa uma operação criptográfica pesada com indicador de loading
 * 
 * @param operation - Função assíncrona a ser executada
 * @param message - Mensagem opcional para mostrar no loading
 * @returns Resultado da operação
 */
export async function withCryptoLoading<T>(
	operation: () => Promise<T>,
	message?: string
): Promise<T> {
	// Se estiver em desenvolvimento, não mostrar loading (operações são rápidas)
	if (__DEV__) {
		return operation();
	}

	// Se não houver contexto de loading, executar sem loading
	if (!cryptoLoadingContext) {
		console.warn('⚠️ CryptoLoadingContext não está disponível');
		return operation();
	}

	const startTime = Date.now();
	console.log('🔐 [CryptoLoading] Iniciando operação com loading...', { message });

	try {
		cryptoLoadingContext.showLoading(message);
		const result = await operation();
		const duration = Date.now() - startTime;
		console.log('✅ [CryptoLoading] Operação concluída com sucesso', { duration, message });
		return result;
	} catch (error) {
		const duration = Date.now() - startTime;
		console.error('❌ [CryptoLoading] Erro na operação', { duration, message, error });
		throw error;
	} finally {
		// Esconder loading imediatamente (sem delay)
		cryptoLoadingContext?.hideLoading();
		console.log('🔐 [CryptoLoading] Loading escondido');
	}
}
