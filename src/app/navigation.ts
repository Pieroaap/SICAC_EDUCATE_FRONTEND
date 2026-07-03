import type { RoleCode } from '../api/types';

type NavigationItem = {
  label: string;
  to: string;
  allowed?: RoleCode[];
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const identityManagers: RoleCode[] = [
  'ADMINISTRADOR_SISTEMA',
  'DIRECTOR_ACADEMICO',
  'GESTOR_ACADEMICO',
];
const exceptionManagers: RoleCode[] = ['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO'];
const evaluationRoles: RoleCode[] = [...identityManagers, 'PROFESOR'];
const attendanceApprovers: RoleCode[] = ['DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO'];

const navigation: NavigationGroup[] = [
  {
    label: 'Espacio de trabajo',
    items: [{ label: 'Panel general', to: '/' }],
  },
  {
    label: 'Identidad',
    items: [
      { label: 'Personas', to: '/personas', allowed: identityManagers },
      { label: 'Alumnos', to: '/alumnos', allowed: identityManagers },
      { label: 'Profesores', to: '/profesores', allowed: identityManagers },
    ],
  },
  {
    label: 'Operación',
    items: [
      { label: 'Carreras y planes', to: '/estructura/carreras', allowed: identityManagers },
      { label: 'Cursos', to: '/estructura/cursos', allowed: identityManagers },
      { label: 'Cursos por plan', to: '/estructura/plan-cursos', allowed: identityManagers },
    ],
  },
  {
    label: 'Programación',
    items: [
      { label: 'Periodos academicos', to: '/estructura/periodos-academicos', allowed: identityManagers },
      { label: 'Cursos programados', to: '/operacion/cursos-programados', allowed: identityManagers },
      { label: 'Matrículas e historial', to: '/operacion/matriculas', allowed: identityManagers },
      { label: 'Excepciones', to: '/operacion/excepciones', allowed: exceptionManagers },
      { label: 'Talleres', to: '/talleres', allowed: identityManagers },
    ],
  },
  {
    label: 'Docencia',
    items: [
      { label: 'Evaluación académica', to: '/evaluacion', allowed: evaluationRoles },
      { label: 'Asistencia', to: '/asistencia', allowed: evaluationRoles },
      { label: 'Reactivaciones', to: '/asistencia/reactivaciones', allowed: attendanceApprovers },
    ],
  },
];

export function getNavigationGroups(roleCodes: RoleCode[]) {
  const granted = new Set(roleCodes);
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (
        !item.allowed || item.allowed.some((role) => granted.has(role))
      )),
    }))
    .filter((group) => group.items.length > 0);
}
