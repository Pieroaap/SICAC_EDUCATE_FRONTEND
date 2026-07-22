import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPortalHistory } from '../api/studentPortalApi';
import { PortalEmptyState, PortalErrorState, PortalLoadingState } from './PortalStates';

export function StudentHistoryPage() {
  const history = useQuery({ queryKey: ['portal', 'history'], queryFn: getPortalHistory });
  const periods = history.data?.reduce<Record<string, typeof history.data>>((groups, item) => {
    (groups[item.periodoNombre] ??= []).push(item);
    return groups;
  }, {});

  return (
    <main className="page-shell student-detail-page">
      <Link className="student-back-link" to="/portal"><ArrowLeft size={18} /> Volver a mi portal</Link>
      <header className="page-heading"><div><p className="eyebrow">Resultados oficiales</p><h1>Mi historial académico</h1><p>Solo aparecen cursos con actas publicadas.</p></div></header>
      {history.isPending ? <PortalLoadingState rows={3} /> : history.isError ? <PortalErrorState onRetry={() => void history.refetch()} /> : history.data?.length ? (
        <div className="student-history-periods">
          {Object.entries(periods ?? {}).map(([period, items]) => (
            <section key={period}><h2>{period}</h2><div>{items.map((item) => (
              <article key={item.id}>
                <div><small>{item.cursoCodigo}</small><strong>{item.cursoNombre}</strong></div>
                <span className={`grade-letter is-${item.letra}`}>{item.letra}</span>
                <strong>{item.notaFinal}</strong>
                <em className={`is-${item.resultado}`}>{item.resultado}</em>
              </article>
            ))}</div></section>
          ))}
        </div>
      ) : <PortalEmptyState icon={GraduationCap} title="Todavía no tienes resultados publicados" message="El historial se completará cuando se publiquen las actas de tus cursos." />}
    </main>
  );
}
