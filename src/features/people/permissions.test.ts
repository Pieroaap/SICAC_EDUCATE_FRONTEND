import { describe, expect, it } from 'vitest';
import { canAccessPeople } from './permissions';

describe('canAccessPeople', () => {
  it.each([
    'ADMINISTRADOR_SISTEMA',
    'DIRECTOR_ACADEMICO',
    'GESTOR_ACADEMICO',
  ] as const)('permite el módulo al rol %s', (role) => {
    expect(canAccessPeople([role])).toBe(true);
  });

  it('no permite el módulo a un profesor sin otro rol', () => {
    expect(canAccessPeople(['PROFESOR'])).toBe(false);
  });

  it('aplica la unión de permisos para una persona multirrol', () => {
    expect(canAccessPeople(['PROFESOR', 'DIRECTOR_ACADEMICO'])).toBe(true);
  });
});
