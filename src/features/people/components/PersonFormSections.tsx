import type { FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { FormField } from '../../../components/FormField';
import { Input } from '../../../components/ui/Input';
import type { PersonValues } from '../personForm';

type PersonFormSectionsProps<T extends FieldValues & PersonValues = PersonValues> = {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  titlePrefix?: string;
};

function fieldError(error: unknown) {
  return typeof error === 'object' && error && 'message' in error
    ? String(error.message ?? '')
    : undefined;
}

export function PersonFormSections<T extends FieldValues & PersonValues = PersonValues>({
  register,
  errors,
  titlePrefix,
}: PersonFormSectionsProps<T>) {
  const prefix = titlePrefix ? `${titlePrefix} · ` : '';
  return (
    <>
      <section>
        <header>
          <span>01</span>
          <div>
            <h2>{prefix}Documento e identidad</h2>
            <p>Usa los datos tal como aparecen en el documento.</p>
          </div>
        </header>
        <div className="form-grid">
          <FormField error={fieldError(errors.tipoDocumento)} htmlFor="tipoDocumento" label="Tipo de documento">
            <select className="form-select" id="tipoDocumento" {...register('tipoDocumento' as Path<T>)}>
              <option value="dni">DNI</option>
              <option value="pasaporte">Pasaporte</option>
              <option value="carnet_extranjeria">Carnet de extranjería</option>
              <option value="otro">Otro</option>
            </select>
          </FormField>
          <FormField error={fieldError(errors.numeroDocumento)} htmlFor="numeroDocumento" label="Número de documento">
            <Input id="numeroDocumento" inputMode="numeric" {...register('numeroDocumento' as Path<T>)} />
          </FormField>
          <FormField error={fieldError(errors.nombres)} htmlFor="nombres" label="Nombres">
            <Input id="nombres" {...register('nombres' as Path<T>)} />
          </FormField>
          <FormField error={fieldError(errors.apellidoPaterno)} htmlFor="apellidoPaterno" label="Apellido paterno">
            <Input id="apellidoPaterno" {...register('apellidoPaterno' as Path<T>)} />
          </FormField>
          <FormField error={fieldError(errors.apellidoMaterno)} htmlFor="apellidoMaterno" label="Apellido materno">
            <Input id="apellidoMaterno" {...register('apellidoMaterno' as Path<T>)} />
          </FormField>
          <FormField error={fieldError(errors.fechaNacimiento)} htmlFor="fechaNacimiento" label="Fecha de nacimiento">
            <Input id="fechaNacimiento" type="date" {...register('fechaNacimiento' as Path<T>)} />
          </FormField>
        </div>
      </section>

      <section>
        <header>
          <span>02</span>
          <div>
            <h2>{prefix}Contacto</h2>
            <p>Estos campos pueden completarse o corregirse cuando la información cambie.</p>
          </div>
        </header>
        <div className="form-grid">
          <FormField error={fieldError(errors.correo)} htmlFor="correo" label="Correo electrónico">
            <Input autoComplete="email" id="correo" type="email" {...register('correo' as Path<T>)} />
          </FormField>
          <FormField error={fieldError(errors.telefono)} htmlFor="telefono" label="Teléfono">
            <Input autoComplete="tel" id="telefono" type="tel" {...register('telefono' as Path<T>)} />
          </FormField>
        </div>
      </section>
    </>
  );
}
