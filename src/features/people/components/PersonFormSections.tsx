import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { FormField } from '../../../components/FormField';
import { Input } from '../../../components/ui/Input';
import type { PersonValues } from '../personForm';

type PersonFormSectionsProps = {
  register: UseFormRegister<PersonValues>;
  errors: FieldErrors<PersonValues>;
};

export function PersonFormSections({ register, errors }: PersonFormSectionsProps) {
  return (
    <>
      <section>
        <header>
          <span>01</span>
          <div>
            <h2>Documento e identidad</h2>
            <p>Usa los datos tal como aparecen en el documento.</p>
          </div>
        </header>
        <div className="form-grid">
          <FormField error={errors.tipoDocumento?.message} htmlFor="tipoDocumento" label="Tipo de documento">
            <select className="form-select" id="tipoDocumento" {...register('tipoDocumento')}>
              <option value="dni">DNI</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="carnet_extranjeria">Carnet de extranjería</option>
              <option value="otro">Otro</option>
            </select>
          </FormField>
          <FormField error={errors.numeroDocumento?.message} htmlFor="numeroDocumento" label="Número de documento">
            <Input id="numeroDocumento" inputMode="numeric" {...register('numeroDocumento')} />
          </FormField>
          <FormField error={errors.nombres?.message} htmlFor="nombres" label="Nombres">
            <Input id="nombres" {...register('nombres')} />
          </FormField>
          <FormField error={errors.apellidoPaterno?.message} htmlFor="apellidoPaterno" label="Apellido paterno">
            <Input id="apellidoPaterno" {...register('apellidoPaterno')} />
          </FormField>
          <FormField error={errors.apellidoMaterno?.message} htmlFor="apellidoMaterno" label="Apellido materno">
            <Input id="apellidoMaterno" {...register('apellidoMaterno')} />
          </FormField>
          <FormField error={errors.fechaNacimiento?.message} htmlFor="fechaNacimiento" label="Fecha de nacimiento">
            <Input id="fechaNacimiento" type="date" {...register('fechaNacimiento')} />
          </FormField>
        </div>
      </section>

      <section>
        <header>
          <span>02</span>
          <div>
            <h2>Contacto</h2>
            <p>Estos campos pueden completarse o corregirse cuando la información cambie.</p>
          </div>
        </header>
        <div className="form-grid">
          <FormField error={errors.correo?.message} htmlFor="correo" label="Correo electrónico">
            <Input autoComplete="email" id="correo" type="email" {...register('correo')} />
          </FormField>
          <FormField error={errors.telefono?.message} htmlFor="telefono" label="Teléfono">
            <Input autoComplete="tel" id="telefono" type="tel" {...register('telefono')} />
          </FormField>
        </div>
      </section>
    </>
  );
}
