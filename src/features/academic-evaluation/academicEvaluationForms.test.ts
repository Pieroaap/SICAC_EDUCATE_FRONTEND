import { describe, expect, it } from 'vitest';
import { componentsSchema, gradeToLetter, gradeValueSchema, weightedAverage } from './academicEvaluationForms';

describe('formularios de evaluación', () => {
  it('exige pesos que sumen 100', () => {
    expect(componentsSchema.safeParse({
      components: [{ nombre: 'Parcial', porcentaje: 90, orden: 1 }],
    }).success).toBe(false);
    expect(componentsSchema.safeParse({
      components: [
        { nombre: 'Parcial', porcentaje: 40, orden: 1 },
        { nombre: 'Final', porcentaje: 60, orden: 2 },
      ],
    }).success).toBe(true);
  });

  it('normaliza identificadores vacíos de componentes nuevos', () => {
    const result = componentsSchema.safeParse({
      components: [
        { id: '', nombre: 'Parcial 1', porcentaje: 25, orden: 1 },
        { id: '', nombre: 'Parcial 2', porcentaje: 25, orden: 2 },
        { id: '', nombre: 'Final', porcentaje: 50, orden: 3 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.components.every((component) => component.id === undefined)).toBe(true);
    }
  });

  it('valida notas y deriva equivalencias', () => {
    expect(gradeValueSchema.safeParse(20).success).toBe(true);
    expect(gradeValueSchema.safeParse(21).success).toBe(false);
    expect([gradeToLetter(17), gradeToLetter(14), gradeToLetter(11), gradeToLetter(10.99)])
      .toEqual(['A', 'B', 'C', 'D']);
  });

  it('calcula promedio ponderado con dos decimales', () => {
    expect(weightedAverage([{ note: 15, weight: 40 }, { note: 12, weight: 60 }])).toBe(13.2);
  });
});
