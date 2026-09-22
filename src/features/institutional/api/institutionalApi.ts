import { api } from '../../../api/client';
import type { PaginatedResponse } from '../../../api/types';

export type NewsPost = { id: string; titulo: string; contenido: string; estado: 'borrador' | 'publicada' | 'retirada'; fijada: boolean;
  publicadaAt: string | null; createdAt: string; imagenDocumentoId?: string | null; documentos: { id: string; nombreOriginal: string; titulo?: string | null }[] };
export type NewsInput = Pick<NewsPost, 'titulo' | 'contenido' | 'estado' | 'fijada'> & { documentoIds: string[]; imagenDocumentoId?: string | null };
export const getNewsImage = async (id: string) => (await api.get<{ url: string; expiresAt: string }>(`/noticias/${id}/imagen`)).data;
export const deleteNews = async (id: string) => { await api.delete(`/noticias/${id}`); };
export async function uploadNewsImage(file: File) {
  const body = new FormData(); body.append('archivo', file);
  return (await api.post<{ id: string }>('/noticias/imagenes', body)).data;
}
export const getNews = async (page: number, gestion: boolean) => (await api.get<PaginatedResponse<NewsPost>>('/noticias', { params: { page, pageSize: 12, gestion } })).data;
export const saveNews = async (input: NewsInput, id?: string) => id ? (await api.put(`/noticias/${id}`, input)).data : (await api.post('/noticias', input)).data;

export type PrivacyPolicy = { id: string; version: string; titulo: string; contenido: string; provisional: boolean; vigente: boolean; publicadaAt: string };
export type PrivacyStatus = { policy: PrivacyPolicy | null; accepted: boolean; acceptedAt: string | null };
export type PrivacyInput = Pick<PrivacyPolicy, 'version' | 'titulo' | 'contenido' | 'provisional'>;
export type PrivacyAcceptance = { personaId: string; politicaId: string; aceptadaAt: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string | null; version: string; titulo: string };
export const getPrivacyStatus = async () => (await api.get<PrivacyStatus>('/privacidad/vigente')).data;
export const acceptPrivacy = async (politicaId: string) => (await api.post('/privacidad/aceptaciones', { politicaId, acepto: true })).data;
export const publishPrivacy = async (input: PrivacyInput) => (await api.post('/privacidad/politicas', input)).data;
export const getPrivacyPolicies = async (page: number) => (await api.get<PaginatedResponse<PrivacyPolicy>>('/privacidad/politicas', { params: { page, pageSize: 10 } })).data;
export const getPrivacyAcceptances = async (page: number) => (await api.get<PaginatedResponse<PrivacyAcceptance>>('/privacidad/registro', { params: { page, pageSize: 20 } })).data;
