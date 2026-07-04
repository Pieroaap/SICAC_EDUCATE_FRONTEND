import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { getDashboard } from '../api/dashboardApi';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { profile } = useAuth();
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  if (dashboard.isPending) {
    return (
      <main className="page-loading">
        <LoaderCircle className="animate-spin" size={24} />
        <span>Preparando tu espacio de trabajo…</span>
      </main>
    );
  }

  if (dashboard.isError) {
    return (
      <main className="page-shell">
        <section className="empty-panel">
          <h1>Tu espacio está listo</h1>
          <p>No pudimos cargar el resumen en este momento.</p>
          <button onClick={() => void dashboard.refetch()} type="button">Intentar nuevamente</button>
        </section>
      </main>
    );
  }

  const data = dashboard.data;
  const firstName = profile?.nombres.split(' ')[0] ?? '';

  return (
    <main className="page-shell">
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">Panel general</p>
          <h1>Bienvenid@, {firstName}</h1>
        </div>
        {data.periodoActivo ? (
          <div className="active-period">
            <CalendarDays size={18} />
            <span>
              Periodo activo
              <strong>{data.periodoActivo.nombre}</strong>
            </span>
          </div>
        ) : null}
      </header>

      {data.alerts.length > 0 ? (
        <section className="dashboard-alerts" aria-label="Alertas">
          {data.alerts.map((alert) => (
            <article key={alert.key}>
              <TriangleAlert size={20} />
              <div>
                <strong>{alert.count}</strong>
                <span>{alert.label}</span>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {data.metrics.length > 0 ? (
        <section className="metric-grid" aria-label="Resumen">
          {data.metrics.map((metric) => (
            <article className="metric" key={metric.key}>
              <span>{metric.label}</span>
              <strong>{metric.value.toLocaleString('es-PE')}</strong>
            </article>
          ))}
        </section>
      ) : (
        <section className="welcome-panel">
          <h2>No tienes pendientes que mostrar por ahora.</h2>
        </section>
      )}

      {data.quickActions.length > 0 ? (
        <section className="quick-actions">
          <header>
            <p className="eyebrow">Accesos permitidos</p>
            <h2>¿Qué quieres hacer ahora?</h2>
          </header>
          <div>
            {data.quickActions.map((action) => (
              <Link className="quick-action" key={action.key} to={action.to}>
                {action.label}
                <ArrowRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
