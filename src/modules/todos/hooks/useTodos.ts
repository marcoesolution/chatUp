import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/api/axiosClient';
import type { Todo, CreateTodoData, UpdateTodoData } from '../types';
import { useRefreshOnFocus } from '@/core/hooks/useRefreshOnFocus';

/**
 * Hook para buscar todas as tarefas
 */
export function useTodos() {
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading, error, refetch } = useQuery<Todo[]>({
    queryKey: ['todos'],
    queryFn: async () => {
      const response = await axiosInstance.get<Todo[]>('/todos');
      return response.data;
    },
  });

  useRefreshOnFocus(refetch);

  const createTodoMutation = useMutation({
    mutationFn: async (data: CreateTodoData) => {
      const response = await axiosInstance.post<Todo>('/todos', data);
      return response.data;
    },
    onSuccess: (newTodo) => {
      // Atualização otimista: adicionar o novo todo ao cache
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos = []) => [
        ...oldTodos,
        newTodo,
      ]);
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTodoData }) => {
      const response = await axiosInstance.put<Todo>(`/todos/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedTodo) => {
      // Atualização otimista: atualizar o todo no cache
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos = []) =>
        oldTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
      );
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/todos/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Atualização otimista: remover o todo do cache
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos = []) =>
        oldTodos.filter((todo) => todo.id !== deletedId)
      );
    },
  });

  return {
    todos,
    isLoading,
    error,
    createTodo: createTodoMutation.mutate,
    updateTodo: updateTodoMutation.mutate,
    deleteTodo: deleteTodoMutation.mutate,
    isCreating: createTodoMutation.isPending,
    isUpdating: updateTodoMutation.isPending,
    isDeleting: deleteTodoMutation.isPending,
    refetch,
  };
}

/**
 * Hook para buscar uma tarefa específica
 */
export function useTodo(id: string) {
  const queryClient = useQueryClient();

  const { data: todo, isLoading, error, refetch } = useQuery<Todo>({
    queryKey: ['todos', id],
    queryFn: async () => {
      const response = await axiosInstance.get<Todo>(`/todos/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  useRefreshOnFocus(refetch);

  const updateTodoMutation = useMutation({
    mutationFn: async (data: UpdateTodoData) => {
      const response = await axiosInstance.put<Todo>(`/todos/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedTodo) => {
      queryClient.setQueryData(['todos', id], updatedTodo);
      // Invalidar a lista de todos para refletir a mudança
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return {
    todo: todo ?? null,
    isLoading,
    error,
    updateTodo: updateTodoMutation.mutate,
    isUpdating: updateTodoMutation.isPending,
    refetch,
  };
}

