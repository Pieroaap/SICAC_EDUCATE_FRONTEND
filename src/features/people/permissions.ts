import type { RoleCode } from '../../api/types';

const peopleRoles = new Set<RoleCode>([
  'ADMINISTRADOR_SISTEMA',
  'DIRECTOR_ACADEMICO',
  'GESTOR_ACADEMICO',
]);

export function canAccessPeople(roles: RoleCode[]) {
  return roles.some((role) => peopleRoles.has(role));
}
