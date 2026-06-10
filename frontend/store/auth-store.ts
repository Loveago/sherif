'use client';

import { create } from 'zustand';
import type { User } from '@/lib/types';

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
};

const TOKEN_KEY = 'datahub_token';
const USER_KEY = 'datahub_user';

const readStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { token: null, user: null as User | null };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const userString = localStorage.getItem(USER_KEY);

  if (!token || !userString) {
    return { token: null, user: null as User | null };
  }

  try {
    return {
      token,
      user: JSON.parse(userString) as User,
    };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null as User | null };
  }
};

const initialAuth = readStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  token: initialAuth.token,
  user: initialAuth.user,
  setAuth: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    set({ token, user });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    set({ token: null, user: null });
  },
}));

export const hydrateAuthStore = () => {
  const auth = readStoredAuth();
  useAuthStore.setState(auth);
};
