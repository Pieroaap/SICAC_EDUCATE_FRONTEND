import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import type { AttendanceState } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import {
  createReactivationRequest,
  getAttendanceBook,
  saveAttendance,
} from '../api/academicAttendanceApi';
import { reactivationReasonSchema, todayIso } from '../academicAttendanceForms';

type FormValues = { states: Record<string, AttendanceState> };
const stateOptions: Array<{ value: AttendanceState; label: string }> = [
  { value: 'presente', label: 'Presente' },
  { value: 'tardanza', label: 'Tardanza' },
  { value: 'falta', label: 'Falta' },
  { value: 'justificada', label: 'Justificada' },
];

export function AttendanceBookPage() {
  const { courseId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => searchParams.get('fecha') ?? todayIso());
  const [requestTarget, setRequestTarget] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const form = useForm<FormValues>({ defaultValues: { states: {} } });
  useWatch({ control: form.control, name: 'states' });
  const book = useQuery({
    queryKey: ['attendance', 'book', courseId, date],
    queryFn: () => getAttendanceBook(courseId, date),
    enabled: Boolean(courseId && date),
  });
  useEffect(() => {
    if (!book.data) return;
    form.reset({
      states: Object.fromEntries(book.data.students.map((student) => [
        student.enrollmentId,
        student.attendance?.estadoAsistencia ?? 'presente',
      ])),
    });
  }, [book.data, form]);
  const save = useMutation({
    mutationFn: (values: FormValues) => saveAttendance(
      courseId,
      date,
      book.data!.students.map((student) => ({
        enrollmentId: student.enrollmentId,
        state: values.states[student.enrollmentId] ?? 'presente',
      })),
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance', 'book', courseId] }),
  });
  const request = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => createReactivationRequest(id, motivo),
    onSuccess: async () => {
      dialogRef.current?.close();
      setRequestTarget(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['attendance', 'book', courseId] });
    },
  });
  const isProfessor = profile?.roles.some((role) => role.codigo === 'PROFESOR') ?? false;
  if (book.isPending) return <main className="page-shell table-state">Cargando asistencia…</main>;
  if (book.isError || !book.data) return <main className="page-shell table-state is-error">No pudimos cargar la asistencia.</main>;
  const data = book.data;
  return (
    <main className="page-shell attendance-page">
      <Link className="back-link" to="/asistencia"><ArrowLeft size={17} /> Volver a Asistencia</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{data.course.periodName}</p>
          <h1>{data.course.courseCode} · {data.course.courseName}</h1>
          <p>Control diario y alertas de permanencia.</p>
        </div>
        <label className="attendance-date">
          Fecha
          <input
            max={data.course.endDate < todayIso() ? data.course.endDate : todayIso()}
            min={data.course.startDate}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      </header>
      {save.error ? <div className="error-banner">{getApiErrorMessage(save.error, 'No pudimos guardar la asistencia.')}</div> : null}
      <form className="attendance-book" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <header>
          <div><h2>Asistencia del día</h2><p>Las correcciones recalculan el riesgo, pero no reactivan retiros.</p></div>
          <Button disabled={save.isPending || !data.students.length} type="submit">
            {save.isPending ? 'Guardando…' : 'Guardar asistencia'}
          </Button>
        </header>
        <div className="attendance-roster">
          {data.students.map((student) => {
            const summary = student.summary;
            const status = student.withdrawalId ? 'retirado' : summary.alert ? 'riesgo' : 'regular';
            return (
              <article className={`attendance-student is-${status}`} key={student.enrollmentId}>
                <div className="attendance-student__identity">
                  <strong>{student.apellidoPaterno} {student.apellidoMaterno} {student.nombres}</strong>
                  <span>{student.dni}</span>
                </div>
                <select
                  aria-label={`Asistencia de ${student.nombres} ${student.apellidoPaterno}`}
                  disabled={data.course.periodState === 'culminado'}
                  {...form.register(`states.${student.enrollmentId}`)}
                >
                  {stateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <dl className="attendance-summary">
                  <div><dt>Faltas</dt><dd>{summary.absences}</dd></div>
                  <div><dt>Tardanzas</dt><dd>{summary.lateArrivals}</dd></div>
                  <div><dt>Equivalentes</dt><dd>{summary.equivalentAbsences}</dd></div>
                </dl>
                <span className={`attendance-risk is-${status}`}>
                  {status === 'retirado' ? 'Retirado' : status === 'riesgo' ? 'En riesgo' : 'Regular'}
                </span>
                {isProfessor && student.eligibleForReactivation && !student.pendingRequestId && student.withdrawalId ? (
                  <Button
                    onClick={() => {
                      setRequestTarget({
                        id: student.withdrawalId!,
                        name: `${student.nombres} ${student.apellidoPaterno}`,
                      });
                      dialogRef.current?.showModal();
                    }}
                    type="button"
                    variant="secondary"
                  >
                    <RotateCcw size={15} /> Solicitar reactivación
                  </Button>
                ) : null}
                {student.pendingRequestId ? <small>Reactivación pendiente de aprobación</small> : null}
              </article>
            );
          })}
        </div>
      </form>
      <dialog className="attendance-dialog" ref={dialogRef}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = reactivationReasonSchema.safeParse(reason);
            if (!parsed.success) {
              setReasonError('Explica el motivo con al menos 10 caracteres.');
              return;
            }
            if (requestTarget) request.mutate({ id: requestTarget.id, motivo: parsed.data });
          }}
        >
          <header><p className="eyebrow">Reactivación</p><h2>Solicitar revisión</h2><p>{requestTarget?.name}</p></header>
          <label>Motivo<textarea onChange={(event) => { setReason(event.target.value); setReasonError(null); }} value={reason} /></label>
          {reasonError ? <p className="field-error">{reasonError}</p> : null}
          {request.error ? <div className="error-banner">{getApiErrorMessage(request.error, 'No pudimos crear la solicitud.')}</div> : null}
          <footer>
            <Button onClick={() => dialogRef.current?.close()} type="button" variant="secondary">Cancelar</Button>
            <Button disabled={request.isPending} type="submit">{request.isPending ? 'Enviando…' : 'Enviar solicitud'}</Button>
          </footer>
        </form>
      </dialog>
    </main>
  );
}
