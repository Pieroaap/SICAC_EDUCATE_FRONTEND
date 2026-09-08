import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { RoleCode } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { getAcademicRecords } from '../../academic-operation/api/academicOperationApi';
import { RecognitionDialog } from '../../academic-operation/components/RecognitionDialog';

export function PersonAcademicRecordsPanel({ actorRoles, personId }: { actorRoles: RoleCode[]; personId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const canAuthorize = actorRoles.some((role) => role === 'DIRECTOR_ACADEMICO' || role === 'ADMINISTRADOR_SISTEMA');
  const records = useQuery({ queryKey: ['academic-records', personId], queryFn: () => getAcademicRecords(personId) });
  return <div className="detail-panel academic-history-card">
    <div className="academic-history-card__heading"><div><h3>Antecedentes académicos reconocidos</h3><p>Cursos aprobados antes de ingresar a SICAC.</p></div>
      {canAuthorize ? <Button onClick={() => { setSaved(false); setShowForm(true); }} type="button" variant="secondary"><Plus size={16} /> Reconocer cursos históricos</Button> : null}
    </div>
    {saved ? <p role="status">Reconocimientos guardados. Los cursos no seleccionados conservan su estado.</p> : null}
    {records.isPending ? <p>Cargando antecedentes…</p> : null}
    {records.isError ? <div className="error-banner">No se pudieron cargar los antecedentes.</div> : null}
    {records.data?.data.length === 0 ? <p className="operation-empty">No hay antecedentes reconocidos.</p> : null}
    {records.data?.data.length ? <ul className="detail-list">{records.data.data.map((item) => <li key={item.id}>
      <div><strong>{item.cursoNombre}</strong><span>Aprobado por reconocimiento</span></div>
      <small>{item.cursoCodigo} · Ciclo {item.ciclo} · {item.fechaReferencial ?? item.periodoReferencial}</small>
      <small>Sin nota registrada en este antecedente</small>
      {item.observacion ? <small>{item.observacion}</small> : null}
    </li>)}</ul> : null}
    {!canAuthorize ? <small>Administración y Dirección Académica pueden reconocer cursos históricos.</small> : null}
    {showForm ? <RecognitionDialog personId={personId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); setSaved(true); }} /> : null}
  </div>;
}
