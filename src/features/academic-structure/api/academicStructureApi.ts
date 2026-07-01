import { api } from '../../../api/client';
import type {
  AcademicPeriod,
  Career,
  Course,
  CurriculumPlan,
  PlanCourse,
} from '../../../api/types';

export type CatalogInput = {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
};
export type CourseInput = { codigo: string; nombre: string; tipo: 'obligatorio' | 'electivo' };

export type StatePatch = { estado?: 'activo' | 'inactivo' };

export async function getCareers() {
  const { data } = await api.get<Career[]>('/carreras');
  return data;
}

export async function createCareer(input: CatalogInput) {
  const { data } = await api.post<Career>('/carreras', input);
  return data;
}

export async function updateCareer(id: string, input: Partial<CatalogInput> & StatePatch) {
  const { data } = await api.patch<Career[]>(`/carreras/${id}`, input);
  return data[0];
}

export async function getCurriculumPlans() {
  const { data } = await api.get<CurriculumPlan[]>('/planes-curriculares');
  return data;
}

export async function createCurriculumPlan(input: {
  carreraId: string;
  codigo: string;
  nombre: string;
  version: string;
}) {
  const { data } = await api.post<CurriculumPlan>('/planes-curriculares', input);
  return data;
}

export async function updateCurriculumPlan(
  id: string,
  input: Partial<Pick<CurriculumPlan, 'nombre' | 'version' | 'estado'>>,
) {
  const { data } = await api.patch<CurriculumPlan[]>(`/planes-curriculares/${id}`, input);
  return data[0];
}

export async function getCourses() {
  const { data } = await api.get<Course[]>('/cursos');
  return data;
}

export async function createCourse(input: CourseInput) {
  const { data } = await api.post<Course>('/cursos', input);
  return data;
}

export async function updateCourse(id: string, input: Partial<CourseInput> & StatePatch) {
  const { data } = await api.patch<Course[]>(`/cursos/${id}`, input);
  return data[0];
}

export async function getPlanCourses() {
  const { data } = await api.get<PlanCourse[]>('/plan-cursos');
  return data;
}

export async function createPlanCourse(input: {
  planCurricularId: string;
  cursoId: string;
  ciclo: number;
  orden: number;
  prerequisiteIds: string[];
}) {
  const { data } = await api.post<PlanCourse>('/plan-cursos', input);
  return data;
}

export async function updatePlanCourse(
  id: string,
  input: Partial<Pick<PlanCourse, 'ciclo' | 'orden' | 'estado'>> & { prerequisiteIds: string[] },
) {
  const { data } = await api.patch<PlanCourse[]>(`/plan-cursos/${id}`, input);
  return data[0];
}

export async function getAcademicPeriods() {
  const { data } = await api.get<AcademicPeriod[]>('/periodos-academicos');
  return data;
}

export async function createAcademicPeriod(input: {
  anio: number;
  periodo: 'I' | 'II' | 'III';
  fechaInicio: string;
  fechaFin: string;
}) {
  const { data } = await api.post<AcademicPeriod[]>('/periodos-academicos', input);
  return data[0];
}

export async function updateAcademicPeriod(
  id: string,
  input: Partial<Pick<AcademicPeriod, 'anio' | 'periodo' | 'fechaInicio' | 'fechaFin' | 'estado'>>,
) {
  const { data } = await api.patch<AcademicPeriod[]>(`/periodos-academicos/${id}`, input);
  return data[0];
}
