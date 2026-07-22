import { api } from '../../../api/client';

export type PortalSchedule = {
  dia: string;
  horaInicio: string;
  horaFin: string;
  modalidad: string;
  ubicacion: string | null;
};

export type PortalCourse = {
  matriculaCursoId: string;
  cursoProgramadoId: string;
  cursoCodigo: string;
  cursoNombre: string;
  ciclo: number;
  carreraId: string;
  carreraNombre: string;
  periodoId: string;
  periodoNombre: string;
  periodoEstado: string;
  estado: string;
  horarios: PortalSchedule[];
};

export type PortalAssessment = {
  id: string;
  nombre: string;
  porcentaje: string;
  orden: number;
  tipo: string | null;
  fechaProgramada: string | null;
  fechaLimite: string | null;
  estado: string;
};

export type PortalHistory = {
  id: string;
  cursoCodigo: string;
  cursoNombre: string;
  periodoNombre: string;
  notaFinal: string;
  letra: string;
  resultado: string;
  escalaCodigo: string;
};

export type PortalAttendance = { id: string; fecha: string; estado: string };
export type PortalDocument = {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  tipo: string;
  ambito: string;
  createdAt: string;
};
export type PortalWorkshop = {
  id: string;
  nombre: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  modalidad: string;
  ubicacion: string;
  horarios: PortalSchedule[];
};
export type PortalFinalResult = {
  id: string;
  notaFinal: string;
  letra: string;
  resultado: string;
  escalaCodigo: string;
};
export type PortalCourseDetail = {
  course: PortalCourse;
  assessments: PortalAssessment[];
  attendance: PortalAttendance[];
  documents: PortalDocument[];
  finalResult: PortalFinalResult | null;
};

export const getPortalStart = async () => (await api.get<{
  cursosActivos: number;
  proximasEvaluaciones: PortalAssessment[];
  cursos: PortalCourse[];
}>('/alumno/me/inicio')).data;
export const getPortalCourses = async () => (await api.get<PortalCourse[]>('/alumno/me/cursos')).data;
export const getPortalCourse = async (courseId: string) => (
  await api.get<PortalCourseDetail>(`/alumno/me/cursos/${courseId}`)
).data;
export const getPortalHistory = async () => (await api.get<PortalHistory[]>('/alumno/me/historial')).data;
export const getPortalWorkshops = async () => (await api.get<PortalWorkshop[]>('/alumno/me/talleres')).data;
