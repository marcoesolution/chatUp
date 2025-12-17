import api from './index';
import type { LoginCredentials, RegisterData, AuthResponse, CreateProfileData } from '@/modules/auth/types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Send email directly as 'email'
    const response = await api.post<AuthResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    return {
      user: response.data.user,
      token: (response.data as any).accessToken, // Map backend 'accessToken' to frontend 'token'
    };
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    // Send email directly as 'email'
    const response = await api.post<AuthResponse>('/auth/register', {
      email: data.email,
      password: data.password,
      displayName: data.name
    });
    // Register endpoint returns User, not AuthResponse. Manual mapping:
    return {
      user: {
        id: (response.data as any).id,
        email: (response.data as any).email,
        name: (response.data as any).displayName,
      },
      token: '', // No token returned on register yet. Auto-login handles getting token.
    };
  },

  updateProfile: async (userId: string, data: Partial<CreateProfileData>): Promise<any> => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },
};
