import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setTokens: (access: string, refresh: string) => void;
  login: (user: User, access: string, refresh: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    set({ user });
  },

  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
    set({ accessToken: token });
  },

  setTokens: (access, refresh) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    set({ accessToken: access, refreshToken: refresh });
  },

  login: (user, access, refresh) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    set({ user, accessToken: access, refreshToken: refresh });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
