import { useAuthStore } from '@/store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly errors?: unknown,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  let payload: ApiEnvelope<T> | { message?: string } | null = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // Global session handling: if the backend rejects our token (expired or invalid),
    // clear the stale session and send the user back to the login page.
    if (
      response.status === 401 &&
      token &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/register')
    ) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const message = payload && 'message' in payload ? payload.message || 'Request failed' : 'Request failed';
    const errors = payload && 'errors' in payload ? (payload as { errors?: unknown }).errors : undefined;
    throw new ApiError(message, response.status, errors);
  }

  return (payload as ApiEnvelope<T>).data;
}
