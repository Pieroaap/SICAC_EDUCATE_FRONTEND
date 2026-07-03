import { api } from '../../../api/client';
import type {
  PaginatedResponse,
  PersonDetail,
  PersonListItem,
  RoleCode,
  StudentState,
} from '../../../api/types';
import type { InitialPersonRole, StudentProfileValues } from '../personForm';

export type PeopleFilters = {
  search?: string;
  estado?: 'activo' | 'inactivo';
  rol?: RoleCode;
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

export type PersonPayloadBase = {
  tipoDocumento: 'dni' | 'pasaporte' | 'carnet_extranjeria' | 'otro';
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  correo?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
};

export type CreateGuardianPersonInput = PersonPayloadBase & {
  tipoRelacion: string;
};

export type CreatePersonInput = PersonPayloadBase & {
  initialRole: InitialPersonRole;
  alumnoPerfil?: StudentProfileValues;
  initialRegistration?: { carreraId: string; periodoInicioId: string };
  tutor?: CreateGuardianPersonInput;
};

export async function createPerson(input: CreatePersonInput) {
  const { data } = await api.post('/personas', input);
  return data;
}

export type UpdatePersonInput = Partial<PersonPayloadBase> & {
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
  endDate?: string;
};

export async function assignStudentGuardian(studentId: string, input: AssignGuardianInput) {
  const { data } = await api.post(`/alumnos/${studentId}/tutores`, input);
  return data;
}

export async function updateStudentProfile(
  personId: string,
  input: Partial<{
    estado: StudentState;
    anioIngreso: number;
    periodoIngreso: string;
    beneficio: 'becado' | 'credito' | 'becado_credito' | 'normal';
    tipoBeneficio: 'regular' | 'media_beca' | 'tercio_beca' | 'especial' | 'beca_completa';
    condicionMedica?: string | null;
  }>,
) {
  const { data } = await api.patch(`/alumnos/${personId}`, input);
  return data;
}

export async function updateTeacherRoleStatus(
  personId: string,
  input: { estado: 'activo' | 'inactivo' },
) {
  const { data } = await api.patch(`/profesores/${personId}`, input);
  return data;
}

export async function assignPersonRole(
  personId: string,
  input: {
    role: RoleCode;
    student?: {
      carreraId: string; periodoInicioId: string; estado: 'activo';
      beneficio: 'normal'; tipoBeneficio: 'regular';
    };
  },
) {
  const { data } = await api.post(`/personas/${personId}/roles`, input);
  return data;
}
