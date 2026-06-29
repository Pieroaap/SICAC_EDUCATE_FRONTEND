export type RoleCode =
  | 'ADMINISTRADOR_SISTEMA'
  | 'DIRECTOR_ACADEMICO'
  | 'GESTOR_ACADEMICO'
  | 'PROFESOR'
  | 'ALUMNO';

export type AuthProfile = {
  personaId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  correo: string;
  roles: Array<{
    codigo: RoleCode;
    nombre: string;
  }>;
  mustChangePassword: boolean;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  user: { email?: string };
  mustChangePassword: boolean;
};

export type DashboardResponse = {
  periodoActivo: {
    id: string;
    codigo: string;
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
  } | null;
  metrics: Array<{
    key: string;
    label: string;
    value: number;
    to: string;
  }>;
  alerts: Array<{
    key: string;
    label: string;
    count: number;
    to: string;
  }>;
  quickActions: Array<{
    key: string;
    label: string;
    to: string;
  }>;
};

export type PersonListItem = {
  id: string;
  tipoDocumento: 'dni' | 'pasaporte' | 'carnet_extranjeria' | 'otro';
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string | null;
  telefono: string | null;
  estado: 'activo' | 'inactivo';
  tieneAcceso: boolean;
  roles: Array<{
    codigo: RoleCode;
    nombre: string;
    estado: 'activo' | 'inactivo';
  }>;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
