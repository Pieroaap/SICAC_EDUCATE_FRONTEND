import { z } from 'zod';

export const componentIdSchema = z.union([
  z.literal('').transform(() => undefined),
  z.string().uuid(),
]).optional();

export const componentSchema = z.object({
  id: componentIdSchema,
  nombre: z.string().trim().min(1, 'Ingresa el nombre de la evaluación').max(100),
  porcentaje: z.number().gt(0, 'El peso debe ser mayor a cero').max(100),
  orden: z.number().int().positive(),
  tipo: z.enum(['tarea', 'practica', 'examen', 'proyecto', 'otro']).nullable().default(null),
  fechaProgramada: z.string().nullable().default(null),
  fechaLimite: z.string().nullable().default(null),
  estado: z.enum(['programada', 'en_curso', 'cerrada']).default('programada'),
}).refine((value) => !value.fechaProgramada || !value.fechaLimite || value.fechaLimite >= value.fechaProgramada, {
  message: 'La fecha límite debe ser posterior a la programada', path: ['fechaLimite'],
});

export const componentsSchema = z.object({
  components: z.array(componentSchema).min(1, 'Agrega al menos una evaluación'),
}).superRefine((value, context) => {
  const total = value.components.reduce((sum, item) => sum + item.porcentaje, 0);
  if (Math.abs(total - 100) > 0.001) {
    context.addIssue({
      code: 'custom',
      path: ['components'],
      message: 'Los pesos deben sumar exactamente 100%',
    });
  }
});

export const gradeValueSchema = z.coerce.number()
  .min(0, 'La nota mínima es 0')
  .max(20, 'La nota máxima es 20');

export type ComponentsInput = z.input<typeof componentsSchema>;
export type ComponentsValues = z.output<typeof componentsSchema>;

export function classifyGrade(grade: number): {
  code: 'A' | 'B' | 'C' | 'D';
  description: 'Desaprobado' | 'En proceso' | 'Aprobado' | 'Sobresaliente';
  passed: boolean;
} {
  if (grade >= 15) return { code: 'A', description: 'Sobresaliente', passed: true };
  if (grade >= 13) return { code: 'B', description: 'Aprobado', passed: true };
  if (grade >= 10.5) return { code: 'C', description: 'En proceso', passed: false };
  return { code: 'D', description: 'Desaprobado', passed: false };
}

export function gradeToLetter(grade: number): 'A' | 'B' | 'C' | 'D' {
  return classifyGrade(grade).code;
}

export function weightedAverage(
  grades: Array<{ note: number; weight: number }>,
): number {
  return Math.round((grades.reduce((sum, item) => sum + item.note * item.weight / 100, 0)
    + Number.EPSILON) * 100) / 100;
}
