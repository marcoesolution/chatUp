import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/api/axiosClient";
import type { LoginCredentials, RegisterData, AuthResponse } from "../types";
import { storage } from "@/services";
import { useRefreshOnFocus } from "@/core/hooks/useRefreshOnFocus";

const AUTH_STORAGE_KEY = "@auth:token";
const USER_STORAGE_KEY = "@auth:user";

/**
 * Hook para verificar o status de autenticação
 */
export function useAuth() {
	const queryClient = useQueryClient();

	const { data: authData, refetch } = useQuery<AuthResponse["user"] | null>({
		queryKey: ["auth", "user"],
		queryFn: async () => {
			const token = await storage.getItem<string>(AUTH_STORAGE_KEY);
			const user = await storage.getItem<AuthResponse["user"]>(USER_STORAGE_KEY);

			if (!token || !user) {
				return null;
			}

			// Verificar se o token ainda é válido fazendo uma requisição
			try {
				const response = await axiosInstance.get("/auth/me", {
					headers: { Authorization: `Bearer ${token}` },
				});
				return response.data;
			} catch {
				// Token inválido, limpar storage
				await storage.removeItem(AUTH_STORAGE_KEY);
				await storage.removeItem(USER_STORAGE_KEY);
				return null;
			}
		},
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	useRefreshOnFocus(refetch);

	const loginMutation = useMutation({
		mutationFn: async (credentials: LoginCredentials) => {
			const response = await axiosInstance.post<AuthResponse>("/auth/login", credentials);
			return response.data;
		},
		onSuccess: async (data: AuthResponse) => {
			await storage.setItem(AUTH_STORAGE_KEY, data.token);
			await storage.setItem(USER_STORAGE_KEY, data.user);
			queryClient.setQueryData(["auth", "user"], data.user);
		},
	});

	const registerMutation = useMutation({
		mutationFn: async (data: RegisterData) => {
			const response = await axiosInstance.post<AuthResponse>("/auth/register", data);
			return response.data;
		},
		onSuccess: async (data: AuthResponse) => {
			await storage.setItem(AUTH_STORAGE_KEY, data.token);
			await storage.setItem(USER_STORAGE_KEY, data.user);
			queryClient.setQueryData(["auth", "user"], data.user);
		},
	});

	const logoutMutation = useMutation({
		mutationFn: async () => {
			await storage.removeItem(AUTH_STORAGE_KEY);
			await storage.removeItem(USER_STORAGE_KEY);
			queryClient.setQueryData(["auth", "user"], null);
		},
	});

	return {
		user: authData ?? null,
		isAuthenticated: !!authData,
		login: loginMutation.mutate,
		register: registerMutation.mutate,
		logout: logoutMutation.mutate,
		isLoading: loginMutation.isPending || registerMutation.isPending,
		isLoggingOut: logoutMutation.isPending,
	};
}
