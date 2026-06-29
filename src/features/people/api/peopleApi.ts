import { api } from '../../../api/client';
import type { PaginatedResponse, PersonListItem } from '../../../api/types';

export type PeopleFilters = {
  search?: string;
  estado?: 'activo' | 'inactivo';
  page: number;
  pageSize: number;
};

export async function getPeople(filters: PeopleFilters) {
  const { data } = await api.get<PaginatedResponse<PersonListItem>>('/personas', {
    params: filters,
  });
  return data;
}

export type CreatePersonInput = {
  tipoDocumento: 'dni' | 'pasaporte' | 'carnet_extranjeria' | 'otro';
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  correo?: string;
  telefono?: string;
  fechaNacimiento?: string;
};

export async function createPerson(input: CreatePersonInput) {
  const { data } = await api.post('/personas', input);
  return data;
}
