import type { PersonDetail, RoleCode } from '../../api/types';
import type { ProvisionableRole } from './api/peopleApi';

export const accessRoleOptions: Array<{ value: ProvisionableRole; label: string }> = [
  { value: 'ADMINISTRADOR_SISTEMA', label: 'Administrador del sistema' },
  { value: 'DIRECTOR_ACADEMICO', label: 'Director académico' },
  { value: 'GESTOR_ACADEMICO', label: 'Gestor académico' },
  { value: 'PROFESOR', label: 'Profesor' },
];

export function hasActiveRole(person: PersonDetail, role: RoleCode) {
  return person.roles.some((assignment) => (
    assignment.codigo === role
    && assignment.estado === 'activo'
    && !assignment.fechaFin
  ));
}

export function canProvisionAccess(actorRoles: RoleCode[]) {
  return actorRoles.includes('ADMINISTRADOR_SISTEMA');
}

export function canAssignGuardian(actorRoles: RoleCode[]) {
  return actorRoles.some((role) => (
    role === 'ADMINISTRADOR_SISTEMA'
    || role === 'DIRECTOR_ACADEMICO'
    || role === 'GESTOR_ACADEMICO'
  ));
}

export function canResetPassword(actorRoles: RoleCode[], target: PersonDetail) {
  if (actorRoles.includes('ADMINISTRADOR_SISTEMA')) return true;
  if (!actorRoles.includes('DIRECTOR_ACADEMICO')) return false;
  return !hasActiveRole(target, 'ADMINISTRADOR_SISTEMA');
}
