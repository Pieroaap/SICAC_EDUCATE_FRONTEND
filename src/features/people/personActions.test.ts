import { describe, expect, it } from 'vitest';
import type { PersonDetail, RoleCode } from '../../api/types';
import {
  canAssignGuardian,
  canProvisionAccess,
  canResetPassword,
  canUpdateStudentProfile,
  hasActiveRole,
} from './personActions';

function personWithRoles(roles: RoleCode[]): PersonDetail {
  return {
    id: 'person-1',
    tipoDocumento: 'dni',
    numeroDocumento: '12345678',
    nombres: 'Ana',
    apellidoPaterno: 'Rojas',
    apellidoMaterno: null,
    correo: null,
    telefono: null,
    estado: 'activo',
    tieneAcceso: true,
    fechaNacimiento: null,
    alumnoPerfil: null,
    roles: roles.map((codigo) => ({
      codigo,
      nombre: codigo,
      estado: 'activo',
      fechaInicio: '2026-01-01',
      fechaFin: null,
    })),
    tutores: [],
  };
}

describe('personActions', () => {
  it('solo administrador puede habilitar acceso', () => {
    expect(canProvisionAccess(['ADMINISTRADOR_SISTEMA'])).toBe(true);
    expect(canProvisionAccess(['DIRECTOR_ACADEMICO'])).toBe(false);
  });

  it('director no reinicia claves de administradores', () => {
    expect(canResetPassword(['DIRECTOR_ACADEMICO'], personWithRoles(['PROFESOR']))).toBe(true);
    expect(canResetPassword(['DIRECTOR_ACADEMICO'], personWithRoles(['ADMINISTRADOR_SISTEMA']))).toBe(false);
  });

  it('gestores académicos pueden asignar tutores', () => {
    expect(canAssignGuardian(['GESTOR_ACADEMICO'])).toBe(true);
    expect(canAssignGuardian(['PROFESOR'])).toBe(false);
  });

  it('dirección y gestión académica pueden actualizar perfil de alumno', () => {
    expect(canUpdateStudentProfile(['DIRECTOR_ACADEMICO'])).toBe(true);
    expect(canUpdateStudentProfile(['GESTOR_ACADEMICO'])).toBe(true);
    expect(canUpdateStudentProfile(['PROFESOR'])).toBe(false);
  });

  it('detecta roles activos sin fecha fin', () => {
    expect(hasActiveRole(personWithRoles(['ALUMNO']), 'ALUMNO')).toBe(true);
    expect(hasActiveRole(personWithRoles(['PROFESOR']), 'ALUMNO')).toBe(false);
  });
});
