import api from './index';
import type { UserProfile } from '@/modules/auth/types';

export const userService = {
  getUserById: async (userId: string): Promise<UserProfile> => {
    const response = await api.get<UserProfile>(`/users/${userId}`);
    return response.data;
  },
};
