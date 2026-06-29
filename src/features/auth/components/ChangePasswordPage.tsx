import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { clearSession } from '../../../lib/session';
import { useAuth } from '../AuthProvider';
import { changePassword } from '../api/authApi';
import { AuthLayout } from './AuthLayout';

const schema = z.object({
  nuevaClave: z.string().min(8, 'Usa al menos 8 caracteres').max(72),
  confirmarClave: z.string(),
}).refine((values) => values.nuevaClave === values.confirmarClave, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmarClave'],
});

type Values = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const { profile, status, logout } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  if (status === 'anonymous') return <Navigate replace to="/login" />;
  if (status === 'authenticated' && profile && !profile.mustChangePassword) {
    return <Navigate replace to="/" />;
  }

  const onSubmit = handleSubmit(async ({ nuevaClave }) => {
    setSubmitError(null);
    try {
      await changePassword(nuevaClave);
      clearSession();
      logout();
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'No pudimos actualizar la contraseña.'));
    }
  });

  return (
    <AuthLayout>
      <div className="auth-card">
        <header className="grid gap-2">
          <p className="eyebrow">Primer acceso</p>
          <h1>Crea una nueva contraseña</h1>
          <p>La clave temporal debe reemplazarse antes de continuar.</p>
        </header>
        <form className="grid gap-5" noValidate onSubmit={onSubmit}>
          <FormField error={errors.nuevaClave?.message} htmlFor="nuevaClave" label="Nueva contraseña">
            <Input autoComplete="new-password" type="password" {...register('nuevaClave')} id="nuevaClave" />
          </FormField>
          <FormField error={errors.confirmarClave?.message} htmlFor="confirmarClave" label="Confirma la contraseña">
            <Input autoComplete="new-password" type="password" {...register('confirmarClave')} id="confirmarClave" />
          </FormField>
          {submitError ? <div className="error-banner" role="alert">{submitError}</div> : null}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="animate-spin" size={18} /> : null}
            Actualizar contraseña
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
