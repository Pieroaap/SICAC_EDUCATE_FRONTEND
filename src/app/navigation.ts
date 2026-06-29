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
