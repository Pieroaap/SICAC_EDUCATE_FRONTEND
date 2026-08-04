import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../auth/AuthProvider';
import { downloadDocument, removeDocument } from '../../documents/api/documentsApi';
import { createCoursePost, getCourseWall, removeCoursePost, updateCoursePost, uploadCourseAttachment } from '../api/courseWallApi';
import { parseWallText } from '../courseWallText';

type PostActionError = { postId: string; message: string };

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
  const [uploadedDocumentIds, setUploadedDocumentIds] = useState<string[]>([]);
  const [isDiscardingAttachments, setIsDiscardingAttachments] = useState(false);
  const [attachmentCleanupError, setAttachmentCleanupError] = useState<string | null>(null);
  const [pendingCleanupDocumentIds, setPendingCleanupDocumentIds] = useState<string[]>([]);
  const [postActionError, setPostActionError] = useState<PostActionError | null>(null);
  const roleCodes = profile?.roles.map((role) => role.codigo) ?? [];
  const isStudent = roleCodes.includes('ALUMNO');
  const isTeacher = roleCodes.includes('PROFESOR') && !isStudent;
  const backTo = isStudent
    ? `/portal/cursos/${courseId}`
    : isTeacher ? `/evaluacion/cursos/${courseId}` : '/operacion/cursos-programados';
  const backLabel = isStudent ? 'Volver al curso' : isTeacher ? 'Volver a evaluación' : 'Volver a cursos programados';
  const wall = useQuery({ queryKey: ['course-wall', courseId], queryFn: () => getCourseWall(courseId), enabled: Boolean(courseId) });
  const canWrite = wall.data?.course.canWrite ?? false;
  const refresh = () => client.invalidateQueries({ queryKey: ['course-wall', courseId] });
  const discardUploadedAttachments = async (ids = uploadedDocumentIds) => {
    if (!ids.length) return true;
    setIsDiscardingAttachments(true);
    const results = await Promise.allSettled(ids.map((id) => removeDocument(id)));
    const removedIds = ids.filter((_, index) => results[index]?.status === 'fulfilled');
    const failedIds = ids.filter((_, index) => results[index]?.status === 'rejected');
    const failedResult = results.find((result) => result.status === 'rejected');
    setUploadedDocumentIds((current) => current.filter((id) => !removedIds.includes(id)));
    setPendingCleanupDocumentIds((current) => [...new Set([...current.filter((id) => !removedIds.includes(id)), ...failedIds])]);
    setIsDiscardingAttachments(false);
    if (failedResult?.status === 'rejected') {
      setAttachmentCleanupError(getApiErrorMessage(failedResult.reason, 'No pudimos eliminar algunos adjuntos temporales. Intenta nuevamente.'));
      return false;
    }
    setAttachmentCleanupError(null);
    return true;
  };
  const closeComposer = async () => {
    if (isComposerLocked) return;
    const cleaned = await discardUploadedAttachments();
    if (!cleaned) return;
    composerDialogRef.current?.close();
    document.getElementById('course-wall-new-post')?.focus();
  };
  const replaceFiles = async (nextFiles: File[]) => {
    if (isComposerLocked) return;
    const cleaned = await discardUploadedAttachments();
    if (!cleaned) return;
    setFiles(nextFiles.slice(0, 5));
  };
  const create = useMutation({
    mutationFn: async () => {
      if (hasPendingAttachmentCleanup) throw new Error('Completa la limpieza de adjuntos temporales antes de publicar.');
      const newDocumentIds: string[] = [];
      try {
        for (const file of files.slice(uploadedDocumentIds.length)) {
          const attachment = await uploadCourseAttachment(courseId, file);
          newDocumentIds.push(attachment.id);
          setUploadedDocumentIds([...uploadedDocumentIds, ...newDocumentIds]);
        }
      } catch (error) {
        await discardUploadedAttachments([...uploadedDocumentIds, ...newDocumentIds]);
        throw error;
      }

      return createCoursePost(courseId, {
        titulo,
        contenido,
        documentIds: [...uploadedDocumentIds, ...newDocumentIds],
      });
    },
    onSuccess: async () => {
      await refresh();
      setTitulo('');
      setContenido('');
      setFiles([]);
      setUploadedDocumentIds([]);
      setAttachmentCleanupError(null);
      setPendingCleanupDocumentIds([]);
      composerDialogRef.current?.close();
      document.getElementById('course-wall-new-post')?.focus();
    },
  });
  const pin = useMutation({
    mutationFn: ({ id, fijada }: { id: string; fijada: boolean }) => updateCoursePost(id, { fijada }),
    onMutate: () => setPostActionError(null),
    onError: (error, variables) => setPostActionError({ postId: variables.id, message: getApiErrorMessage(error, 'No pudimos actualizar la publicación.') }),
    onSuccess: async () => { setPostActionError(null); await refresh(); },
  });
  const remove = useMutation({
    mutationFn: ({ id }: { id: string }) => removeCoursePost(id),
    onMutate: () => setPostActionError(null),
    onError: (error, variables) => setPostActionError({ postId: variables.id, message: getApiErrorMessage(error, 'No pudimos actualizar la publicación.') }),
    onSuccess: async () => { setPostActionError(null); await refresh(); },
  });
  const hasPendingAttachmentCleanup = Boolean(attachmentCleanupError) || pendingCleanupDocumentIds.length > 0;
  const isComposerBusy = create.isPending || isDiscardingAttachments;
  const isComposerLocked = isComposerBusy || hasPendingAttachmentCleanup;
  const canOpenComposer = canWrite && wall.isSuccess;

  return (
    <main className="page-shell">
      <Link className="back-link" to={backTo}><ArrowLeft size={17} /> {backLabel}</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{wall.data?.course.code ?? 'Curso programado'}</p>
          <h1>Muro de Curso{wall.data?.course.name ? ` - ${wall.data.course.name}` : ''}</h1>
        </div>
        {canOpenComposer ? <Button id="course-wall-new-post" onClick={() => composerDialogRef.current?.showModal()} type="button">Nueva publicación</Button> : null}
      </header>
      {canOpenComposer ? (
        <dialog
          aria-labelledby="wall-composer-title"
          className="wall-composer-dialog"
          onCancel={(event) => {
            event.preventDefault();
            if (!isComposerLocked) void closeComposer();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              if (!isComposerLocked) void closeComposer();
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
              <Input disabled={isComposerLocked} id="wall-post-title" onChange={(event) => setTitulo(event.target.value)} required value={titulo} />
            </label>
            <label className="wall-composer__field" htmlFor="wall-post-content">
              <span>Contenido de la publicación</span>
              <textarea className="form-textarea" disabled={isComposerLocked} id="wall-post-content" onChange={(event) => setContenido(event.target.value)} required value={contenido} />
            </label>
            <label className="wall-file-picker">
              <span className="wall-file-picker__label">Adjuntos <small>Máximo 5 archivos</small></span>
              <input
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                aria-label="Adjuntos"
                className="wall-file-picker__input"
                disabled={isComposerLocked}
                multiple
                onChange={(event) => {
                  void replaceFiles(Array.from(event.target.files ?? []));
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
            {attachmentCleanupError ? <div className="error-banner" role="alert">{attachmentCleanupError}</div> : null}
            <footer>
              <Button disabled={isComposerLocked} onClick={() => void closeComposer()} type="button" variant="secondary">Cancelar</Button>
              {hasPendingAttachmentCleanup ? <Button disabled={isComposerBusy} onClick={() => void discardUploadedAttachments(pendingCleanupDocumentIds)} type="button" variant="secondary">Reintentar limpieza</Button> : null}
              <Button disabled={isComposerLocked} type="submit">{create.isPending ? 'Publicando…' : 'Publicar'}</Button>
            </footer>
          </form>
        </dialog>
      ) : null}
      <section className="wall-list">
        {wall.isPending ? <p className="wall-state" role="status">Cargando publicaciones del curso…</p> : null}
        {wall.isError ? <div className="error-banner" role="alert">{getApiErrorMessage(wall.error, 'No pudimos cargar las publicaciones del curso.')}</div> : null}
        {wall.isSuccess && wall.data.data.length === 0 ? (
          <div className="wall-empty-state">
            <h2>Aún no hay publicaciones en este curso.</h2>
            <p>Las nuevas comunicaciones aparecerán aquí cuando el equipo docente las publique.</p>
          </div>
        ) : null}
        {wall.isSuccess ? wall.data.data.map((post) => (
          <article className="portal-card" key={post.id}>
            <span className="eyebrow">{post.fijada ? 'Fijada' : new Date(post.publicadaAt).toLocaleDateString()}</span>
            <h2 className="wall-post__title">{post.titulo}</h2>
            <LinkedWallText text={post.contenido} />
            {post.archivos.map((file) => <button className="text-link" key={file.id} onClick={() => void downloadDocument(file.id)} type="button">{file.nombreOriginal}</button>)}
            {canWrite ? <div className="button-row"><Button disabled={pin.isPending || remove.isPending} onClick={() => pin.mutate({ id: post.id, fijada: !post.fijada })} type="button" variant="secondary">{post.fijada ? 'Desfijar' : 'Fijar'}</Button><Button disabled={pin.isPending || remove.isPending} onClick={() => remove.mutate({ id: post.id })} type="button" variant="ghost">Retirar</Button></div> : null}
            {postActionError?.postId === post.id ? <div className="error-banner" role="alert">{postActionError.message}</div> : null}
          </article>
        )) : null}
      </section>
    </main>
  );
}
