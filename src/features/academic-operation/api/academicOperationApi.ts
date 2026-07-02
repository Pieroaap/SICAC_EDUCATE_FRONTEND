import { api } from '../../../api/client';
import type {
  CareerEnrollment,
  CourseEnrollment,
  PrerequisiteAuthorization,
  ScheduledCourse,
  ScheduledCourseCandidate,
  AcademicRecord,
  BulkEnrollmentCandidate,
  CareerRegistration,
  PaginatedResponse,
} from '../../../api/types';

export const getScheduledCourses = async (filters?: {
  carreraId?: string; periodoId?: string; profesorId?: string;
}) => (await api.get<ScheduledCourse[]>('/cursos-programados', { params: filters })).data;

export const createScheduledCourse = async (input: {
  planCursoId: string; periodoAcademicoId: string; profesorPersonaId: string;
}) => (await api.post<ScheduledCourse>('/cursos-programados', input)).data;

export const getEnrollments = async (filters?: {
  personaId?: string; carreraId?: string; periodoId?: string;
}) => (await api.get<CareerEnrollment[]>('/matriculas', { params: filters })).data;

export const createEnrollment = async (input: {
  personaId: string; carreraId: string; planCurricularId: string;
  periodoAcademicoId: string;
}) => (await api.post('/matriculas/carrera', input)).data;

export const getEnrollmentCourses = async (id: string) =>
  (await api.get<CourseEnrollment[]>(`/matriculas/${id}/cursos`)).data;

export const enrollCourse = async (input: {
  matriculaCarreraId: string; cursoProgramadoId: string; fechaInscripcion: string;
}) => (await api.post('/matriculas/cursos', input)).data;

export const getAuthorizations = async (filters?: {
  estado?: PrerequisiteAuthorization['estado']; matriculaId?: string;
}) => (await api.get<PrerequisiteAuthorization[]>('/autorizaciones-prerrequisito', { params: filters })).data;

export const requestAuthorization = async (input: {
  matriculaCarreraId: string; cursoProgramadoId: string; motivo: string;
}) => (await api.post('/autorizaciones-prerrequisito', input)).data;

export const resolveAuthorization = async (
  id: string,
  estado: 'aprobada' | 'rechazada',
) => (await api.patch(`/autorizaciones-prerrequisito/${id}/resolucion`, { estado })).data;

export const getScheduledCourseCandidates = async (id: string) =>
  (await api.get<ScheduledCourseCandidate[]>(`/cursos-programados/${id}/matriculados-periodo`)).data;

export const enrollCourseCandidates = async (id: string, matriculaIds: string[]) =>
  (await api.post<{ data: Array<{ matriculaId: string; success: boolean; message?: string }> }>(
    `/cursos-programados/${id}/alumnos`,
    { matriculaIds },
  )).data;

export const withdrawCourseStudent = async (id: string) =>
  (await api.patch(`/matriculas-cursos/${id}/estado`, { estado: 'retirado' })).data;

export const getCareerRegistrations = async (personaId: string) =>
  (await api.get<PaginatedResponse<CareerRegistration>>('/inscripciones-carrera', {
    params: { personaId, pageSize: 100 },
  })).data;

export const createCareerRegistration = async (input: {
  personaId: string; carreraId: string; planCurricularId: string;
  periodoInicioId: string;
}) => (await api.post<CareerRegistration>('/inscripciones-carrera', input)).data;

export const updateCareerRegistrationState = async (id: string, estado: 'activo' | 'inactivo') =>
  (await api.patch<CareerRegistration>(`/inscripciones-carrera/${id}/estado`, { estado })).data;

export const getAcademicRecords = async (personaId: string) =>
  (await api.get<PaginatedResponse<AcademicRecord>>('/antecedentes-academicos', {
    params: { personaId, pageSize: 100 },
  })).data;

export const createAcademicRecord = async (input: {
  personaId: string; planCursoId: string; fechaReferencial?: string;
  periodoReferencial?: string; observacion?: string; fuente: 'manual';
}) => (await api.post<AcademicRecord>('/antecedentes-academicos', input)).data;

export const getBulkEnrollmentCandidates = async (input: {
  carreraId: string; planCurricularId: string; periodoAcademicoId: string;
}) => (await api.get<PaginatedResponse<BulkEnrollmentCandidate>>('/matriculas/candidatos', {
  params: { ...input, pageSize: 100 },
})).data;

export const createBulkEnrollments = async (input: {
  personaIds: string[]; carreraId: string; planCurricularId: string; periodoAcademicoId: string;
}) => (await api.post('/matriculas/masiva', input)).data;
