import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/FormField';
import { Input } from '../../../components/ui/Input';
import { getRecognitionCourses, prerequisiteChain, recognizeCourses } from '../api/recognitionApi';
import './recognition.css';

const schema = z.object({
  planCursoIds: z.array(z.string()).min(1, 'Seleccione al menos un curso.').max(100, 'Seleccione hasta 100 cursos por operación.'),
  periodoReferencial: z.string().trim().min(1, 'Indique el periodo o rango referencial.').max(100),
  observacion: z.string().trim().min(1, 'Indique el motivo del reconocimiento.').max(1000),
  confirmed: z.boolean().refine(Boolean, 'Confirme que los cursos seleccionados fueron aprobados.'),
});
type Values = z.infer<typeof schema>;

export function RecognitionDialog({ personId, targetCourseId, onClose, onSaved }: {
  personId: string; targetCourseId?: string; onClose: () => void; onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const client = useQueryClient();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    planCursoIds: [], periodoReferencial: '', observacion: '', confirmed: false,
  } });
  const courses = useQuery({ queryKey: ['recognition-courses', personId], queryFn: () => getRecognitionCourses(personId), staleTime: 0 });
  const mutation = useMutation({
    mutationFn: (values: Values) => recognizeCourses({ personaId: personId, planCursoIds: values.planCursoIds,
      periodoReferencial: values.periodoReferencial, observacion: values.observacion }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['recognition-courses', personId] }),
        client.invalidateQueries({ queryKey: ['academic-records', personId] }),
        client.invalidateQueries({ queryKey: ['promotion', 'eligibilities'] }),
      ]);
      onSaved();
    },
  });
  useEffect(() => { ref.current?.showModal(); }, []);
  const chain = targetCourseId ? prerequisiteChain(courses.data ?? [], targetCourseId) : null;
  const visible = courses.data?.filter((course) => !chain || chain.has(course.id)) ?? [];
  const close = () => { if (!mutation.isPending) onClose(); };
  return <dialog className="recognition-dialog" ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close(); }}>
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <header><p className="eyebrow">Trayectoria académica</p><h2 id={titleId}>Reconocer cursos históricos</h2>
        {targetCourseId ? <p>Inscripción en {courses.data?.find((course) => course.id === targetCourseId)?.cursoNombre ?? 'curso seleccionado'}</p> : null}
        <p>{targetCourseId ? 'Revise la cadena de prerrequisitos. No hay aprobación registrada para los cursos pendientes.' : 'Seleccione los cursos que el alumno ya aprobó, aunque tenga cursos intermedios pendientes.'}</p>
        <p>Se guardarán como aprobados por reconocimiento, sin nota numérica. Cuentan para prerrequisitos y egreso.</p></header>
      {courses.isPending ? <p>Cargando malla…</p> : null}
      {courses.isError ? <div className="error-banner" role="alert">No se pudo cargar la malla. <Button type="button" variant="secondary" onClick={() => void courses.refetch()}>Reintentar</Button></div> : null}
      {!courses.isPending && !courses.isError && !visible.length ? <p>No hay cursos disponibles en este contexto.</p> : null}
      <fieldset disabled={mutation.isPending || courses.isError || courses.isPending} className="recognition-courses">
        <legend>Cursos de la malla</legend>
        {visible.map((course) => <label key={course.id} className="recognition-course">
          <input type="checkbox" aria-label={course.cursoNombre} value={course.id} disabled={course.estado !== 'sin_aprobacion'} {...form.register('planCursoIds')} />
          <span><strong>{course.cursoNombre}</strong><small>{course.planNombre} · Ciclo {course.ciclo} · {course.cursoCodigo}</small>
            <small>{course.estado === 'sin_aprobacion' ? 'Sin aprobación registrada' : course.estado === 'aprobado_regular' ? 'Aprobado con historial publicado' : 'Aprobado por reconocimiento'}</small>
            {course.prerrequisitoIds.length ? <small>Requiere: {course.prerrequisitoIds.map((id) => courses.data?.find((item) => item.id === id)?.cursoNombre ?? 'Curso fuera de la malla disponible').join(', ')}</small> : null}
          </span>
        </label>)}
      </fieldset>
      {form.formState.errors.planCursoIds ? <p role="alert">{form.formState.errors.planCursoIds.message}</p> : null}
      <FormField label="Periodo referencial" htmlFor={`${titleId}-period`} error={form.formState.errors.periodoReferencial?.message}>
        <Input id={`${titleId}-period`} placeholder="Ej. anterior a 2026-III" {...form.register('periodoReferencial')} />
      </FormField>
      <FormField label="Motivo del reconocimiento" htmlFor={`${titleId}-reason`} error={form.formState.errors.observacion?.message}>
        <textarea id={`${titleId}-reason`} className="form-textarea" {...form.register('observacion')} />
      </FormField>
      <label className="recognition-confirm"><input type="checkbox" {...form.register('confirmed')} /> Confirmo que el alumno aprobó los cursos seleccionados. La nota queda pendiente de regularización.</label>
      {form.formState.errors.confirmed ? <p role="alert">{form.formState.errors.confirmed.message}</p> : null}
      {mutation.error ? <div className="error-banner" role="alert">{getApiErrorMessage(mutation.error, 'No se pudo confirmar el reconocimiento. Consulte la malla antes de reintentar.')} <Button type="button" variant="secondary" onClick={() => { form.resetField('planCursoIds'); void courses.refetch(); }}>Actualizar malla</Button></div> : null}
      <footer><Button type="button" variant="secondary" disabled={mutation.isPending} onClick={close}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || courses.isPending || courses.isError}>{mutation.isPending ? 'Guardando…' : 'Guardar reconocimientos'}</Button></footer>
    </form>
  </dialog>;
}
