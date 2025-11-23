/**
 * Funções utilitárias compartilhadas
 */

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
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return dateObj.toLocaleDateString('pt-BR');
  }
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Validação de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formata um nome completo para exibir apenas o primeiro nome e a inicial do último sobrenome
 * Exemplos:
 * - "Marco Aurelio Guimaraes" → "Marco G"
 * - "João Silva" → "João S"
 * - "Maria" → "Maria" (se só tiver um nome)
 * 
 * @param fullName Nome completo a ser formatado
 * @returns Nome formatado com primeiro nome + inicial do último sobrenome
 */
export function formatShortName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }

  // Remove espaços extras e divide em partes
  const parts = fullName.trim().split(/\s+/).filter(part => part.length > 0);

  // Se só tiver um nome, retorna ele mesmo
  if (parts.length === 1) {
    return parts[0];
  }

  // Se tiver mais de um nome, pega o primeiro e a inicial do último
  const firstName = parts[0];
  const lastSurname = parts[parts.length - 1];
  const lastInitial = lastSurname.charAt(0).toUpperCase();

  return `${firstName} ${lastInitial}`;
}

