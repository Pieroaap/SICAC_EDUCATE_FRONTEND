import { describe, expect, it } from 'vitest';
import { emptyPersonValues, toPersonFormValues, toPersonPayload } from './personForm';

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
});
