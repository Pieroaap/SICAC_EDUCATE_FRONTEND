import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../AuthProvider';
import { AuthLayout } from './AuthLayout';

const loginSchema = z.object({
  dni: z.string().trim().min(1, 'Ingresa tu DNI').max(30, 'Máximo 30 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { status, profile, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { dni: '', password: '' },
  });

  if (status === 'authenticated' && profile) {
    return <Navigate replace to={profile.mustChangePassword ? '/cambiar-clave' : '/'} />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const nextProfile = await login(values);
      navigate(nextProfile.mustChangePassword ? '/cambiar-clave' : '/', { replace: true });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'No pudimos iniciar sesión. Revisa tus credenciales.'));
    }
  });

  return (
    <AuthLayout>
      <div className="auth-card">
        <header className="grid gap-2">
          <p className="eyebrow">Acceso institucional</p>
          <h1>Bienvenido</h1>
          <p>Ingresa tus credenciales para acceder al sistema.</p>
        </header>

        {typeof location.state === 'object'
          && location.state
          && 'passwordChanged' in location.state ? (
            <div className="success-banner" role="status">
              Tu contraseña fue actualizada. Inicia sesión nuevamente.
            </div>
          ) : null}

        <form className="grid gap-5" noValidate onSubmit={onSubmit}>
          <FormField error={errors.dni?.message} htmlFor="dni" label="DNI">
            <Input
              autoComplete="username"
              autoFocus
              inputMode="numeric"
              placeholder="Ingresa tu número de documento"
              {...register('dni')}
              id="dni"
            />
          </FormField>

          <FormField error={errors.password?.message} htmlFor="password" label="Contraseña">
            <div className="relative">
              <Input
                autoComplete="current-password"
                className="pr-12"
                placeholder="Ingresa tu contraseña"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                id="password"
              />
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </FormField>

          {submitError ? <div className="error-banner" role="alert">{submitError}</div> : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="animate-spin" size={18} /> : null}
            {isSubmitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
