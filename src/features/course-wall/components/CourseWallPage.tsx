import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../auth/AuthProvider';
import { downloadDocument } from '../../documents/api/documentsApi';
import { createCoursePost, getCourseWall, removeCoursePost, updateCoursePost, uploadCourseAttachment } from '../api/courseWallApi';
import { parseWallText } from '../courseWallText';

function LinkedWallText({ text }: { text: string }) {
  return (
    <p className="wall-content">
      {parseWallText(text).map((segment, index) => segment.href
        ? <a href={segment.href} key={`${segment.value}-${index}`} rel="noopener noreferrer" target="_blank">{segment.value}</a>
        : <span key={`${segment.value}-${index}`}>{segment.value}</span>)}
    </p>
  );
}

export function CourseWallPage() {
  const { courseId = '' } = useParams();
  const client = useQueryClient();
  const { profile } = useAuth();
  const composerDialogRef = useRef<HTMLDialogElement>(null);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const roleCodes = profile?.roles.map((role) => role.codigo) ?? [];
  const isStudent = roleCodes.includes('ALUMNO');
  const isTeacher = roleCodes.includes('PROFESOR') && !isStudent;
  const canWrite = roleCodes.some((role) => role !== 'ALUMNO');
  const backTo = isStudent
    ? `/portal/cursos/${courseId}`
    : isTeacher ? `/evaluacion/cursos/${courseId}` : '/operacion/cursos-programados';
  const backLabel = isStudent ? 'Volver al curso' : isTeacher ? 'Volver a evaluación' : 'Volver a cursos programados';
  const wall = useQuery({ queryKey: ['course-wall', courseId], queryFn: () => getCourseWall(courseId), enabled: Boolean(courseId) });
  const refresh = () => client.invalidateQueries({ queryKey: ['course-wall', courseId] });
  const closeComposer = () => {
    composerDialogRef.current?.close();
    document.getElementById('course-wall-new-post')?.focus();
  };
  const create = useMutation({
    mutationFn: async () => {
      const attachments = await Promise.all(files.map((file) => uploadCourseAttachment(courseId, file)));
      return createCoursePost(courseId, { titulo, contenido, documentIds: attachments.map((item) => item.id) });
    },
    onSuccess: async () => {
      await refresh();
      setTitulo('');
      setContenido('');
      setFiles([]);
      closeComposer();
    },
  });
  const pin = useMutation({ mutationFn: ({ id, fijada }: { id: string; fijada: boolean }) => updateCoursePost(id, { fijada }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: removeCoursePost, onSuccess: refresh });

  return (
    <main className="page-shell">
      <Link className="back-link" to={backTo}><ArrowLeft size={17} /> {backLabel}</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{wall.data?.course.code ?? 'Curso programado'}</p>
          <h1>Muro de Curso{wall.data?.course.name ? ` - ${wall.data.course.name}` : ''}</h1>
        </div>
        {canWrite ? <Button id="course-wall-new-post" onClick={() => composerDialogRef.current?.showModal()} type="button">Nueva publicación</Button> : null}
      </header>
      {canWrite ? (
        <dialog
          aria-labelledby="wall-composer-title"
          className="wall-composer-dialog"
          onCancel={(event) => { event.preventDefault(); closeComposer(); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeComposer();
            }
          }}
          ref={composerDialogRef}
        >
          <form className="wall-composer" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
            <header>
              <p className="eyebrow">Comunicación del curso</p>
              <h2 id="wall-composer-title">Nueva publicación</h2>
              <p>Comparte anuncios, materiales o enlaces con los alumnos del curso.</p>
            </header>
            <label className="wall-composer__field" htmlFor="wall-post-title">
              <span>Título de la publicación</span>
              <Input disabled={create.isPending} id="wall-post-title" onChange={(event) => setTitulo(event.target.value)} required value={titulo} />
            </label>
            <label className="wall-composer__field" htmlFor="wall-post-content">
              <span>Contenido de la publicación</span>
              <textarea className="form-textarea" disabled={create.isPending} id="wall-post-content" onChange={(event) => setContenido(event.target.value)} required value={contenido} />
            </label>
            <label className="wall-file-picker">
              <span className="wall-file-picker__label">Adjuntos <small>Máximo 5 archivos</small></span>
              <input
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                aria-label="Adjuntos"
                className="wall-file-picker__input"
                disabled={create.isPending}
                multiple
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []).slice(0, 5));
                  event.currentTarget.value = '';
                }}
                type="file"
              />
              <span className="wall-file-picker__control">
                <span className="wall-file-picker__button"><Paperclip aria-hidden="true" size={17} /> Elegir archivos</span>
                <span className="wall-file-picker__status">
                  {files.length
                    ? `${files.length} archivo${files.length === 1 ? '' : 's'} seleccionado${files.length === 1 ? '' : 's'}`
                    : 'Ningún archivo seleccionado'}
                </span>
              </span>
            </label>
            {create.error ? <div className="error-banner" role="alert">{getApiErrorMessage(create.error, 'No pudimos publicar la comunicación.')}</div> : null}
            <footer>
              <Button disabled={create.isPending} onClick={closeComposer} type="button" variant="secondary">Cancelar</Button>
              <Button disabled={create.isPending} type="submit">{create.isPending ? 'Publicando…' : 'Publicar'}</Button>
            </footer>
          </form>
        </dialog>
      ) : null}
      <section className="wall-list">
        {wall.isPending ? <p className="wall-state" role="status">Cargando publicaciones del curso…</p> : null}
        {wall.isError || !wall.data ? <div className="error-banner" role="alert">{getApiErrorMessage(wall.error, 'No pudimos cargar las publicaciones del curso.')}</div> : null}
        {!wall.isPending && !wall.isError && wall.data?.data.length === 0 ? (
          <div className="wall-empty-state">
            <h2>Aún no hay publicaciones en este curso.</h2>
            <p>Las nuevas comunicaciones aparecerán aquí cuando el equipo docente las publique.</p>
          </div>
        ) : null}
        {wall.data?.data.map((post) => (
          <article className="portal-card" key={post.id}>
            <span className="eyebrow">{post.fijada ? 'Fijada' : new Date(post.publicadaAt).toLocaleDateString()}</span>
            <h2 className="wall-post__title">{post.titulo}</h2>
            <LinkedWallText text={post.contenido} />
            {post.archivos.map((file) => <button className="text-link" key={file.id} onClick={() => void downloadDocument(file.id)} type="button">{file.nombreOriginal}</button>)}
            {canWrite ? <div className="button-row"><Button disabled={pin.isPending || remove.isPending} onClick={() => pin.mutate({ id: post.id, fijada: !post.fijada })} type="button" variant="secondary">{post.fijada ? 'Desfijar' : 'Fijar'}</Button><Button disabled={pin.isPending || remove.isPending} onClick={() => remove.mutate(post.id)} type="button" variant="ghost">Retirar</Button></div> : null}
            {pin.error || remove.error ? <div className="error-banner" role="alert">{getApiErrorMessage(pin.error ?? remove.error, 'No pudimos actualizar la publicación.')}</div> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
