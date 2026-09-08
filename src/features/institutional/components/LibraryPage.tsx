import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/FormField';
import { useAuth } from '../../auth/AuthProvider';
import { downloadDocument, removeDocument } from '../../documents/api/documentsApi';
import { getLibrary, publishLibraryFile } from '../api/libraryApi';
import '../institutional.css';

const schema = z.object({ compartir: z.boolean().refine(Boolean, 'Confirme la publicación del documento institucional.') });
type Values = z.infer<typeof schema>;
export function LibraryPage() {
  const { profile } = useAuth();
  const canPublish = profile?.roles.some((role) => ['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO'].includes(role.codigo));
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const files = useQuery({ queryKey: ['institutional-library', profile?.personaId, page], queryFn: () => getLibrary(page) });
  const refresh = async () => { await Promise.all([
    client.invalidateQueries({ queryKey: ['institutional-library'] }), client.invalidateQueries({ queryKey: ['library-options'] }),
    client.invalidateQueries({ queryKey: ['institutional-news'] }), client.invalidateQueries({ queryKey: ['documents'] }),
  ]); };
  const remove = useMutation({ mutationFn: removeDocument, onSuccess: refresh });
  const download = useMutation({ mutationFn: downloadDocument });
  return <main className="page-shell"><header className="page-heading"><div><p className="eyebrow">Comunidad</p><h1>Documentos institucionales</h1><p>Horarios, reglamentos y archivos compartidos por la institución.</p></div></header>
    {canPublish ? <LibraryPublisher onPublished={refresh} /> : null}
    {files.isPending ? <p role="status">Cargando documentos…</p> : null}
    {files.isError ? <div className="error-banner" role="alert">No se pudieron cargar los documentos. <Button variant="secondary" onClick={() => void files.refetch()}>Reintentar</Button></div> : null}
    {files.data?.data.length === 0 ? <p className="operation-empty">No hay documentos institucionales publicados.</p> : null}
    {remove.error || download.error ? <div className="error-banner" role="alert">{getApiErrorMessage(remove.error ?? download.error, 'No se pudo completar la acción.')}</div> : null}
    <section className="institutional-list">{files.data?.data.map((file) => <article className="institutional-post" key={file.id}>
      <header><span>{Math.ceil(file.tamanoBytes / 1024)} KiB</span></header><h2>{file.nombreOriginal}</h2>
      <footer><Button variant="secondary" disabled={download.isPending} onClick={() => download.mutate(file.id)}>Descargar</Button>{canPublish ? <Button variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate(file.id)}>Retirar archivo</Button> : null}</footer>
    </article>)}</section>
    <div className="institutional-pagination"><Button variant="secondary" disabled={page === 1 || files.isFetching} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, files.data?.pagination.totalPages ?? 1)}</span><Button variant="secondary" disabled={!files.data || page >= files.data.pagination.totalPages || files.isFetching} onClick={() => setPage(page + 1)}>Siguiente</Button></div>
  </main>;
}

function LibraryPublisher({ onPublished }: { onPublished: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [success, setSuccess] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { compartir: false } });
  const upload = useMutation({ mutationFn: (values: Values) => publishLibraryFile(file!, values.compartir), onSuccess: async () => {
    setFile(null); form.reset(); if (ref.current) ref.current.value = ''; setSuccess(true); await onPublished();
  } });
  return <section className="detail-panel"><h2>Publicar un documento institucional</h2><p>Comparte archivos para que alumnos y profesores puedan consultarlos y descargarlos.</p>
    {success ? <p role="status">Documento institucional publicado.</p> : null}
    <form className="institutional-form" onSubmit={form.handleSubmit((values) => {
      if (!file || file.size === 0 || file.size > 10 * 1024 * 1024) { setFileError('Seleccione un archivo de entre 1 byte y 10 MiB.'); return; }
      setFileError(''); upload.mutate(values);
    })}>
      <FormField label="Archivo para compartir" htmlFor="library-file" error={fileError}><input ref={ref} id="library-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" disabled={upload.isPending} onChange={(event) => { setSuccess(false); setFileError(''); setFile(event.target.files?.[0] ?? null); form.setValue('compartir', false); }} /></FormField>
      <label className="privacy-check"><input type="checkbox" {...form.register('compartir')} /> Confirmo que este archivo puede ser consultado por alumnos y profesores en Documentos institucionales.</label>
      {form.formState.errors.compartir ? <p role="alert">{form.formState.errors.compartir.message}</p> : null}
      {upload.error ? <div className="error-banner" role="alert">{getApiErrorMessage(upload.error, 'No se pudo publicar el archivo.')}</div> : null}
      <Button type="submit" disabled={!file || upload.isPending}>{upload.isPending ? 'Publicando…' : 'Publicar archivo para alumnos y profesores'}</Button>
    </form>
  </section>;
}
