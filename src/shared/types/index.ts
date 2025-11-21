/**
 * Tipos globais compartilhados entre módulos
 */

// Tipo genérico para respostas de API
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

// Tipo genérico para erros de API
export interface ApiError {
  message: string;
  code?: string | number;
  errors?: Record<string, string[]>;
}

// Tipo para usuário base
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipo para paginação
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

