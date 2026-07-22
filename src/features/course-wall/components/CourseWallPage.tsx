import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  const create = useMutation({
    mutationFn: async () => {
      const attachments = await Promise.all(files.map((file) => uploadCourseAttachment(courseId, file)));
      return createCoursePost(courseId, { titulo, contenido, documentIds: attachments.map((item) => item.id) });
    },
    onSuccess: async () => { setTitulo(''); setContenido(''); setFiles([]); await refresh(); },
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
      </header>
      {canWrite ? (
        <form className="detail-panel" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          <div><h2>Nueva publicación</h2><p>Comparte anuncios, materiales o enlaces con los alumnos del curso.</p></div>
          <Input onChange={(event) => setTitulo(event.target.value)} placeholder="Título" required value={titulo} />
          <textarea className="form-textarea" onChange={(event) => setContenido(event.target.value)} placeholder="Escribe una comunicación" required value={contenido} />
          <label className="wall-file-picker">
            <span className="wall-file-picker__label">Adjuntos <small>Máximo 5 archivos</small></span>
            <input
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
              className="wall-file-picker__input"
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
          <Button disabled={create.isPending} type="submit">Publicar</Button>
        </form>
      ) : null}
      <section className="wall-list">
        {wall.data?.data.map((post) => (
          <article className="portal-card" key={post.id}>
            <span className="eyebrow">{post.fijada ? 'Fijada' : new Date(post.publicadaAt).toLocaleDateString()}</span>
            <h2>{post.titulo}</h2>
            <LinkedWallText text={post.contenido} />
            {post.archivos.map((file) => <button className="text-link" key={file.id} onClick={() => void downloadDocument(file.id)} type="button">{file.nombreOriginal}</button>)}
            {canWrite ? <div className="button-row"><Button onClick={() => pin.mutate({ id: post.id, fijada: !post.fijada })} type="button" variant="secondary">{post.fijada ? 'Desfijar' : 'Fijar'}</Button><Button onClick={() => remove.mutate(post.id)} type="button" variant="ghost">Retirar</Button></div> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
