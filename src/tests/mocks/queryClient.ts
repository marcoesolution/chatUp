import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient mockado para testes
 * Desabilita retry automático e reduz tempos de stale/cache para testes mais rápidos
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

