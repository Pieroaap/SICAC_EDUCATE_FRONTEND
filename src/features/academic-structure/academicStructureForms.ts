import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1, 'Campo obligatorio').max(max, `Maximo ${max} caracteres`);
const optionalText = z.string().trim().transform((value) => (value ? value : undefined)).optional();

export const catalogSchema = z.object({
  codigo: text(30),
  nombre: text(150),
  descripcion: optionalText,
  estado: z.enum(['activo', 'inactivo']).optional(),
});

export const careerSchema = catalogSchema.extend({
  planVersion: text(30),
});

export const courseSchema = z.object({
  codigo: text(30),
  nombre: text(150),
  tipo: z.enum(['obligatorio', 'electivo']),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

export const curriculumPlanSchema = z.object({
  carreraId: z.uuid('Selecciona una carrera'),
  codigo: text(30),
  nombre: text(150),
  version: text(30),
  estado: z.enum(['activo', 'inactivo']).optional(),
});

export const planCourseSchema = z.object({
  planCurricularId: z.uuid('Selecciona un plan'),
  cursoId: z.uuid('Selecciona un curso'),
  ciclo: z.number().int().positive('Debe ser mayor a cero'),
  orden: z.number().int().positive('Debe ser mayor a cero'),
  estado: z.enum(['activo', 'inactivo']).optional(),
  prerequisiteIds: z.array(z.uuid()).max(2, 'Solo se permiten dos prerrequisitos'),
}).refine((value) => new Set(value.prerequisiteIds).size === value.prerequisiteIds.length, {
  message: 'No puedes repetir el mismo prerrequisito',
  path: ['prerequisiteIds'],
});

export const academicPeriodSchema = z.object({
  carreraId: z.uuid('Selecciona una carrera'),
  anio: z.number().int().min(1900, 'Año invalido').max(9999, 'Año invalido'),
  periodo: z.enum(['I', 'II', 'III']),
  fechaInicio: z.string().min(1, 'Campo obligatorio'),
  fechaFin: z.string().min(1, 'Campo obligatorio'),
  estado: z.enum(['programado', 'activo', 'culminado']).optional(),
}).refine((value) => value.fechaFin >= value.fechaInicio, {
  message: 'La fecha final debe ser posterior o igual a la inicial',
  path: ['fechaFin'],
});

export type CatalogValues = z.infer<typeof catalogSchema>;
export type CareerValues = z.infer<typeof careerSchema>;
export type CourseValues = z.infer<typeof courseSchema>;
export type CurriculumPlanValues = z.infer<typeof curriculumPlanSchema>;
export type PlanCourseValues = z.infer<typeof planCourseSchema>;
export type AcademicPeriodValues = z.infer<typeof academicPeriodSchema>;
