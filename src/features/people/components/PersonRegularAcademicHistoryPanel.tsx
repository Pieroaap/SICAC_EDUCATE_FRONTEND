import { useQuery } from '@tanstack/react-query';
import { getRegularAcademicHistory } from '../../academic-evaluation/api/academicEvaluationApi';

export function PersonRegularAcademicHistoryPanel({ personId }: { personId: string }) {
  const history = useQuery({
    queryKey: ['academic-history', personId],
    queryFn: () => getRegularAcademicHistory(personId),
  });
  return (
    <div className="detail-panel academic-records-panel">
      <header><div><h3>Resultados regulares</h3><p>Notas finales de actas académicas publicadas.</p></div></header>
      {history.isPending ? <p>Cargando resultados…</p> : null}
      {history.isError ? <p className="field-error">No pudimos cargar el historial regular.</p> : null}
      {history.data?.data.length === 0 ? <p>Aún no existen actas publicadas para este alumno.</p> : null}
      <ul className="academic-result-list">
        {history.data?.data.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.cursoCodigo} · {item.cursoNombre}</strong>
              <small>{item.periodoNombre} · Ciclo {item.ciclo}</small>
            </div>
            <span>{Number(item.notaFinal).toFixed(2)}</span>
            <b>{item.letra}</b>
            <em className={`is-${item.resultado}`}>{item.resultado}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
