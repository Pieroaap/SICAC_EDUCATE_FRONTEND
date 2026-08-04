import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { cancelPreEnrollment, confirmPreEnrollment, listEligibilities, listPreEnrollments, recalculate } from '../api/promotionApi';

export function PromotionPage() {
  const client = useQueryClient(); const [personaId, setPersonaId] = useState(''); const refresh = () => client.invalidateQueries({ queryKey: ['promotion'] });
  const eligible = useQuery({ queryKey: ['promotion', 'eligibilities'], queryFn: listEligibilities });
  const proposals = useQuery({ queryKey: ['promotion', 'proposals'], queryFn: listPreEnrollments });
  const calculate = useMutation({ mutationFn: () => recalculate(personaId), onSuccess: refresh });
  const confirm = useMutation({ mutationFn: confirmPreEnrollment, onSuccess: refresh }); const cancel = useMutation({ mutationFn: cancelPreEnrollment, onSuccess: refresh });
  return <main className="page-shell"><header className="page-heading"><div><p className="eyebrow">Continuidad académica</p><h1>Promoción y preinscripción</h1><p>Propuestas revisables; nunca matricula automáticamente.</p></div></header>
    <form className="detail-panel promotion-calculate" onSubmit={(event) => { event.preventDefault(); calculate.mutate(); }}><Input onChange={(event) => setPersonaId(event.target.value)} placeholder="UUID del alumno" required value={personaId}/><Button disabled={calculate.isPending} type="submit">Recalcular alumno</Button></form>
    <section><h2>Habilitaciones</h2><div className="portal-grid">{eligible.data?.data.map((item) => <article className="portal-card" key={item.id}><span className="eyebrow">{item.estado}</span><h3>Ciclo {item.cicloOrigen} → {item.cicloDestino ?? 'egreso'}</h3><p>Alumno: {item.personaId}</p></article>)}</div></section>
    <section><h2>Propuestas</h2><div className="portal-grid">{proposals.data?.data.map((item) => <article className="portal-card" key={item.id}><span className="eyebrow">{item.estado}</span><h3>{item.cursos.length} cursos propuestos</h3>{!['confirmada', 'cancelada'].includes(item.estado) ? <div className="button-row"><Button onClick={() => confirm.mutate(item.id)} type="button">Confirmar</Button><Button onClick={() => cancel.mutate(item.id)} type="button" variant="ghost">Cancelar</Button></div> : null}</article>)}</div></section>
  </main>;
}
