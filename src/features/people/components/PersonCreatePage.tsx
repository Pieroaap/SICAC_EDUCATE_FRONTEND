import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { createPerson } from '../api/peopleApi';

const optionalText = (max: number) => z.string().trim().max(max).optional();
const personSchema = z.object({
  tipoDocumento: z.enum(['dni', 'pasaporte', 'carnet_extranjeria', 'otro']),
  numeroDocumento: z.string().trim().min(1, 'Ingresa el documento').max(30),
  nombres: z.string().trim().min(1, 'Ingresa los nombres').max(150),
  apellidoPaterno: z.string().trim().min(1, 'Ingresa el apellido paterno').max(100),
  apellidoMaterno: optionalText(100),
  correo: z.union([z.literal(''), z.email('Ingresa un correo válido')]).optional(),
  telefono: optionalText(30),
  fechaNacimiento: z.string().optional(),
});

type PersonValues = z.infer<typeof personSchema>;

function removeEmptyOptionalValues(values: PersonValues) {
  return {
    ...values,
    apellidoMaterno: values.apellidoMaterno || undefined,
    correo: values.correo || undefined,
    telefono: values.telefono || undefined,
    fechaNacimiento: values.fechaNacimiento || undefined,
  };
}

export function PersonCreatePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      tipoDocumento: 'dni',
      numeroDocumento: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      correo: '',
      telefono: '',
      fechaNacimiento: '',
    },
  });
  const createMutation = useMutation({
    mutationFn: createPerson,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['people'] });
      navigate('/personas', { replace: true, state: { created: true } });
    },
    onError: (error) => {
      setSubmitError(getApiErrorMessage(error, 'No pudimos crear la persona.'));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    createMutation.mutate(removeEmptyOptionalValues(values));
  });

  return (
    <main className="page-shell form-page">
      <Link className="back-link" to="/personas">
        <ArrowLeft size={17} />
        Volver a Personas
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Identidad</p>
          <h1>Nueva persona</h1>
          <p>Crea una identidad base. El acceso y los roles se asignan por separado.</p>
        </div>
      </header>

      <form className="entity-form" noValidate onSubmit={onSubmit}>
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
              <Input inputMode="numeric" id="numeroDocumento" {...register('numeroDocumento')} />
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
              <p>Estos campos son opcionales y pueden completarse después.</p>
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

        {submitError ? <div className="error-banner" role="alert">{submitError}</div> : null}

        <footer className="form-actions">
          <Button asChild variant="secondary"><Link to="/personas">Cancelar</Link></Button>
          <Button disabled={createMutation.isPending} type="submit">
            {createMutation.isPending ? <LoaderCircle className="animate-spin" size={18} /> : null}
            Crear persona
          </Button>
        </footer>
      </form>
    </main>
  );
}
