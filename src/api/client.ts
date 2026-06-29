import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearSession, readSession, writeSession } from '../lib/session';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL });
const refreshClient = axios.create({ baseURL });

let refreshPromise: Promise<string> | null = null;

function addAuthorization(config: InternalAxiosRequestConfig) {
  const accessToken = readSession()?.accessToken;
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
}

api.interceptors.request.use(addAuthorization);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const session = readSession();
    if (error.response?.status !== 401 || !request || request._retried || !session) {
      return Promise.reject(error);
    }

    request._retried = true;
    refreshPromise ??= refreshClient
      .post<{ accessToken: string; refreshToken: string; expiresAt?: number }>('/auth/refresh', {
        refreshToken: session.refreshToken,
      })
      .then(({ data }) => {
        writeSession(data);
        return data.accessToken;
      })
      .catch((refreshError: unknown) => {
        clearSession();
        window.dispatchEvent(new Event('sicac:unauthorized'));
        throw refreshError;
      })
      .finally(() => {
        refreshPromise = null;
      });

    const accessToken = await refreshPromise;
    request.headers.Authorization = `Bearer ${accessToken}`;
    return api(request);
  },
);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}
