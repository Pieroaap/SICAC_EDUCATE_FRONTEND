import { api } from '../../../api/client';
import type {
  AcademicAct,
  EvaluationComponent,
  EvaluationCourse,
  Gradebook,
  PaginatedResponse,
  RegularAcademicHistoryItem,
} from '../../../api/types';

export async function getEvaluationCourses(input: {
  periodoId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const { data } = await api.get<PaginatedResponse<EvaluationCourse>>('/evaluacion/cursos', { params: input });
  return data;
}

export async function getGradebook(courseId: string) {
  const { data } = await api.get<Gradebook>(`/cursos-programados/${courseId}/libro-notas`);
  return data;
}

export async function saveEvaluationComponents(
  courseId: string,
  components: Array<{ id?: string; nombre: string; porcentaje: number; orden: number }>,
) {
  const { data } = await api.put<EvaluationComponent[]>(
    `/cursos-programados/${courseId}/componentes-evaluacion`,
    { components },
  );
  return data;
}

export async function saveCourseGrades(
  courseId: string,
  grades: Array<{
    componenteEvaluacionId: string;
    matriculaCursoProgramadoId: string;
    nota: number;
  }>,
) {
  const { data } = await api.put(`/cursos-programados/${courseId}/calificaciones`, { grades });
  return data;
}

export async function publishAcademicAct(courseId: string) {
  const { data } = await api.post<AcademicAct>(`/cursos-programados/${courseId}/acta/publicar`);
  return data;
}

export async function getAcademicAct(courseId: string) {
  const { data } = await api.get<AcademicAct>(`/cursos-programados/${courseId}/acta`);
  return data;
}

export async function getRegularAcademicHistory(personId: string, page = 1) {
  const { data } = await api.get<PaginatedResponse<RegularAcademicHistoryItem>>(
    `/alumnos/${personId}/historial-academico`,
    { params: { page, pageSize: 20 } },
  );
  return data;
}
