import { api } from '../../../api/client';
import type { PaginatedResponse } from '../../../api/types';
export type Eligibility = { id: string; personaId: string; cicloOrigen: number; cicloDestino: number | null; estado: string; evaluadaAt: string };
export type PreEnrollment = { id: string; estado: string; periodoDestinoId: string | null; cursos: Array<{ id: string; estado: string }> };
export const listEligibilities = async () => (await api.get<PaginatedResponse<Eligibility>>('/promociones/habilitaciones')).data;
export const listPreEnrollments = async () => (await api.get<PaginatedResponse<PreEnrollment>>('/preinscripciones')).data;
export const recalculate = async (personaId: string) => (await api.post('/promociones/recalcular', { personaId })).data;
export const confirmPreEnrollment = async (id: string) => (await api.post(`/preinscripciones/${id}/confirmar`)).data;
export const cancelPreEnrollment = async (id: string) => (await api.patch(`/preinscripciones/${id}/estado`, { estado: 'cancelada' })).data;
