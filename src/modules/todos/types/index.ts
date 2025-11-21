/**
 * Tipos relacionados ao módulo de tarefas (Todos)
 */

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoData {
  title: string;
  description?: string;
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface TodoState {
  todos: Todo[];
  isLoading: boolean;
  error: Error | null;
}

