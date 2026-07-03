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

export type ComponentsValues = z.infer<typeof componentsSchema>;

export function gradeToLetter(grade: number): 'A' | 'B' | 'C' | 'D' {
  if (grade >= 17) return 'A';
  if (grade >= 14) return 'B';
  if (grade >= 11) return 'C';
  return 'D';
}

export function weightedAverage(
  grades: Array<{ note: number; weight: number }>,
): number {
  return Math.round((grades.reduce((sum, item) => sum + item.note * item.weight / 100, 0)
    + Number.EPSILON) * 100) / 100;
}
