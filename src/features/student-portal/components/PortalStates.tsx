import type { LucideIcon } from 'lucide-react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function PortalEmptyState({
  icon: Icon,
  title,
  message,
}: { icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="student-empty-state">
      <span aria-hidden="true"><Icon size={20} /></span>
      <div><strong>{title}</strong><p>{message}</p></div>
    </div>
  );
}

export function PortalErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="student-empty-state is-error" role="alert">
      <span aria-hidden="true"><AlertCircle size={20} /></span>
      <div><strong>No pudimos cargar esta información</strong><p>Revisa tu conexión e inténtalo nuevamente.</p></div>
      <Button onClick={onRetry} variant="secondary">Reintentar</Button>
    </div>
  );
}

export function PortalLoadingState({ rows = 2 }: { rows?: number }) {
  return (
    <div aria-label="Cargando información" className="student-loading-state" role="status">
      <LoaderCircle aria-hidden="true" className="student-loading-state__icon" size={18} />
      <div>{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>
    </div>
  );
}
