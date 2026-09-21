import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

/**
 * The access token is kept in memory only (a module-level variable), never
 * in localStorage — that would be readable by any injected/XSS'd script.
 * The refresh token lives in an httpOnly cookie the browser sends
 * automatically (see backend/src/controllers/auth.controller.ts), so it's
 * never accessible to JS at all. Losing the in-memory token on a hard page
 * reload is expected and handled by silently calling /auth/refresh once on
 * app boot (see context/AuthContext.tsx).
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send the httpOnly refresh cookie
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Queues concurrent requests that 401 while a single refresh is in flight,
// so a page that fires 5 requests at once doesn't trigger 5 refresh calls.
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config;
    // Don't intercept 401s from the refresh endpoint itself, or we'll deadlock!
    if (
      error.response?.status === 401 &&
      original &&
      original.url !== '/auth/refresh' &&
      !(original as any)._retried
    ) {
      (original as any)._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post('/auth/refresh')
            .then((res) => {
              const token = res.data.accessToken as string;
              setAccessToken(token);
              return token;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const token = await refreshPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api.request(original);
      } catch {
        setAccessToken(null);
        window.location.href = '/login';
      }
    }
    
    if (error.response && error.response.status !== 401) {
      const msg = apiErrorMessage(error);
      toast.error(msg, { id: msg });
    }
    
    return Promise.reject(error);
  }
);

/** Extracts a human-readable message from our backend's error shape. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as any)?.error?.message ?? fallback;
  }
  return fallback;
}
