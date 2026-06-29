import { z } from 'zod';
import type { PersonDetail, RoleCode, StudentState } from '../../api/types';
import type { StudentBenefit, StudentBenefitType } from './studentProfileOptions';

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
export type InitialPersonRole = RoleCode | 'TUTOR';

export const studentProfileSchema = z.object({
  estado: z.enum(['activo', 'en_pausa', 'retirado', 'sin_contestar', 'graduado']),
  anioIngreso: z.coerce.number().int().min(1900, 'Año inválido').max(2100, 'Año inválido'),
  periodoIngreso: z.string().trim().regex(/^[0-9]{4}\s*-\s*(I|II|III)$/, 'Usa formato 2026-I, 2026-II o 2026-III'),
  beneficio: z.enum(['becado', 'credito', 'becado_credito', 'normal']),
  tipoBeneficio: z.enum(['regular', 'media_beca', 'tercio_beca', 'especial', 'beca_completa']),
});

const guardianSchema = personSchema.extend({
  tipoRelacion: z.string().trim().min(1, 'Indica el parentesco').max(50),
  fechaInicio: z.string().optional(),
});

export const createPersonSchema = personSchema.extend({
  initialRole: z.enum([
    'ALUMNO',
    'PROFESOR',
    'GESTOR_ACADEMICO',
    'DIRECTOR_ACADEMICO',
    'ADMINISTRADOR_SISTEMA',
    'TUTOR',
  ]),
  alumnoPerfil: studentProfileSchema.optional(),
  includeTutor: z.boolean(),
  tutor: guardianSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.initialRole === 'ALUMNO' && !value.alumnoPerfil) {
    ctx.addIssue({
      code: 'custom',
      message: 'Completa el perfil de alumno',
      path: ['alumnoPerfil'],
    });
  }
  if (value.includeTutor && !value.tutor) {
    ctx.addIssue({
      code: 'custom',
      message: 'Completa los datos del tutor',
      path: ['tutor'],
    });
  }
});

export type CreatePersonValues = z.infer<typeof createPersonSchema>;
export type CreatePersonFormInput = z.input<typeof createPersonSchema>;
export type StudentProfileValues = z.infer<typeof studentProfileSchema>;

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

export const emptyStudentProfileValues: StudentProfileValues = {
  estado: 'activo',
  anioIngreso: new Date().getFullYear(),
  periodoIngreso: `${new Date().getFullYear()}-I`,
  beneficio: 'normal',
  tipoBeneficio: 'regular',
};

export const emptyCreatePersonValues: CreatePersonValues = {
  ...emptyPersonValues,
  initialRole: 'ALUMNO',
  alumnoPerfil: emptyStudentProfileValues,
  includeTutor: false,
  tutor: undefined,
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

function cleanPersonPayload(values: PersonValues) {
  return toPersonPayload(values);
}

export function toCreatePersonPayload(values: CreatePersonValues) {
  const base = cleanPersonPayload(values);
  return {
    ...base,
    initialRole: values.initialRole,
    alumnoPerfil: values.initialRole === 'ALUMNO' ? values.alumnoPerfil : undefined,
    tutor: values.initialRole === 'ALUMNO' && values.includeTutor && values.tutor
      ? {
        ...cleanPersonPayload(values.tutor),
        tipoRelacion: values.tutor.tipoRelacion,
        fechaInicio: values.tutor.fechaInicio || undefined,
      }
      : undefined,
  };
}

export function toStudentProfilePayload(values: {
  estado: StudentState;
  anioIngreso: number;
  periodoIngreso: string;
  beneficio: StudentBenefit;
  tipoBeneficio: StudentBenefitType;
}) {
  return {
    ...values,
    periodoIngreso: values.periodoIngreso.trim().toUpperCase().replace(/\s*-\s*/, '-'),
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
