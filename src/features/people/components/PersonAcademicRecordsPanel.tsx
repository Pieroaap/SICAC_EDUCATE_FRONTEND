import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getApiErrorMessage } from '../../../api/client';
import type { RoleCode } from '../../../api/types';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  academicRecordSchema,
  type AcademicRecordValues,
} from '../../academic-operation/academicOperationForms';
import {
  createAcademicRecord,
  getAcademicRecords,
  getCareerRegistrations,
} from '../../academic-operation/api/academicOperationApi';
import { getCourses, getPlanCourses } from '../../academic-structure/api/academicStructureApi';

export function PersonAcademicRecordsPanel({
  actorRoles,
  personId,
}: {
  actorRoles: RoleCode[];
  personId: string;
}) {
  const queryClient = useQueryClient();
  const canAuthorize = actorRoles.includes('DIRECTOR_ACADEMICO');
  const form = useForm<AcademicRecordValues>({
    resolver: zodResolver(academicRecordSchema),
    defaultValues: { planCursoId: '', fechaReferencial: '', periodoReferencial: '', observacion: '' },
  });
  const records = useQuery({
    queryKey: ['academic-records', personId],
    queryFn: () => getAcademicRecords(personId),
  });
  const registrations = useQuery({
    queryKey: ['career-registrations', personId],
    queryFn: () => getCareerRegistrations(personId),
  });
  const planIds = registrations.data?.data.map((item) => item.planCurricularId) ?? [];
  const courses = useQuery({
    queryKey: ['academic', 'student-plan-courses', planIds],
    queryFn: async () => (await Promise.all(planIds.map(getPlanCourses))).flat(),
    enabled: planIds.length > 0,
  });
  const courseCatalog = useQuery({ queryKey: ['academic', 'courses'], queryFn: getCourses });
  const create = useMutation({
    mutationFn: (values: AcademicRecordValues) => createAcademicRecord({
      personaId: personId, planCursoId: values.planCursoId, fuente: 'manual',
      ...(values.fechaReferencial ? { fechaReferencial: values.fechaReferencial } : {}),
      ...(values.periodoReferencial ? { periodoReferencial: values.periodoReferencial } : {}),
      ...(values.observacion ? { observacion: values.observacion } : {}),
    }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['academic-records', personId] });
    },
  });

  return (
    <div className="detail-panel">
      <h3>Antecedentes académicos reconocidos</h3>
      <p>Cursos aprobados antes de SICAC, sin crear calificaciones ni asistencias ficticias.</p>
      {records.isPending ? <p>Cargando antecedentes…</p> : null}
      {records.isError ? <div className="error-banner">No se pudieron cargar los antecedentes.</div> : null}
      {records.data?.data.length === 0 ? <p className="operation-empty">No hay antecedentes reconocidos.</p> : null}
      {records.data?.data.length ? (
        <ul className="detail-list">
          {records.data.data.map((item) => (
            <li key={item.id}>
              <div><strong>{item.cursoNombre}</strong><span>Aprobado</span></div>
              <small>{item.cursoCodigo} · Ciclo {item.ciclo} · {item.fechaReferencial ?? item.periodoReferencial}</small>
              {item.observacion ? <small>{item.observacion}</small> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canAuthorize ? (
        <form className="operation-form" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
          <FormField error={form.formState.errors.planCursoId?.message} htmlFor="record-course" label="Curso del plan">
            <select className="form-select" id="record-course" {...form.register('planCursoId')}>
              <option value="">Seleccionar</option>
              {courses.data?.map((item) => {
                const course = courseCatalog.data?.find((candidate) => candidate.id === item.cursoId);
                return <option key={item.id} value={item.id}>Ciclo {item.ciclo} · {course?.codigo} · {course?.nombre}</option>;
              })}
            </select>
          </FormField>
          <FormField error={form.formState.errors.fechaReferencial?.message} htmlFor="record-date" label="Fecha referencial">
            <Input id="record-date" type="date" {...form.register('fechaReferencial')} />
          </FormField>
          <FormField error={form.formState.errors.periodoReferencial?.message} htmlFor="record-period" label="Periodo referencial">
            <Input id="record-period" placeholder="Ej. 2022-I" {...form.register('periodoReferencial')} />
          </FormField>
          <FormField error={form.formState.errors.observacion?.message} htmlFor="record-note" label="Observación">
            <textarea className="form-textarea" id="record-note" {...form.register('observacion')} />
          </FormField>
          {create.error ? <div className="error-banner">{getApiErrorMessage(create.error, 'No se pudo reconocer el antecedente.')}</div> : null}
          <Button disabled={create.isPending} type="submit">{create.isPending ? 'Autorizando…' : 'Reconocer antecedente'}</Button>
        </form>
      ) : <small>Solo Dirección Académica puede autorizar nuevos antecedentes.</small>}
    </div>
  );
}
