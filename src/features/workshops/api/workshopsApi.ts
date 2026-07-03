import { api } from '../../../api/client';
import type {
  PaginatedResponse, ScheduledWorkshop, ScheduledWorkshopState,
  Workshop, WorkshopParticipant, WorkshopSchedule,
} from '../../../api/types';

export type BasicPerson = {
  tipoDocumento: 'dni' | 'pasaporte' | 'carnet_extranjeria' | 'otro';
  numeroDocumento: string; nombres: string; apellidoPaterno: string;
  apellidoMaterno?: string; correo?: string; telefono?: string;
};
export type WorkshopResponsible = {
  id: string; numeroDocumento: string; nombres: string;
  apellidoPaterno: string; apellidoMaterno: string | null;
};
export const getWorkshops = async (params?: { page?: number; pageSize?: number; search?: string }) =>
  (await api.get<PaginatedResponse<Workshop>>('/talleres', { params })).data;
export const createWorkshop = async (input: { codigo: string; nombre: string; descripcion?: string }) =>
  (await api.post<Workshop>('/talleres', input)).data;
export const updateWorkshop = async (id: string, input: { nombre?: string; descripcion?: string | null }) =>
  (await api.patch<Workshop>(`/talleres/${id}`, input)).data;
export const getWorkshopResponsibles = async (params?: { page?: number; pageSize?: number; search?: string }) =>
  (await api.get<PaginatedResponse<WorkshopResponsible>>('/talleres/responsables', { params })).data;
export const getScheduledWorkshops = async (params?: { page?: number; pageSize?: number; estado?: ScheduledWorkshopState }) =>
  (await api.get<PaginatedResponse<ScheduledWorkshop>>('/talleres-programados', { params })).data;
export type ScheduledWorkshopPayload = {
  tallerId: string; responsablePersonaId?: string; responsable?: BasicPerson;
  fechaInicio: string; fechaFin: string; modalidad: 'presencial' | 'virtual' | 'hibrido';
  ubicacion: string; costo?: string | null; cupoMaximo: number; horarios: WorkshopSchedule[];
};
export const createScheduledWorkshop = async (input: ScheduledWorkshopPayload) =>
  (await api.post('/talleres-programados', input)).data;
export const changeScheduledWorkshopState = async (id: string, estado: ScheduledWorkshopState, motivo?: string) =>
  (await api.patch(`/talleres-programados/${id}/estado`, { estado, motivo })).data;
export const getWorkshopParticipants = async (id: string) =>
  (await api.get<PaginatedResponse<WorkshopParticipant>>(`/talleres-programados/${id}/participantes`, { params: { pageSize: 100 } })).data;
export const enrollWorkshopParticipant = async (id: string, input: { personaId?: string; person?: BasicPerson }) =>
  (await api.post(`/talleres-programados/${id}/inscripciones`, input)).data;
export const changeWorkshopParticipantState = async (id: string, estado: 'activa' | 'retirada', motivo: string) =>
  (await api.patch(`/inscripciones-taller/${id}/estado`, { estado, motivo })).data;
