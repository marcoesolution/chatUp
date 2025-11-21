import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/api/axiosClient';
import type { Profile, UpdateProfileData } from '../types';
import { useRefreshOnFocus } from '@/core/hooks/useRefreshOnFocus';

/**
 * Hook para buscar o perfil do usuário
 */
export function useProfile(userId?: string) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error, refetch } = useQuery<Profile>({
    queryKey: ['profile', userId || 'me'],
    queryFn: async () => {
      const endpoint = userId ? `/profile/${userId}` : '/profile/me';
      const response = await axiosInstance.get<Profile>(endpoint);
      return response.data;
    },
    enabled: true,
  });

  useRefreshOnFocus(refetch);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await axiosInstance.put<Profile>('/profile/me', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data);
      // Invalidar outras queries relacionadas se necessário
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    profile: profile ?? null,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    refetch,
  };
}

