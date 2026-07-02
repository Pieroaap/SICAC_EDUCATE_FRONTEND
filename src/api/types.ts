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

export type PersonDetail = Omit<PersonListItem, 'roles'> & {
  fechaNacimiento: string | null;
  alumnoPerfil: {
    estado: StudentState;
    anioIngreso: number;
    periodoIngreso: string;
    beneficio: 'becado' | 'credito' | 'becado_credito' | 'normal';
    tipoBeneficio: 'regular' | 'media_beca' | 'tercio_beca' | 'especial' | 'beca_completa';
  } | null;
  roles: Array<{
    codigo: RoleCode;
    nombre: string;
    estado: 'activo' | 'inactivo';
    fechaInicio: string;
    fechaFin: string | null;
  }>;
  tutores: Array<{
    id: string;
    tutorPersonaId: string;
    tutorDocumento: string;
    tutorNombres: string;
    tutorApellidoPaterno: string;
    tutorApellidoMaterno: string | null;
    tipoRelacion: string;
    estado: 'activo' | 'inactivo';
    fechaInicio: string;
    fechaFin: string | null;
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

export type StudentState =
  | 'activo'
  | 'en_pausa'
  | 'retirado'
  | 'sin_contestar'
  | 'graduado';

export type StudentListItem = {
  id: string;
  apellidos: string;
  nombres: string;
  telefono: string | null;
  dni: string;
  estado: StudentState;
  anioIngreso: number;
  periodoIngreso: string;
  beneficio: 'becado' | 'credito' | 'becado_credito' | 'normal';
  tipoBeneficio: 'regular' | 'media_beca' | 'tercio_beca' | 'especial' | 'beca_completa';
  tieneAcceso: boolean;
  carrera: string | null;
  plan: string | null;
};

export type TeacherListItem = {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  dni: string;
  correo: string | null;
  estado: 'activo' | 'inactivo';
  tieneAcceso: boolean;
};

export type ActiveState = 'activo' | 'inactivo';

export type Career = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: ActiveState;
};

export type CurriculumPlan = {
  id: string;
  carreraId: string;
  codigo: string;
  nombre: string;
  version: string;
  estado: ActiveState;
  createdAt?: string;
};

export type Course = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'obligatorio' | 'electivo';
  estado: ActiveState;
};

export type PlanCourse = {
  id: string;
  planCurricularId: string;
  cursoId: string;
  ciclo: number;
  orden: number;
  estado: ActiveState;
  prerequisiteIds: string[];
};

export type AcademicPeriod = {
  id: string;
  carreraId: string;
  anio: number;
  periodo: 'I' | 'II' | 'III';
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'activo' | 'culminado';
};

export type ScheduledCourse = {
  id: string;
  seccion: string;
  estado: ActiveState;
  planCursoId: string;
  cursoId: string;
  cursoCodigo: string;
  cursoNombre: string;
  ciclo: number;
  planCurricularId: string;
  planNombre: string;
  carreraId: string;
  carreraNombre: string;
  periodoAcademicoId: string;
  periodoNombre: string;
  profesorPersonaId: string;
  profesorNombres: string;
  profesorApellidoPaterno: string;
  profesorApellidoMaterno: string | null;
};

export type CareerEnrollment = {
  matricula: {
    id: string;
    personaId: string;
    carreraId: string;
    planCurricularId: string;
    periodoAcademicoId: string;
    estado: 'activo' | 'retirado' | 'completado' | 'anulado';
    fechaMatricula: string;
    beneficio: StudentListItem['beneficio'] | null;
    tipoBeneficio: StudentListItem['tipoBeneficio'] | null;
    observacionBeneficio: string | null;
    snapshotCosto: string | null;
  };
  persona: {
    id: string;
    dni: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
  };
  carreraNombre: string;
  planNombre: string;
  periodoNombre: string;
};

export type CourseEnrollment = {
  inscripcion: {
    id: string;
    fechaInscripcion: string;
    estado: 'activo' | 'retirado' | 'completado' | 'anulado';
  };
  cursoProgramado: ScheduledCourse;
  cursoCodigo: string;
  cursoNombre: string;
  ciclo: number;
};

export type PrerequisiteAuthorization = {
  id: string;
  matriculaCarreraId: string;
  cursoProgramadoId: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fechaAprobacion: string | null;
  createdAt: string;
  alumnoDocumento: string;
  alumnoNombres: string;
  alumnoApellidoPaterno: string;
  alumnoApellidoMaterno: string | null;
  cursoCodigo: string;
  cursoNombre: string;
  seccion: string;
  periodoNombre: string;
};

export type ScheduledCourseCandidate = {
  matriculaId: string;
  personaId: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  inscripcion: {
    id: string;
    estado: 'activo' | 'retirado' | 'completado' | 'anulado';
  } | null;
};

export type CareerRegistration = {
  id: string;
  personaId: string;
  carreraId: string;
  carreraNombre: string;
  planCurricularId: string;
  planNombre: string;
  periodoInicioId: string;
  periodoInicioNombre: string;
  periodoInicioAnio: number;
  periodoInicioNumero: 'I' | 'II' | 'III';
  estado: ActiveState;
  createdAt: string;
};

export type AcademicRecord = {
  id: string;
  personaId: string;
  planCursoId: string;
  cursoCodigo: string;
  cursoNombre: string;
  ciclo: number;
  resultado: 'aprobado';
  fechaReferencial: string | null;
  periodoReferencial: string | null;
  observacion: string | null;
  fuente: 'manual' | 'importacion';
  reconocidoPorPersonaId: string;
  createdAt: string;
};

export type BulkEnrollmentCandidate = {
  personaId: string;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
};
