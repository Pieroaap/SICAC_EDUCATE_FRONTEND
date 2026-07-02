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
  initialRegistration: z.object({
    carreraId: z.string(),
    periodoInicioId: z.string(),
  }).optional(),
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
  if (value.initialRole === 'ALUMNO') {
    if (!z.uuid().safeParse(value.initialRegistration?.carreraId).success) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona una carrera',
        path: ['initialRegistration', 'carreraId'],
      });
    }
    if (!z.uuid().safeParse(value.initialRegistration?.periodoInicioId).success) {
      ctx.addIssue({
        code: 'custom',
        message: 'Selecciona un periodo de inicio',
        path: ['initialRegistration', 'periodoInicioId'],
      });
    }
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
  initialRegistration: { carreraId: '', periodoInicioId: '' },
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

const nullableOnEditFields = new Set<keyof PersonValues>([
  'apellidoMaterno',
  'correo',
  'telefono',
  'fechaNacimiento',
]);

type PersonUpdatePayload = {
  tipoDocumento?: PersonValues['tipoDocumento'];
  numeroDocumento?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string | null;
  correo?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
};

export function toPersonUpdatePayload(
  values: PersonValues,
  dirtyFields: Partial<Record<keyof PersonValues, boolean>>,
) {
  const payload: PersonUpdatePayload = {};

  for (const key of Object.keys(dirtyFields) as Array<keyof PersonValues>) {
    if (!dirtyFields[key]) continue;
    const value = values[key];
    const normalizedValue = value || (nullableOnEditFields.has(key) ? null : undefined);
    Object.assign(payload, { [key]: normalizedValue });
  }

  return payload;
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
    initialRegistration: values.initialRole === 'ALUMNO' ? values.initialRegistration : undefined,
    tutor: values.initialRole === 'ALUMNO' && values.includeTutor && values.tutor
      ? {
        ...cleanPersonPayload(values.tutor),
        tipoRelacion: values.tutor.tipoRelacion,
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
