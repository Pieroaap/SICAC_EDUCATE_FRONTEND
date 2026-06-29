import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { createPerson } from '../api/peopleApi';
import { emptyPersonValues, personSchema, toPersonPayload, type PersonValues } from '../personForm';
import { PersonFormSections } from './PersonFormSections';

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
    defaultValues: emptyPersonValues,
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
    createMutation.mutate(toPersonPayload(values));
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
        <PersonFormSections errors={errors} register={register} />

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
