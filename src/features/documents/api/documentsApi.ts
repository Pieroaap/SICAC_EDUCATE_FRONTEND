import { api } from '../../../api/client';
import type { PaginatedResponse } from '../../../api/types';

export type AcademicDocument = { id: string; nombreOriginal: string; titulo?: string | null; tipo: string; ambito: string; mimeType: string; tamanoBytes: number; createdAt: string };

export async function listDocuments() {
  return (await api.get<PaginatedResponse<AcademicDocument>>('/documentos')).data;
}
export async function uploadDocument(file: File, tipo = 'OTRO') {
  const body = new FormData(); body.append('archivo', file); body.append('tipo', tipo); body.append('ambito', 'INSTITUCION');
  return (await api.post('/documentos', body)).data;
}
export async function downloadDocument(id: string) {
  const { data } = await api.post<{ url: string }>(`/documentos/${id}/url-descarga`);
  window.open(data.url, '_blank', 'noopener,noreferrer');
}
export async function removeDocument(id: string) { await api.delete(`/documentos/${id}`); }
