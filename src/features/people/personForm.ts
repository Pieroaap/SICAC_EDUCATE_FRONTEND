import { z } from 'zod';
import type { PersonDetail } from '../../api/types';

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const personSchema = z.object({
  tipoDocumento: z.enum(['dni', 'pasaporte', 'carnet_extranjeria', 'otro']),
  numeroDocumento: z.string().trim().min(1, 'Ingresa el documento').max(30),
  nombres: z.string().trim().min(1, 'Ingresa los nombres').max(150),
  apellidoPaterno: z.string().trim().min(1, 'Ingresa el apellido paterno').max(100),
  apellidoMaterno: optionalText(100),
  correo: z.union([z.literal(''), z.email('Ingresa un correo válido')]).optional(),
  telefono: optionalText(30),
  fechaNacimiento: z.string().optional(),
});

export type PersonValues = z.infer<typeof personSchema>;

export const emptyPersonValues: PersonValues = {
  tipoDocumento: 'dni',
  numeroDocumento: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
};

export function toPersonPayload(values: PersonValues) {
  return {
    ...values,
    apellidoMaterno: values.apellidoMaterno || undefined,
    correo: values.correo || undefined,
    telefono: values.telefono || undefined,
    fechaNacimiento: values.fechaNacimiento || undefined,
  };
}

export function toPersonFormValues(person: Pick<PersonDetail,
  | 'tipoDocumento'
  | 'numeroDocumento'
  | 'nombres'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'correo'
  | 'telefono'
  | 'fechaNacimiento'
>) {
  return {
    tipoDocumento: person.tipoDocumento,
    numeroDocumento: person.numeroDocumento,
    nombres: person.nombres,
    apellidoPaterno: person.apellidoPaterno,
    apellidoMaterno: person.apellidoMaterno ?? '',
    correo: person.correo ?? '',
    telefono: person.telefono ?? '',
    fechaNacimiento: person.fechaNacimiento ?? '',
  } satisfies PersonValues;
}
