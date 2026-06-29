import { api } from '../../../api/client';
import type { AuthProfile, LoginResponse } from '../../../api/types';

export async function loginWithDocument(input: { dni: string; password: string }) {
  const { data } = await api.post<LoginResponse>('/auth/login', input);
  return data;
}

export async function getCurrentProfile() {
  const { data } = await api.get<AuthProfile>('/auth/me');
  return data;
}

export async function changePassword(nuevaClave: string) {
  await api.post('/auth/cambiar-clave', { nuevaClave });
}
