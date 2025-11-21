import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodos } from '../useTodos';
import { axiosInstance } from '@/api/axiosClient';

// Mock do axios
jest.mock('@/api/axiosClient', () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTodos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch todos successfully', async () => {
    const mockTodos = [
      { id: '1', title: 'Test Todo', completed: false, userId: '1', createdAt: '', updatedAt: '' },
    ];

    (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockTodos });

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.todos).toEqual(mockTodos);
    expect(axiosInstance.get).toHaveBeenCalledWith('/todos');
  });

  it('should create a todo successfully', async () => {
    const newTodo = {
      id: '2',
      title: 'New Todo',
      completed: false,
      userId: '1',
      createdAt: '',
      updatedAt: '',
    };

    (axiosInstance.get as jest.Mock).mockResolvedValue({ data: [] });
    (axiosInstance.post as jest.Mock).mockResolvedValue({ data: newTodo });

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.createTodo({ title: 'New Todo' });

    await waitFor(() => {
      expect(axiosInstance.post).toHaveBeenCalledWith('/todos', { title: 'New Todo' });
    });
  });
});

