import { describe, expect, it } from 'vitest';
import { getNavigationGroups } from './navigation';

describe('getNavigationGroups', () => {
  it('oculta el módulo de identidad para un profesor sin otro rol', () => {
    expect(getNavigationGroups(['PROFESOR']).map((group) => group.label))
      .toEqual(['Espacio de trabajo']);
  });

  it('muestra una sola vez cada opción al combinar roles gestores', () => {
    const items = getNavigationGroups(['DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO'])
      .flatMap((group) => group.items.map((item) => item.label));

    expect(items).toEqual([
      'Panel general',
      'Personas',
      'Alumnos',
      'Profesores',
      'Carreras y planes',
      'Cursos',
      'Cursos por plan',
      'Periodos academicos',
      'Cursos programados',
      'Matrículas e historial',
      'Excepciones',
    ]);
  });
});
