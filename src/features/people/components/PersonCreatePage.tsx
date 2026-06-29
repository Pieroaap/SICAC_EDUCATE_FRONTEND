import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { createPerson } from '../api/peopleApi';
import {
  createPersonSchema,
  emptyCreatePersonValues,
  emptyPersonValues,
  toCreatePersonPayload,
  type CreatePersonFormInput,
  type CreatePersonValues,
} from '../personForm';
import {
  benefitOptions,
  benefitTypeOptions,
  studentStateOptions,
} from '../studentProfileOptions';
import { PersonFormSections } from './PersonFormSections';

const roleOptions = [
  { value: 'ALUMNO', label: 'Alumno', description: 'Crea identidad, rol Alumno y perfil académico.' },
  { value: 'PROFESOR', label: 'Profesor', description: 'Crea identidad y rol docente.' },
  { value: 'GESTOR_ACADEMICO', label: 'Gestor académico', description: 'Crea identidad y rol de gestión.' },
  { value: 'DIRECTOR_ACADEMICO', label: 'Director académico', description: 'Crea identidad y rol directivo.' },
  { value: 'ADMINISTRADOR_SISTEMA', label: 'Administrador', description: 'Crea identidad y rol administrativo.' },
  { value: 'TUTOR', label: 'Tutor / apoderado', description: 'Crea persona sin rol de sistema.' },
] as const;

function fieldError(error: unknown) {
  return typeof error === 'object' && error && 'message' in error
    ? String(error.message ?? '')
    : undefined;
}

function getContextTitle(role: CreatePersonValues['initialRole']) {
  if (role === 'ALUMNO') return 'Crear alumno';
  if (role === 'PROFESOR') return 'Crear profesor';
  return 'Nueva persona';
}

function getContextDescription(role: CreatePersonValues['initialRole']) {
  if (role === 'ALUMNO') {
    return 'Crea la identidad del alumno, su perfil académico editable y, si corresponde, su tutor inicial.';
  }
  if (role === 'PROFESOR') {
    return 'Crea la identidad del docente con el rol Profesor ya seleccionado.';
  }
  return 'Crea una identidad con rol inicial. Los tutores pueden existir sin rol de sistema.';
}

