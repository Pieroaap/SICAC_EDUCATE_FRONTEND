import { api } from '../../../api/client';
import type { PaginatedResponse } from '../../../api/types';
export type CoursePost = { id: string; titulo: string; contenido: string; fijada: boolean; publicadaAt: string; archivos: Array<{ id: string; nombreOriginal: string }> };
export type CourseWallResponse = PaginatedResponse<CoursePost> & { course: { id: string; code: string; name: string; canWrite: boolean } };
export const getCourseWall = async (courseId: string) => (await api.get<CourseWallResponse>(`/cursos-programados/${courseId}/muro`)).data;
export const createCoursePost = async (courseId: string, input: { titulo: string; contenido: string; documentIds: string[] }) => (await api.post(`/cursos-programados/${courseId}/muro`, input)).data;
export async function uploadCourseAttachment(courseId: string, file: File) {
  const body = new FormData(); body.append('archivo', file); body.append('tipo', 'MATERIAL_ACADEMICO'); body.append('ambito', 'CURSO_PROGRAMADO'); body.append('contextId', courseId);
  return (await api.post<{ id: string }>('/documentos', body)).data;
}
export const updateCoursePost = async (id: string, input: { fijada: boolean }) => (await api.patch(`/publicaciones-curso/${id}`, input)).data;
export const removeCoursePost = async (id: string) => api.delete(`/publicaciones-curso/${id}`);
