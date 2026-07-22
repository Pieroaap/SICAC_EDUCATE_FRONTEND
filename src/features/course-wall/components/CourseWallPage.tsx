import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../auth/AuthProvider';
import { downloadDocument } from '../../documents/api/documentsApi';
import { createCoursePost, getCourseWall, removeCoursePost, updateCoursePost, uploadCourseAttachment } from '../api/courseWallApi';

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
          <Input onChange={(event) => setTitulo(event.target.value)} placeholder="Título" required value={titulo} />
          <textarea className="form-textarea" onChange={(event) => setContenido(event.target.value)} placeholder="Escribe una comunicación" required value={contenido} />
          <label>Adjuntos (máximo 5)<input multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 5))} type="file" /></label>
          <Button disabled={create.isPending} type="submit">Publicar</Button>
        </form>
      ) : null}
      <section className="wall-list">
        {wall.data?.data.map((post) => (
          <article className="portal-card" key={post.id}>
            <span className="eyebrow">{post.fijada ? 'Fijada' : new Date(post.publicadaAt).toLocaleDateString()}</span>
            <h2>{post.titulo}</h2>
            <p className="wall-content">{post.contenido}</p>
            {post.archivos.map((file) => <button className="text-link" key={file.id} onClick={() => void downloadDocument(file.id)} type="button">{file.nombreOriginal}</button>)}
            {canWrite ? <div className="button-row"><Button onClick={() => pin.mutate({ id: post.id, fijada: !post.fijada })} type="button" variant="secondary">{post.fijada ? 'Desfijar' : 'Fijar'}</Button><Button onClick={() => remove.mutate(post.id)} type="button" variant="ghost">Retirar</Button></div> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
