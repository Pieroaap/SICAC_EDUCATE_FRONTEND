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
});

export const authorizationSchema = z.object({
  motivo: z.string().trim().min(10, 'Describe el motivo en al menos 10 caracteres').max(500),
});

export const careerRegistrationSchema = z.object({
  carreraId: uuid('Selecciona una carrera'),
  periodoInicioId: uuid('Selecciona el periodo de inicio'),
});

export const academicRecordSchema = z.object({
  planCursoId: uuid('Selecciona un curso'),
  fechaReferencial: z.string(),
  periodoReferencial: z.string().trim().max(100),
  observacion: z.string().trim().max(1000),
}).refine((value) => value.fechaReferencial || value.periodoReferencial, {
  message: 'Indica una fecha o periodo referencial',
  path: ['periodoReferencial'],
});

export type ScheduledCourseValues = z.infer<typeof scheduledCourseSchema>;
export type EnrollmentValues = z.infer<typeof enrollmentSchema>;
export type CareerRegistrationValues = z.infer<typeof careerRegistrationSchema>;
export type AcademicRecordValues = z.infer<typeof academicRecordSchema>;
