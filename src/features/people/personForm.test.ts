import { describe, expect, it } from 'vitest';
import {
  emptyCreatePersonValues,
  emptyPersonValues,
  toCreatePersonPayload,
  toPersonFormValues,
  toPersonPayload,
  toPersonUpdatePayload,
} from './personForm';

describe('personForm helpers', () => {
  it('drops empty optional values before sending them to the API', () => {
    expect(toPersonPayload(emptyPersonValues)).toEqual({
      tipoDocumento: 'dni',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: undefined,
      correo: undefined,
      telefono: undefined,
      fechaNacimiento: undefined,
    });
  });

  it('maps null backend fields to empty form values', () => {
    expect(toPersonFormValues({
      tipoDocumento: 'dni',
      numeroDocumento: '12345678',
      nombres: 'Mariela',
      apellidoPaterno: 'Lopez',
      apellidoMaterno: null,
      correo: null,
      telefono: null,
      fechaNacimiento: null,
    })).toEqual({
      tipoDocumento: 'dni',
      numeroDocumento: '12345678',
      nombres: 'Mariela',
      apellidoPaterno: 'Lopez',
      apellidoMaterno: '',
      correo: '',
      telefono: '',
      fechaNacimiento: '',
    });
  });

  it('sends only dirty fields on update', () => {
    expect(toPersonUpdatePayload({
      ...emptyPersonValues,
      numeroDocumento: '12345678',
      nombres: 'Nadia',
      apellidoPaterno: 'Vega',
    }, {
      apellidoPaterno: true,
    })).toEqual({
      apellidoPaterno: 'Vega',
    });
  });

  it('sends null when clearing optional values on update', () => {
    expect(toPersonUpdatePayload({
      ...emptyPersonValues,
      numeroDocumento: '12345678',
      nombres: 'Nadia',
      apellidoPaterno: 'Vega',
      telefono: '',
    }, {
      telefono: true,
    })).toEqual({
      telefono: null,
    });
  });

  it('includes student profile and omits disabled tutor on create', () => {
    expect(toCreatePersonPayload(emptyCreatePersonValues)).toMatchObject({
      initialRole: 'ALUMNO',
      alumnoPerfil: {
        estado: 'activo',
        beneficio: 'normal',
        tipoBeneficio: 'regular',
      },
      tutor: undefined,
    });
  });

  it('includes tutor data only when requested for student creation', () => {
    const payload = toCreatePersonPayload({
      ...emptyCreatePersonValues,
      includeTutor: true,
      tutor: {
        ...emptyPersonValues,
        numeroDocumento: '87654321',
        nombres: 'Tutor',
        apellidoPaterno: 'Principal',
        tipoRelacion: 'Madre',
        fechaInicio: '2026-01-01',
      },
    });
    expect(payload.tutor).toMatchObject({
      numeroDocumento: '87654321',
      tipoRelacion: 'Madre',
      fechaInicio: '2026-01-01',
    });
  });

  it('creates professor payload without student-only fields', () => {
    expect(toCreatePersonPayload({
      ...emptyCreatePersonValues,
      initialRole: 'PROFESOR',
    })).toMatchObject({
      initialRole: 'PROFESOR',
      alumnoPerfil: undefined,
      tutor: undefined,
    });
  });
});
