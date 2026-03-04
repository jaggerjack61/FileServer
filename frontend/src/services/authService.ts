import api from '@/lib/axios';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types';

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login/', payload);
    return data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register/', payload);
    return data;
  },

  logout: async (refresh: string): Promise<void> => {
    await api.post('/auth/logout/', { refresh });
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const { data } = await api.post<{ access: string }>('/auth/refresh/', { refresh });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me/');
    return data;
  },
};
