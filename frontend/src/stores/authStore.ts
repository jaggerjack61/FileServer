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

const sessionKeys = ['user', 'accessToken', 'refreshToken'] as const;

function safeGetItem(key: (typeof sessionKeys)[number]) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: (typeof sessionKeys)[number], value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The in-memory session can still work when browser storage is unavailable.
  }
}

function safeRemoveItem(key: (typeof sessionKeys)[number]) {
  try {
    localStorage.removeItem(key);
  } catch {
    // There is nothing else to clear when browser storage is unavailable.
  }
}

export function clearStoredSession() {
  sessionKeys.forEach(safeRemoveItem);
}

export function readStoredUser(): User | null {
  const storedUser = safeGetItem('user');
  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser) as Partial<User> | null;
    const isValidUser =
      user !== null &&
      typeof user === 'object' &&
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.username === 'string' &&
      (user.role === 'admin' || user.role === 'user');

    if (!isValidUser) {
      clearStoredSession();
      return null;
    }

    return user as User;
  } catch {
    clearStoredSession();
    return null;
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: readStoredUser(),
  accessToken: safeGetItem('accessToken'),
  refreshToken: safeGetItem('refreshToken'),

  setUser: (user) => {
    if (user) {
      safeSetItem('user', JSON.stringify(user));
    } else {
      safeRemoveItem('user');
    }
    set({ user });
  },

  setAccessToken: (token) => {
    if (token) {
      safeSetItem('accessToken', token);
    } else {
      safeRemoveItem('accessToken');
    }
    set({ accessToken: token });
  },

  setTokens: (access, refresh) => {
    safeSetItem('accessToken', access);
    safeSetItem('refreshToken', refresh);
    set({ accessToken: access, refreshToken: refresh });
  },

  login: (user, access, refresh) => {
    safeSetItem('user', JSON.stringify(user));
    safeSetItem('accessToken', access);
    safeSetItem('refreshToken', refresh);
    set({ user, accessToken: access, refreshToken: refresh });
  },

  logout: () => {
    clearStoredSession();
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
