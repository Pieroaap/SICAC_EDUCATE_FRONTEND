import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { getReactivationRequests, resolveReactivationRequest } from '../api/academicAttendanceApi';

export function ReactivationRequestsPage() {
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ['attendance', 'reactivation-requests', 'pendiente'],
    queryFn: () => getReactivationRequests('pendiente'),
  });
  const resolve = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'aprobada' | 'rechazada' }) => (
      resolveReactivationRequest(id, decision)
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', 'reactivation-requests'] }),
  });
  return (
    <main className="page-shell attendance-page">
      <header className="page-heading"><div><p className="eyebrow">Docencia</p><h1>Reactivaciones por asistencia</h1><p>Solicitudes pendientes de Gestor o Dirección Académica.</p></div></header>
      {resolve.error ? <div className="error-banner">{getApiErrorMessage(resolve.error, 'No pudimos resolver la solicitud.')}</div> : null}
      {requests.isPending ? <div className="table-state">Cargando solicitudes…</div> : null}
      {requests.data?.data.length === 0 ? <div className="table-state">No hay solicitudes pendientes.</div> : null}
      <section className="reactivation-list">
        {requests.data?.data.map((request) => (
          <article key={request.id}>
            <header>
              <div><strong>{request.alumnoApellidoPaterno} {request.alumnoApellidoMaterno} {request.alumnoNombres}</strong><span>{request.alumnoDni}</span></div>
              <span>{request.periodoNombre}</span>
            </header>
            <h2>{request.cursoCodigo} · {request.cursoNombre}</h2>
            <p>{request.motivo}</p>
            <dl className="attendance-summary">
              <div><dt>Faltas al retiro</dt><dd>{request.faltasAlRetiro}</dd></div>
              <div><dt>Tardanzas</dt><dd>{request.tardanzasAlRetiro}</dd></div>
              <div><dt>Equivalentes</dt><dd>{request.faltasEquivalentesAlRetiro}</dd></div>
            </dl>
            <footer>
              <Button disabled={resolve.isPending} onClick={() => resolve.mutate({ id: request.id, decision: 'rechazada' })} variant="secondary">Rechazar</Button>
              <Button disabled={resolve.isPending} onClick={() => resolve.mutate({ id: request.id, decision: 'aprobada' })}>Aprobar y reactivar</Button>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
