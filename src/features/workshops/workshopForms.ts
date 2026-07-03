import { z } from 'zod';

export const workshopSchema = z.object({
  codigo: z.string().trim().min(1, 'Ingresa el código').max(30),
  nombre: z.string().trim().min(1, 'Ingresa el nombre').max(150),
  descripcion: z.string().trim().optional(),
});
export const personSchema = z.object({
  tipoDocumento: z.enum(['dni', 'pasaporte', 'carnet_extranjeria', 'otro']),
  numeroDocumento: z.string().trim().min(1, 'Ingresa el documento'),
  nombres: z.string().trim().min(1, 'Ingresa los nombres'),
  apellidoPaterno: z.string().trim().min(1, 'Ingresa el apellido'),
  apellidoMaterno: z.string().trim().optional(),
  correo: z.union([z.literal(''), z.string().email('Correo inválido')]).optional(),
  telefono: z.string().trim().optional(),
});
export const scheduledWorkshopSchema = z.object({
  tallerId: z.string().uuid('Selecciona un taller'),
  responsablePersonaId: z.string().optional(),
  responsable: personSchema.optional(),
  fechaInicio: z.string().min(1, 'Selecciona la fecha inicial'),
  fechaFin: z.string().min(1, 'Selecciona la fecha final'),
  modalidad: z.enum(['presencial', 'virtual', 'hibrido']),
  ubicacion: z.string().trim().min(1, 'Ingresa ubicación o enlace'),
  costo: z.union([z.literal(''), z.string().regex(/^\d+(\.\d{1,2})?$/, 'Costo inválido')]),
  cupoMaximo: z.number().int().positive('El cupo debe ser mayor que cero'),
  horarios: z.array(z.object({
    dia: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    horaInicio: z.string().min(1), horaFin: z.string().min(1),
  }).refine((value) => value.horaFin > value.horaInicio, 'La hora final debe ser posterior')).min(1),
}).refine((value) => Boolean(value.responsablePersonaId) !== Boolean(value.responsable), {
  message: 'Selecciona un responsable o registra uno nuevo',
});
export type WorkshopValues = z.infer<typeof workshopSchema>;
export type ScheduledWorkshopValues = z.infer<typeof scheduledWorkshopSchema>;
