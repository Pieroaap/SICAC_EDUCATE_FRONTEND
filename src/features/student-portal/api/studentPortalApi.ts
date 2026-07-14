import { api } from '../../../api/client';
export type PortalCourse = { cursoProgramadoId: string; cursoCodigo: string; cursoNombre: string; carreraNombre: string; periodoNombre: string; horarios: Array<{ dia: string; horaInicio: string; horaFin: string; modalidad: string; ubicacion: string }> };
export type PortalHistory = { id: string; cursoCodigo: string; cursoNombre: string; periodoNombre: string; notaFinal: string; letra: string; resultado: string };
export const getPortalStart = async () => (await api.get<{ cursosActivos: number; proximasEvaluaciones: Array<{ id: string; nombre: string; fechaProgramada: string }>; cursos: PortalCourse[] }>('/alumno/me/inicio')).data;
export const getPortalCourses = async () => (await api.get<PortalCourse[]>('/alumno/me/cursos')).data;
export const getPortalHistory = async () => (await api.get<PortalHistory[]>('/alumno/me/historial')).data;
export const getPortalWorkshops = async () => (await api.get<Array<{ id: string; nombre: string; estado: string; fechaInicio: string; modalidad: string; ubicacion: string }>>('/alumno/me/talleres')).data;
export const getPortalDocuments = async () => (await api.get<Array<{ id: string; nombreOriginal: string; tipo: string }>>('/alumno/me/documentos')).data;
export const getPortalAttendance = async () => (await api.get<Array<{ id: string; fecha: string; estado: string }>>('/alumno/me/asistencia')).data;
