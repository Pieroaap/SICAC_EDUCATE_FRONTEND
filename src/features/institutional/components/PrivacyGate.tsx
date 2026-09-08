import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import { acceptPrivacy, getPrivacyStatus, type PrivacyPolicy } from '../api/institutionalApi';
import '../institutional.css';

export function PrivacyGate({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const roles = profile?.roles.map((role) => role.codigo) ?? [];
  const staff = roles.some((role) => ['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO', 'PROFESOR'].includes(role));
  const required = roles.includes('ALUMNO') && (!staff || pathname.startsWith('/portal'));
  return required ? <RequiredPrivacy>{children}</RequiredPrivacy> : children;
}

function RequiredPrivacy({ children }: { children: ReactNode }) {
  const { profile, logout } = useAuth();
  const client = useQueryClient();
  const key = ['privacy-status', profile?.personaId];
  const status = useQuery({ queryKey: key, queryFn: getPrivacyStatus, retry: false, refetchOnMount: 'always' });
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ['privacy-status'] }); };
    window.addEventListener('sicac:privacy-required', refresh);
    return () => window.removeEventListener('sicac:privacy-required', refresh);
  }, [client]);
  if (status.isPending || status.isFetching) return <main className="page-shell"><p role="status">Consultando privacidad…</p></main>;
  if (status.isError) return <main className="page-shell"><div className="error-banner" role="alert">No se pudo consultar la política de privacidad.</div><Button onClick={() => void status.refetch()}>Reintentar</Button><Button onClick={logout} variant="secondary">Cerrar sesión</Button></main>;
  if (!status.data.policy) return <main className="page-shell"><h1>Privacidad pendiente de configuración</h1><p>Comunícate con Administración para habilitar el acceso al portal.</p><Button onClick={logout}>Cerrar sesión</Button></main>;
  if (status.data.accepted) return children;
  return <PrivacyAcceptanceForm key={status.data.policy.id} policy={status.data.policy} onAccepted={() => client.invalidateQueries({ queryKey: key })} />;
}

export function PrivacyAcceptanceForm({ policy, onAccepted }: { policy: PrivacyPolicy; onAccepted: () => Promise<unknown> }) {
  const { logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => acceptPrivacy(policy.id), onSuccess: onAccepted,
    onError: () => { setChecked(false); void client.invalidateQueries({ queryKey: ['privacy-status'] }); },
  });
  return <main className="page-shell"><section className="privacy-card" aria-labelledby="privacy-title">
    <p className="eyebrow">Antes de continuar · Versión {policy.version}</p><h1 id="privacy-title">{policy.titulo}</h1>
    {policy.provisional ? <p className="privacy-notice">Texto provisional pendiente de revisión institucional.</p> : null}
    <div className="institutional-text privacy-text" tabIndex={0}>{policy.contenido}</div>
    <form onSubmit={(event) => { event.preventDefault(); if (checked) mutation.mutate(); }}>
      <label className="privacy-check"><input type="checkbox" checked={checked} disabled={mutation.isPending} onChange={(event) => setChecked(event.target.checked)} /> He leído el texto y acepto el uso de mis datos para las finalidades descritas.</label>
      {mutation.error ? <div className="error-banner" role="alert">{getApiErrorMessage(mutation.error, 'No se pudo registrar la aceptación.')}</div> : null}
      <div className="button-row"><Button type="submit" disabled={!checked || mutation.isPending}>{mutation.isPending ? 'Registrando…' : 'Aceptar y continuar'}</Button><Button type="button" variant="secondary" disabled={mutation.isPending} onClick={logout}>No aceptar y cerrar sesión</Button></div>
    </form>
  </section></main>;
}