export function PersonCreatePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRoleParam = searchParams.get('rol');
  const defaultInitialRole = roleOptions.some((role) => role.value === initialRoleParam)
    ? initialRoleParam as CreatePersonValues['initialRole']
    : emptyCreatePersonValues.initialRole;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreatePersonFormInput, unknown, CreatePersonValues>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: {
      ...emptyCreatePersonValues,
      initialRole: defaultInitialRole,
    },
  });
  const initialRole = useWatch({ control, name: 'initialRole' });
  const includeTutor = useWatch({ control, name: 'includeTutor' });
  const roleDescription = roleOptions.find((role) => role.value === initialRole)?.description;

  const createMutation = useMutation({
    mutationFn: createPerson,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['people'] }),
        queryClient.invalidateQueries({ queryKey: ['students'] }),
        queryClient.invalidateQueries({ queryKey: ['teachers'] }),
      ]);
      const createdId = typeof result === 'object' && result && 'person' in result
        && typeof result.person === 'object' && result.person && 'id' in result.person
        ? String(result.person.id)
        : undefined;
      navigate(createdId ? `/personas/${createdId}` : '/personas', { replace: true, state: { created: true } });
    },
    onError: (error) => {
      setSubmitError(getApiErrorMessage(error, 'No pudimos crear la persona.'));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setSubmitError(null);
    createMutation.mutate(toCreatePersonPayload(values));
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
          <h1>{getContextTitle(defaultInitialRole)}</h1>
          <p>{getContextDescription(defaultInitialRole)}</p>
        </div>
      </header>

      <form className="entity-form" noValidate onSubmit={onSubmit}>
        <PersonFormSections errors={errors} register={register} />

        <section>
          <header>
            <span>03</span>
            <div>
              <h2>Rol inicial</h2>
              <p>{roleDescription}</p>
            </div>
          </header>
          <div className="role-choice-grid">
            {roleOptions.map((role) => (
              <label className="role-choice" key={role.value}>
                <input
                  type="radio"
                  value={role.value}
                  {...register('initialRole')}
                />
                <strong>{role.label}</strong>
                <span>{role.description}</span>
              </label>
            ))}
          </div>
        </section>

        {initialRole === 'ALUMNO' ? (
          <section>
            <header>
              <span>04</span>
              <div>
                <h2>Perfil de alumno</h2>
                <p>Datos académicos editables del alumno. No afectan el estado base de la persona.</p>
              </div>
            </header>
            <div className="form-grid">
              <FormField error={fieldError(errors.alumnoPerfil?.estado)} htmlFor="alumnoEstado" label="Estado operativo">
                <select className="form-select" id="alumnoEstado" {...register('alumnoPerfil.estado')}>
                  {studentStateOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField error={fieldError(errors.alumnoPerfil?.anioIngreso)} htmlFor="anioIngreso" label="Año de ingreso">
                <Input id="anioIngreso" inputMode="numeric" type="number" {...register('alumnoPerfil.anioIngreso')} />
              </FormField>
              <FormField error={fieldError(errors.alumnoPerfil?.periodoIngreso)} htmlFor="periodoIngreso" label="Periodo de ingreso">
                <Input id="periodoIngreso" placeholder="2026-I" {...register('alumnoPerfil.periodoIngreso')} />
              </FormField>
              <FormField error={fieldError(errors.alumnoPerfil?.beneficio)} htmlFor="beneficio" label="Beneficio">
                <select className="form-select" id="beneficio" {...register('alumnoPerfil.beneficio')}>
                  {benefitOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField error={fieldError(errors.alumnoPerfil?.tipoBeneficio)} htmlFor="tipoBeneficio" label="Tipo de beneficio">
                <select className="form-select" id="tipoBeneficio" {...register('alumnoPerfil.tipoBeneficio')}>
                  {benefitTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </section>
        ) : null}

        {initialRole === 'ALUMNO' ? (
          <section>
            <header>
              <span>05</span>
              <div>
                <h2>Tutor inicial</h2>
                <p>Opcional. Crea una segunda persona sin rol y la vincula como tutor activo.</p>
              </div>
            </header>
            <div className="guardian-create-block">
              <label className="inline-check">
                <input
                  type="checkbox"
                  {...register('includeTutor')}
                  onChange={(event) => {
                    setValue('includeTutor', event.target.checked);
                    if (event.target.checked) {
                      setValue('tutor', {
                        ...emptyPersonValues,
                        tipoRelacion: '',
                        fechaInicio: new Date().toISOString().slice(0, 10),
                      });
                    } else {
                      setValue('tutor', undefined);
                    }
                  }}
                />
                <span>Crear tutor junto con el alumno</span>
              </label>

              {includeTutor ? (
                <div className="guardian-create-form">
                  <div className="form-grid">
                    <FormField error={fieldError(errors.tutor?.tipoDocumento)} htmlFor="tutorTipoDocumento" label="Tipo de documento">
                      <select className="form-select" id="tutorTipoDocumento" {...register('tutor.tipoDocumento')}>
                        <option value="dni">DNI</option>
                        <option value="pasaporte">Pasaporte</option>
                        <option value="carnet_extranjeria">Carnet de extranjería</option>
                        <option value="otro">Otro</option>
                      </select>
                    </FormField>
                    <FormField error={fieldError(errors.tutor?.numeroDocumento)} htmlFor="tutorDocumento" label="Número de documento">
                      <Input id="tutorDocumento" inputMode="numeric" {...register('tutor.numeroDocumento')} />
                    </FormField>
                    <FormField error={fieldError(errors.tutor?.nombres)} htmlFor="tutorNombres" label="Nombres">
                      <Input id="tutorNombres" {...register('tutor.nombres')} />
                    </FormField>
                    <FormField error={fieldError(errors.tutor?.apellidoPaterno)} htmlFor="tutorApellidoPaterno" label="Apellido paterno">
                      <Input id="tutorApellidoPaterno" {...register('tutor.apellidoPaterno')} />
                    </FormField>
                    <FormField error={fieldError(errors.tutor?.apellidoMaterno)} htmlFor="tutorApellidoMaterno" label="Apellido materno">
                      <Input id="tutorApellidoMaterno" {...register('tutor.apellidoMaterno')} />
                    </FormField>
                    <FormField error={fieldError(errors.tutor?.tipoRelacion)} htmlFor="tutorRelacion" label="Parentesco">
                      <Input id="tutorRelacion" placeholder="Madre, padre, apoderado…" {...register('tutor.tipoRelacion')} />
                    </FormField>
                    <FormField error={fieldError(errors.tutor?.telefono)} htmlFor="tutorTelefono" label="Teléfono">
                      <Input id="tutorTelefono" type="tel" {...register('tutor.telefono')} />
                    </FormField>
                    <FormField error={fieldError(errors.tutor?.correo)} htmlFor="tutorCorreo" label="Correo">
                      <Input id="tutorCorreo" type="email" {...register('tutor.correo')} />
                    </FormField>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

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
