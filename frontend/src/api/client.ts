import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"
  : (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

export const api = axios.create({ 
  baseURL,
  withCredentials: true
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response?.status === 401) {
      // In a real app we could trigger a global event here to logout
      // For now we just reject
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
  return "Une erreur inattendue est survenue";
}
