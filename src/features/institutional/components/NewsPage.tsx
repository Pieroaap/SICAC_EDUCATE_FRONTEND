import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../auth/AuthProvider';
import { downloadDocument } from '../../documents/api/documentsApi';
import { getLibraryOptions } from '../api/libraryApi';
import { deleteNews, getNews, saveNews, uploadNewsImage, type NewsPost } from '../api/institutionalApi';
import { NewsDialog } from './NewsDialog';
import { NewsImage } from './NewsImage';
import '../institutional.css';

const schema = z.object({ titulo: z.string().trim().min(1, 'Escriba un título.').max(180), contenido: z.string().trim().min(1, 'Escriba el contenido.').max(30000),
  estado: z.enum(['borrador', 'publicada', 'retirada']), fijada: z.boolean(), documentoIds: z.array(z.string()).max(10, 'Adjunte hasta 10 archivos.') });
type Values = z.infer<typeof schema>;
export function NewsPage() {
  const { profile } = useAuth();
  const manager = profile?.roles.some((role) => ['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO', 'GESTOR_ACADEMICO'].includes(role.codigo)) ?? false;
  const admin = profile?.roles.some((role) => role.codigo === 'ADMINISTRADOR_SISTEMA') ?? false;
  const [deleting, setDeleting] = useState<NewsPost | null>(null);
  const [page, setPage] = useState(1);
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<NewsPost | 'new' | null>(null);
  const client = useQueryClient();
  const news = useQuery({ queryKey: ['institutional-news', profile?.personaId, page, manager && manage], queryFn: () => getNews(page, manager && manage) });
  const download = useMutation({ mutationFn: downloadDocument });
  return <main className="page-shell"><header className="page-heading"><div><p className="eyebrow">Comunidad</p><h1>Noticias</h1><p>Novedades y comunicados de la institución.</p></div>
    {manager ? <div className="institutional-toolbar"><Button variant="secondary" onClick={() => { setManage(!manage); setPage(1); }}>{manage ? 'Ver muro publicado' : 'Gestionar publicaciones'}</Button><Button onClick={() => setEditing('new')}>Nueva noticia</Button></div> : null}</header>
    {editing && manager ? <NewsEditor key={typeof editing === 'string' ? 'new' : editing.id} post={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await client.invalidateQueries({ queryKey: ['institutional-news'] }); }} /> : null}
    {deleting && admin ? <NewsDeleteDialog post={deleting} onClose={() => setDeleting(null)} onDeleted={async () => {
      setDeleting(null); if (news.data?.data.length === 1 && page > 1) setPage(page - 1);
      await client.invalidateQueries({ queryKey: ['institutional-news'] });
    }} /> : null}
    {news.isPending ? <p role="status">Cargando noticias…</p> : null}
    {news.isError ? <div className="error-banner" role="alert">No se pudieron cargar las noticias. <Button onClick={() => void news.refetch()} variant="secondary">Reintentar</Button></div> : null}
    {news.data?.data.length === 0 ? <p className="operation-empty">{manage ? 'No hay publicaciones registradas.' : 'Aún no hay noticias publicadas.'}</p> : null}
    {download.error ? <div className="error-banner" role="alert">{getApiErrorMessage(download.error, 'No se pudo descargar el archivo.')}</div> : null}
    <section className="institutional-list">{news.data?.data.map((post) => <article className="institutional-post" key={post.id}>
      <header>{post.fijada ? <strong>Destacada</strong> : null}<time>{new Date(post.publicadaAt ?? post.createdAt).toLocaleDateString('es-PE')}</time>{manage ? <span>{post.estado}</span> : null}</header>
      <div className={post.imagenDocumentoId ? 'news-content news-content-with-image' : 'news-content'}>
        <div><h2>{post.titulo}</h2><div className="institutional-text">{post.contenido}</div></div>
        {post.imagenDocumentoId ? <NewsImage postId={post.id} imageId={post.imagenDocumentoId} title={post.titulo} /> : null}
      </div>
      <footer>{post.documentos.map((file) => <Button key={file.id} variant="secondary" disabled={download.isPending} onClick={() => download.mutate(file.id)}>{file.titulo || file.nombreOriginal}</Button>)}{manager ? <Button variant="secondary" onClick={() => setEditing(post)}>Editar publicación</Button> : null}{admin ? <Button variant="destructive" onClick={() => setDeleting(post)}>Eliminar publicación</Button> : null}</footer>
    </article>)}</section>
    <div className="institutional-pagination"><Button variant="secondary" disabled={page === 1 || news.isFetching} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page} de {Math.max(1, news.data?.pagination.totalPages ?? 1)}</span><Button variant="secondary" disabled={!news.data || page >= news.data.pagination.totalPages || news.isFetching} onClick={() => setPage(page + 1)}>Siguiente</Button></div>
  </main>;
}
function NewsEditor({ post, onClose, onSaved }: { post: NewsPost | undefined; onClose: () => void; onSaved: () => Promise<void> }) {
  const [image, setImage] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [imageError, setImageError] = useState('');
  const [preview, setPreview] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const uploadedImage = useRef<{ file: File; id: string } | null>(null);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { titulo: post?.titulo ?? '', contenido: post?.contenido ?? '', estado: post?.estado ?? 'borrador', fijada: post?.fijada ?? false, documentoIds: post?.documentos.map((file) => file.id) ?? [] } });
  const files = useQuery({ queryKey: ['library-options'], queryFn: getLibraryOptions });
  const mutation = useMutation({ mutationFn: async (values: Values) => {
    if (image && uploadedImage.current?.file !== image) uploadedImage.current = { file: image, id: (await uploadNewsImage(image)).id };
    const imagenDocumentoId = image ? uploadedImage.current!.id : imageRemoved ? null : post?.imagenDocumentoId;
    return saveNews({ ...values, ...(imagenDocumentoId !== undefined ? { imagenDocumentoId } : {}) }, post?.id);
  }, onSuccess: onSaved });
  return <NewsDialog title={post ? 'Editar noticia' : 'Nueva noticia'} busy={mutation.isPending} onClose={onClose}><form className="institutional-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
    <FormField label="Título" htmlFor="news-title" error={form.formState.errors.titulo?.message}><Input id="news-title" {...form.register('titulo')} /></FormField>
    <FormField label="Contenido" htmlFor="news-content" error={form.formState.errors.contenido?.message}><textarea id="news-content" className="form-textarea" {...form.register('contenido')} /></FormField>
    <FormField label="Imagen de la noticia (opcional)" htmlFor="news-image-file" error={imageError}>
      <input className="institutional-file-input" ref={imageInput} id="news-image-file" type="file" accept=".jpg,.jpeg,.png" disabled={mutation.isPending} onChange={(event) => {
        const selected = event.target.files?.[0]; if (!selected) return;
        if (!['image/jpeg', 'image/png'].includes(selected.type) || selected.size === 0 || selected.size > 5 * 1024 * 1024) {
          setImageError('Seleccione una imagen JPG o PNG de entre 1 byte y 5 MiB.'); event.target.value = ''; return;
        }
        setImageError(''); setPreview(URL.createObjectURL(selected)); setImage(selected); setImageRemoved(false);
      }} />
      <p className="file-help">JPG o PNG · Máximo 5 MiB. La imagen se mostrará completa junto al texto.</p>
      {image && preview ? <div className="news-image news-image-preview"><img src={preview} alt="Vista previa de la imagen seleccionada" /><p>{image.name}</p></div>
        : !imageRemoved && post?.imagenDocumentoId ? <div className="news-image-preview"><NewsImage postId={post.id} imageId={post.imagenDocumentoId} title={post.titulo} /></div> : null}
      {image || (!imageRemoved && post?.imagenDocumentoId) ? <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => { setImage(null); setPreview(''); setImageRemoved(true); setImageError(''); if (imageInput.current) imageInput.current.value = ''; }}>Quitar imagen</Button> : null}
    </FormField>
    <FormField label="Estado" htmlFor="news-state"><select id="news-state" className="form-select" {...form.register('estado')}><option value="borrador">Borrador</option><option value="publicada">Publicada</option><option value="retirada">Retirada</option></select></FormField>
    <label className="institutional-file"><input type="checkbox" {...form.register('fijada')} /> Destacar al inicio del muro</label>
    <fieldset disabled={files.isPending || files.isError || mutation.isPending}><legend>Adjuntar documentos institucionales</legend>{files.data?.map((file) => <label className="institutional-file" key={file.id}><input type="checkbox" value={file.id} {...form.register('documentoIds')} /> {file.titulo || file.nombreOriginal}</label>)}{files.data?.length === 0 ? <p>Publique documentos institucionales para adjuntarlos aquí.</p> : null}</fieldset>
    {files.isError ? <div className="error-banner" role="alert">No se pudieron cargar los documentos. <Button type="button" variant="secondary" onClick={() => void files.refetch()}>Reintentar</Button></div> : null}
    {form.formState.errors.documentoIds ? <p role="alert">{form.formState.errors.documentoIds.message}</p> : null}
    {mutation.error ? <div className="error-banner" role="alert">{getApiErrorMessage(mutation.error, 'No se pudo guardar la noticia.')}</div> : null}
    <div className="button-row"><Button type="submit" disabled={mutation.isPending || files.isError || files.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar noticia'}</Button><Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onClose}>Cancelar</Button></div>
  </form></NewsDialog>;
}
function NewsDeleteDialog({ post, onClose, onDeleted }: { post: NewsPost; onClose: () => void; onDeleted: () => Promise<void> }) {
  const mutation = useMutation({ mutationFn: () => deleteNews(post.id), onSuccess: onDeleted });
  return <NewsDialog title="Eliminar publicación" busy={mutation.isPending} onClose={onClose}>
    <p>¿Eliminar «{post.titulo}»?</p>
    <p>La noticia se eliminará permanentemente. Los archivos de la biblioteca se conservarán.</p>
    {mutation.error ? <div role="alert" className="error-banner">{getApiErrorMessage(mutation.error, 'No se pudo eliminar la publicación. Inténtelo nuevamente.')}</div> : null}
    <div className="button-row"><Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>Cancelar</Button>
      <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}</Button></div>
  </NewsDialog>;
}
