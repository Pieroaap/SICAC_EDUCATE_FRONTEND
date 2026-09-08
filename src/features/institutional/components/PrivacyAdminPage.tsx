import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getPrivacyAcceptances, getPrivacyPolicies, getPrivacyStatus, publishPrivacy, type PrivacyPolicy } from '../api/institutionalApi';
import '../institutional.css';

const schema = z.object({ version: z.string().trim().min(1, 'Indique una versión nueva.').max(60), titulo: z.string().trim().min(1).max(180), contenido: z.string().trim().min(1).max(30000), provisional: z.boolean() });
type Values = z.infer<typeof schema>;
export function PrivacyAdminPage() {
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [policyPage, setPolicyPage] = useState(1);
  const [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const current = useQuery({ queryKey: ['privacy-admin-current'], queryFn: getPrivacyStatus });
  const policies = useQuery({ queryKey: ['privacy-policies', policyPage], queryFn: () => getPrivacyPolicies(policyPage) });
  const registry = useQuery({ queryKey: ['privacy-registry', page], queryFn: () => getPrivacyAcceptances(page) });
  return <main className="page-shell"><header className="page-heading"><div><p className="eyebrow">Administración</p><h1>Privacidad y consentimientos</h1><p>Edite el texto mediante una nueva versión. Las aceptaciones anteriores conservan su texto original.</p></div><Button disabled={current.isPending || current.isError} onClick={() => { setSaved(false); setEditing(true); }}>Editar texto vigente</Button></header>
    {saved ? <p role="status">Nueva versión publicada. Los alumnos deberán leerla y aceptarla.</p> : null}
    {current.isPending ? <p role="status">Cargando texto vigente…</p> : null}
    {current.isError ? <div className="error-banner" role="alert">No se pudo consultar el texto. <Button onClick={() => void current.refetch()}>Reintentar</Button></div> : null}
    {editing ? <PolicyEditor policy={current.data?.policy ?? null} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); setSaved(true); await Promise.all([
      client.invalidateQueries({ queryKey: ['privacy-admin-current'] }), client.invalidateQueries({ queryKey: ['privacy-policies'] }), client.invalidateQueries({ queryKey: ['privacy-status'] }),
    ]); }} /> : current.data?.policy ? <section className="detail-panel"><h2>{current.data.policy.titulo}</h2><p>Versión {current.data.policy.version} {current.data.policy.provisional ? '· Provisional: requiere revisión institucional' : ''}</p><div className="institutional-text">{current.data.policy.contenido}</div></section> : null}
    <section className="detail-panel"><h2>Versiones publicadas</h2>{policies.isPending ? <p>Cargando versiones…</p> : null}
      {policies.isError ? <p role="alert">No se pudieron cargar las versiones. <Button onClick={() => void policies.refetch()}>Reintentar</Button></p> : null}
      {policies.data?.data.map((policy) => <details key={policy.id}><summary>{policy.version} · {policy.vigente ? 'Vigente' : 'Anterior'} · {new Date(policy.publicadaAt).toLocaleString('es-PE')}</summary><h3>{policy.titulo}</h3><div className="institutional-text">{policy.contenido}</div></details>)}
      <div className="institutional-pagination"><Button variant="secondary" disabled={policyPage === 1 || policies.isFetching} onClick={() => setPolicyPage(policyPage - 1)}>Versiones anteriores</Button><span>Página {policyPage}</span><Button variant="secondary" disabled={!policies.data || policyPage >= policies.data.pagination.totalPages || policies.isFetching} onClick={() => setPolicyPage(policyPage + 1)}>Más versiones</Button></div>
    </section>
    <section className="detail-panel"><h2>Registro de aceptaciones</h2><p>Fecha y hora registradas por el servidor; la versión identifica el texto aceptado.</p>
      {registry.isPending ? <p>Cargando registro…</p> : null}{registry.isError ? <p role="alert">No se pudo cargar el registro. <Button onClick={() => void registry.refetch()}>Reintentar</Button></p> : null}
      {registry.data?.data.length === 0 ? <p>Aún no hay aceptaciones registradas.</p> : null}
      <ul className="detail-list">{registry.data?.data.map((row) => <li key={`${row.personaId}-${row.politicaId}`}><strong>{row.apellidoPaterno} {row.apellidoMaterno}, {row.nombres}</strong><span>Versión {row.version} · {new Date(row.aceptadaAt).toLocaleString('es-PE')}</span></li>)}</ul>
      <div className="institutional-pagination"><Button variant="secondary" disabled={page === 1 || registry.isFetching} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, registry.data?.pagination.totalPages ?? 1)}</span><Button variant="secondary" disabled={!registry.data || page >= registry.data.pagination.totalPages || registry.isFetching} onClick={() => setPage(page + 1)}>Siguiente</Button></div>
    </section>
  </main>;
}
function PolicyEditor({ policy, onCancel, onSaved }: { policy: PrivacyPolicy | null; onCancel: () => void; onSaved: () => Promise<void> }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { version: '', titulo: policy?.titulo ?? '', contenido: policy?.contenido ?? '', provisional: policy?.provisional ?? true } });
  const mutation = useMutation({ mutationFn: publishPrivacy, onSuccess: onSaved });
  return <section className="detail-panel"><h2>Publicar una nueva versión</h2><form className="institutional-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
    <FormField label="Nueva versión" htmlFor="policy-version" error={form.formState.errors.version?.message}><Input id="policy-version" placeholder="Ej. 2026-09-v2" {...form.register('version')} /></FormField>
    <FormField label="Título" htmlFor="policy-title" error={form.formState.errors.titulo?.message}><Input id="policy-title" {...form.register('titulo')} /></FormField>
    <FormField label="Texto de privacidad" htmlFor="policy-content" error={form.formState.errors.contenido?.message}><textarea id="policy-content" className="form-textarea" {...form.register('contenido')} /></FormField>
    <label className="institutional-file"><input type="checkbox" {...form.register('provisional')} /> Texto provisional pendiente de revisión institucional</label>
    {mutation.error ? <div className="error-banner" role="alert">{getApiErrorMessage(mutation.error, 'No se pudo publicar la política.')}</div> : null}
    <div className="button-row"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Publicando…' : 'Publicar nueva versión'}</Button><Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onCancel}>Cancelar</Button></div>
  </form></section>;
}
