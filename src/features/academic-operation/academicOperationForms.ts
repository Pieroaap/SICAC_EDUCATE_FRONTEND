import { z } from 'zod';

const uuid = (message: string) => z.uuid(message);

export const scheduledCourseSchema = z.object({
  carreraId: uuid('Selecciona una carrera'),
  planCurricularId: uuid('Selecciona un plan'),
  planCursoId: uuid('Selecciona un curso'),
  periodoAcademicoId: uuid('Selecciona un periodo'),
  profesorPersonaId: uuid('Selecciona un profesor'),
});

export const enrollmentSchema = z.object({
  personaId: uuid('Selecciona un alumno'),
  carreraId: uuid('Selecciona una carrera'),
  planCurricularId: uuid('Selecciona un plan'),
  periodoAcademicoId: uuid('Selecciona un periodo'),
  fechaMatricula: z.string().min(1, 'Campo obligatorio'),
});

export const authorizationSchema = z.object({
  motivo: z.string().trim().min(10, 'Describe el motivo en al menos 10 caracteres').max(500),
});

export type ScheduledCourseValues = z.infer<typeof scheduledCourseSchema>;
export type EnrollmentValues = z.infer<typeof enrollmentSchema>;
