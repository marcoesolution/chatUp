import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../mocks/queryClient';

/**
 * Wrapper para componentes em testes que precisam do QueryClientProvider
 */
export function renderWithQueryClient(ui: ReactElement) {
  const testQueryClient = createTestQueryClient();
  
  return {
    ...ui,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={testQueryClient}>
        {children}
      </QueryClientProvider>
    ),
  };
}

