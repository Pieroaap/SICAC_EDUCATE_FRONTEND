import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import {
  getAcademicAct,
  getGradebook,
  publishAcademicAct,
  saveCourseGrades,
  saveEvaluationComponents,
} from '../api/academicEvaluationApi';
import type { ComponentsValues } from '../academicEvaluationForms';
import { EvaluationComponentsForm } from './EvaluationComponentsForm';
import { GradesForm } from './GradesForm';

export function GradebookPage() {
  const { courseId = '' } = useParams();
  const queryClient = useQueryClient();
  const componentsDialogRef = useRef<HTMLDialogElement>(null);
  const [componentsDialogVersion, setComponentsDialogVersion] = useState(0);
  const gradebook = useQuery({
    queryKey: ['evaluation', 'gradebook', courseId],
    queryFn: () => getGradebook(courseId),
    enabled: Boolean(courseId),
  });
  const act = useQuery({
    queryKey: ['evaluation', 'act', courseId],
    queryFn: () => getAcademicAct(courseId),
    enabled: gradebook.data?.acta.estado === 'publicada',
  });
  const components = useMutation({
    mutationFn: (values: ComponentsValues) => saveEvaluationComponents(courseId, values.components),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluation', 'gradebook', courseId] });
      componentsDialogRef.current?.close();
    },
  });
  const grades = useMutation({
    mutationFn: (payload: Parameters<typeof saveCourseGrades>[1]) => saveCourseGrades(courseId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluation', 'gradebook', courseId] }),
  });
  const publish = useMutation({
    mutationFn: () => publishAcademicAct(courseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['evaluation', 'gradebook', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['evaluation', 'act', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['evaluation', 'courses'] }),
        queryClient.invalidateQueries({ queryKey: ['academic-history'] }),
      ]);
    },
  });

  if (gradebook.isPending) return <main className="page-shell table-state">Cargando libro de notas…</main>;
  if (gradebook.isError || !gradebook.data) {
    return <main className="page-shell table-state is-error">No pudimos cargar el libro de notas.</main>;
  }

  const data = gradebook.data;
  const published = data.acta.estado === 'publicada';
  const totalWeight = data.components.reduce((sum, item) => sum + Number(item.porcentaje), 0);
  const complete = data.components.length > 0
    && data.students.length > 0
    && Math.abs(totalWeight - 100) < 0.001
    && data.students.every((student) => student.grades.length === data.components.length);
  const error = grades.error ?? publish.error;

  return (
    <main className="page-shell evaluation-page">
      <Link className="back-link" to="/evaluacion"><ArrowLeft size={17} /> Volver a Evaluación académica</Link>
      <header className="page-heading evaluation-heading">
        <div>
          <p className="eyebrow">{data.course.periodoNombre}</p>
          <h1>{data.course.cursoCodigo} · {data.course.cursoNombre}</h1>
          <p>Profesor: {data.course.profesorApellidoPaterno} {data.course.profesorNombres}</p>
        </div>
        <div className="evaluation-heading__actions">
          <Button
            onClick={() => componentsDialogRef.current?.showModal()}
            type="button"
            variant="secondary"
          >
            Componentes de evaluación
          </Button>
          <span className={`evaluation-state is-${data.acta.estado}`}>
            {published ? <LockKeyhole size={15} /> : null}
            {published ? 'Acta publicada' : 'Acta abierta'}
          </span>
        </div>
      </header>

      {error ? <div className="error-banner" role="alert">{getApiErrorMessage(error, 'No pudimos completar la operación.')}</div> : null}
      <dialog
        className="evaluation-components-dialog"
        onCancel={(event) => {
          event.preventDefault();
          componentsDialogRef.current?.close();
        }}
        onClose={() => setComponentsDialogVersion((version) => version + 1)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            componentsDialogRef.current?.close();
          }
        }}
        ref={componentsDialogRef}
      >
        <EvaluationComponentsForm
          components={data.components}
          disabled={published}
          error={components.error
            ? getApiErrorMessage(components.error, 'No pudimos guardar los componentes.')
            : undefined}
          key={componentsDialogVersion}
          onCancel={() => componentsDialogRef.current?.close()}
          onSave={(values) => components.mutate(values)}
          pending={components.isPending}
        />
      </dialog>
      <GradesForm
        disabled={published}
        gradebook={data}
        onSave={(payload) => grades.mutate(payload)}
        pending={grades.isPending}
      />

      {published ? (
        <section className="published-act">
          <header>
            <div><p className="eyebrow">Documento definitivo</p><h2>Acta académica publicada</h2></div>
            <span>{data.acta.publicadaAt ? new Date(data.acta.publicadaAt).toLocaleString('es-PE') : ''}</span>
          </header>
          {act.isPending ? <p>Cargando resultados finales…</p> : null}
          <ul>
            {act.data?.results.map((result) => (
              <li key={result.personaId}>
                <span>{result.apellidoPaterno} {result.apellidoMaterno} {result.nombres}</span>
                <strong>{Number(result.notaFinal).toFixed(2)}</strong>
                <b>{result.letra}</b>
                <em className={`is-${result.resultado}`}>{result.resultado}</em>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="publish-act-panel">
          <div>
            <p className="eyebrow">Cierre definitivo</p>
            <h2>Cerrar y publicar acta</h2>
            <p>Esta acción bloqueará componentes y notas, y actualizará el historial académico.</p>
          </div>
          <Button
            disabled={!complete || publish.isPending}
            onClick={() => {
              if (window.confirm('El acta quedará bloqueada definitivamente. ¿Deseas cerrar y publicar?')) publish.mutate();
            }}
            type="button"
          >
            <LockKeyhole size={17} /> {publish.isPending ? 'Publicando…' : 'Cerrar y publicar'}
          </Button>
          {!complete ? <small>Completa evaluaciones, pesos y todas las notas para habilitar el cierre.</small> : null}
        </section>
      )}
    </main>
  );
}
