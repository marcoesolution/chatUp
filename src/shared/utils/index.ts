/**
 * Funções utilitárias compartilhadas
 */

import * as Updates from "expo-updates";

/**
 * Verifica se o app está rodando em modo desenvolvimento
 * Retorna true se estiver em __DEV__ ou se Updates não estiver habilitado
 * @returns true se estiver em modo desenvolvimento
 */
export function isDevMode(): boolean {
	return __DEV__ || !Updates.isEnabled;
}

/**
 * Debounce function para limitar chamadas de função
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};

		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}

/**
 * Formatação de data
 */
export function formatDate(date: string | Date, format: "short" | "long" = "short"): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;

	if (format === "short") {
		return dateObj.toLocaleDateString("pt-BR");
	}

	return dateObj.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

/**
 * Validação de email
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}
