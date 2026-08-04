import { z } from 'zod';

const uuid = (message: string) => z.uuid(message);

export const emptyScheduleBlock = {
  dia: 'lunes' as const,
  horaInicio: '18:00',
  horaFin: '20:00',
  modalidad: 'presencial' as const,
  ubicacion: '',
};

export const scheduleBlockSchema = z.object({
  dia: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  modalidad: z.enum(['presencial', 'virtual', 'hibrido']),
  ubicacion: z.string().trim().min(1, 'Indica aula o enlace').max(200),
}).refine((value) => value.horaFin > value.horaInicio, {
  message: 'La hora de fin debe ser posterior al inicio',
  path: ['horaFin'],
});

export const scheduledCourseOperationalSchema = z.object({
  profesorPersonaId: uuid('Selecciona un profesor'),
  seccion: z.string().trim().min(1, 'Indica una sección').max(30).default('ÚNICA'),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
  cupoMaximo: z.number()
    .int()
    .positive('El cupo máximo debe ser mayor que 0')
    .max(500, 'El cupo máximo no puede superar 500')
    .nullable()
    .default(20),
  horarios: z.array(scheduleBlockSchema).min(1, 'Agrega al menos un horario')
    .default([{ ...emptyScheduleBlock }]),
});

export const scheduledCourseSchema = scheduledCourseOperationalSchema.extend({
  carreraId: uuid('Selecciona una carrera'),
  planCurricularId: uuid('Selecciona un plan'),
  planCursoId: uuid('Selecciona un curso'),
  periodoAcademicoId: uuid('Selecciona un periodo'),
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
export type ScheduledCourseInput = z.input<typeof scheduledCourseSchema>;
export type EnrollmentValues = z.infer<typeof enrollmentSchema>;
export type CareerRegistrationValues = z.infer<typeof careerRegistrationSchema>;
export type AcademicRecordValues = z.infer<typeof academicRecordSchema>;
