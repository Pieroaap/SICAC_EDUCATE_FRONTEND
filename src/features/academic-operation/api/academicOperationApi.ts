import { api } from '../../../api/client';
import type {
  CareerEnrollment,
  CourseEnrollment,
  PrerequisiteAuthorization,
  ScheduledCourse,
} from '../../../api/types';

export const getScheduledCourses = async (filters?: {
  carreraId?: string; periodoId?: string; profesorId?: string;
}) => (await api.get<ScheduledCourse[]>('/cursos-programados', { params: filters })).data;

export const createScheduledCourse = async (input: {
  planCursoId: string; periodoAcademicoId: string; profesorPersonaId: string; seccion: string;
}) => (await api.post<ScheduledCourse>('/cursos-programados', input)).data;

export const getEnrollments = async (filters?: {
  personaId?: string; carreraId?: string; periodoId?: string;
}) => (await api.get<CareerEnrollment[]>('/matriculas', { params: filters })).data;

export const createEnrollment = async (input: {
  personaId: string; carreraId: string; planCurricularId: string;
  periodoAcademicoId: string; fechaMatricula: string; costo?: string;
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
