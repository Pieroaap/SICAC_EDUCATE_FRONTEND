import { api } from '../../../api/client';
import type { PaginatedResponse } from '../../../api/types';

export interface RecognitionCourse {
  id: string; planCurricularId: string; planNombre: string; cursoNombre: string;
  cursoCodigo: string; ciclo: number;
  estado: 'aprobado_regular' | 'aprobado_reconocido' | 'sin_aprobacion';
  prerrequisitoIds: string[];
}

export async function getRecognitionCourses(personaId: string): Promise<RecognitionCourse[]> {
  const data: RecognitionCourse[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = (await api.get<PaginatedResponse<RecognitionCourse>>('/antecedentes-academicos/malla', {
      params: { personaId, page, pageSize: 100 },
    })).data;
    data.push(...result.data);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return data;
}

export const recognizeCourses = async (input: {
  personaId: string; planCursoIds: string[]; periodoReferencial: string; observacion: string;
}) => (await api.post('/antecedentes-academicos/lote', input)).data;

export function prerequisiteChain(courses: RecognitionCourse[], targetId: string): Set<string> {
  const byId = new Map(courses.map((course) => [course.id, course]));
  const visited = new Set<string>([targetId]);
  const pending = [...(byId.get(targetId)?.prerrequisitoIds ?? [])];
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...(byId.get(id)?.prerrequisitoIds ?? []));
  }
  visited.delete(targetId);
  return visited;
}
