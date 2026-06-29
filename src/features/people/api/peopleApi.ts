import { api } from '../../../api/client';
import type {
  PaginatedResponse,
  PersonDetail,
  PersonListItem,
  RoleCode,
  StudentState,
} from '../../../api/types';

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

export async function getPersonDetail(personId: string) {
  const { data } = await api.get<PersonDetail>(`/personas/${personId}`);
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

export type UpdatePersonInput = Partial<CreatePersonInput> & {
  estado?: 'activo' | 'inactivo';
};

export async function updatePerson(personId: string, input: UpdatePersonInput) {
  const { data } = await api.patch(`/personas/${personId}`, input);
  return data;
}

export type ProvisionableRole = Exclude<RoleCode, 'ALUMNO'>;

export async function enablePersonAccess(personId: string, role: ProvisionableRole) {
  const { data } = await api.post(`/personas/${personId}/acceso`, { role });
  return data;
}

export async function resetPersonPassword(personId: string) {
  const { data } = await api.post<{ message: string }>(`/usuarios/${personId}/reiniciar-clave`);
  return data;
}

export type AssignGuardianInput = {
  guardianId: string;
  relationship: string;
  startDate: string;
  endDate?: string;
};

export async function assignStudentGuardian(studentId: string, input: AssignGuardianInput) {
  const { data } = await api.post(`/alumnos/${studentId}/tutores`, input);
  return data;
}

export async function updateStudentProfile(personId: string, input: { estado: StudentState }) {
  const { data } = await api.patch(`/alumnos/${personId}`, input);
  return data;
}
