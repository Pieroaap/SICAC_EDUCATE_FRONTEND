import { describe, expect, it } from 'vitest';
import { classifyGrade, componentsSchema, gradeToLetter, gradeValueSchema, weightedAverage } from './academicEvaluationForms';

describe('formularios de evaluación', () => {
  it('permite guardar una planificación parcial sin superar 100', () => {
    expect(componentsSchema.safeParse({
      components: [{ nombre: 'Parcial', porcentaje: 90, orden: 1 }],
    }).success).toBe(true);
    expect(componentsSchema.safeParse({ components: [
      { nombre: 'Parcial', porcentaje: 60, orden: 1 },
      { nombre: 'Final', porcentaje: 60, orden: 2 },
    ] }).success).toBe(false);
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
    expect([gradeToLetter(15), gradeToLetter(13), gradeToLetter(10.5), gradeToLetter(10.4)])
      .toEqual(['A', 'B', 'C', 'D']);
  });

  it('expone descripción y aprobación con la escala vigente', () => {
    expect(classifyGrade(12.99)).toEqual({ code: 'C', description: 'En proceso', passed: false });
    expect(classifyGrade(13)).toEqual({ code: 'B', description: 'Aprobado', passed: true });
  });

  it('calcula promedio ponderado con dos decimales', () => {
    expect(weightedAverage([{ note: 15, weight: 40 }, { note: 12, weight: 60 }])).toBe(13.2);
  });
});
