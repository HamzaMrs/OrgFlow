import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL as string | undefined) ?? "/_/backend/api"
  : (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

export const api = axios.create({ baseURL });

const TOKEN_KEY = "orgflow.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response?.status === 401) {
      setToken(null);
    }
    return Promise.reject(err);
  },
);

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}
