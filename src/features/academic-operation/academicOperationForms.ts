import { z } from 'zod';

const uuid = (message: string) => z.uuid(message);

export const scheduledCourseSchema = z.object({
  carreraId: uuid('Selecciona una carrera'),
  planCurricularId: uuid('Selecciona un plan'),
  planCursoId: uuid('Selecciona un curso'),
  periodoAcademicoId: uuid('Selecciona un periodo'),
  profesorPersonaId: uuid('Selecciona un profesor'),
  cupoMaximo: z.coerce.number().int().positive().max(500).optional(),
  horarios: z.array(z.object({
    dia: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    horaInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    horaFin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
    modalidad: z.enum(['presencial', 'virtual', 'hibrido']),
    ubicacion: z.string().trim().min(1, 'Indica aula o enlace').max(200),
  }).refine((value) => value.horaFin > value.horaInicio, {
    message: 'La hora de fin debe ser posterior al inicio', path: ['horaFin'],
  })).min(1, 'Agrega al menos un horario').default([{ dia: 'lunes', horaInicio: '18:00', horaFin: '20:00', modalidad: 'presencial', ubicacion: '' }]),
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
