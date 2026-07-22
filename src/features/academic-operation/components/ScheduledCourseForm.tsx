import { useEffect } from 'react';
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import type {
  AcademicPeriod,
  Career,
  Course,
  CurriculumPlan,
  PlanCourse,
  ScheduledCourse,
  TeacherListItem,
} from '../../../api/types';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  emptyScheduleBlock,
  type ScheduledCourseInput,
  type ScheduledCourseValues,
} from '../academicOperationForms';

type ScheduledCourseFormProps = {
  mode: 'create' | 'edit';
  form: UseFormReturn<ScheduledCourseInput, unknown, ScheduledCourseValues>;
  careers: Career[];
  plans: CurriculumPlan[];
  planCourses: PlanCourse[];
  courses: Course[];
  periods: AcademicPeriod[];
  teachers: TeacherListItem[];
  course?: ScheduledCourse | null;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmit: (values: ScheduledCourseValues) => void;
};

function latestActivePlan(
  plans: CurriculumPlan[],
  careerId: string,
) {
  return plans
    .filter((plan) => plan.carreraId === careerId && plan.estado === 'activo')
    .sort((a, b) => (b.createdAt ?? b.version).localeCompare(a.createdAt ?? a.version))[0];
}

export function ScheduledCourseForm({
  mode,
  form,
  careers,
  plans,
  planCourses,
  courses,
  periods,
  teachers,
  course,
  pending,
  error,
  onCancel,
  onSubmit,
}: ScheduledCourseFormProps) {
  const scheduleFields = useFieldArray({ control: form.control, name: 'horarios' });
  const careerId = useWatch({ control: form.control, name: 'carreraId' });
  const activePlanId = latestActivePlan(plans, careerId)?.id ?? '';
  const planId = mode === 'edit' ? form.getValues('planCurricularId') : activePlanId;

  useEffect(() => {
    if (mode !== 'create') return;
    form.setValue('planCurricularId', activePlanId, { shouldValidate: Boolean(careerId) });
    form.setValue('planCursoId', '');
  }, [activePlanId, careerId, form, mode]);

  return (
    <form className="operation-form scheduled-course-form" onSubmit={form.handleSubmit(onSubmit)}>
      {mode === 'edit' && course ? (
        <div className="scheduled-course-form__context">
          <span className="eyebrow">Edición operativa</span>
          <strong>{course.cursoNombre} · Sección {course.seccion}</strong>
          <small>{course.carreraNombre} · {course.planNombre} · {course.periodoNombre}</small>
        </div>
      ) : null}
      <FormField error={form.formState.errors.carreraId?.message} htmlFor="scheduled-career" label="Carrera">
        <select className="form-select" disabled={mode === 'edit'} id="scheduled-career" {...form.register('carreraId')}>
          <option value="">Seleccionar</option>
          {careers.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
      </FormField>
      <FormField error={form.formState.errors.planCursoId?.message} htmlFor="scheduled-course" label="Curso">
        <select className="form-select" disabled={mode === 'edit' || !planId} id="scheduled-course" {...form.register('planCursoId')}>
          <option value="">Seleccionar</option>
          {planCourses.filter((item) => item.planCurricularId === planId && item.estado === 'activo').map((item) => (
            <option key={item.id} value={item.id}>Ciclo {item.ciclo} · {courses.find((courseItem) => courseItem.id === item.cursoId)?.nombre ?? 'Curso'}</option>
          ))}
        </select>
      </FormField>
      <FormField error={form.formState.errors.periodoAcademicoId?.message} htmlFor="scheduled-period" label="Periodo">
        <select className="form-select" disabled={mode === 'edit'} id="scheduled-period" {...form.register('periodoAcademicoId')}>
          <option value="">Seleccionar</option>
          {periods.filter((item) => item.carreraId === careerId && (mode === 'edit' || item.estado !== 'culminado')).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
      </FormField>
      <FormField error={form.formState.errors.profesorPersonaId?.message} htmlFor="scheduled-teacher" label="Profesor">
        <select className="form-select" id="scheduled-teacher" {...form.register('profesorPersonaId')}>
          <option value="">Seleccionar</option>
          {teachers.map((item) => <option key={item.id} value={item.id}>{item.apellidoPaterno}, {item.nombres}</option>)}
        </select>
      </FormField>
      <FormField error={form.formState.errors.seccion?.message} htmlFor="scheduled-section" label="Sección">
        <Input id="scheduled-section" maxLength={30} {...form.register('seccion')} />
      </FormField>
      {mode === 'edit' ? (
        <FormField error={form.formState.errors.estado?.message} htmlFor="scheduled-state" label="Estado">
          <select className="form-select" id="scheduled-state" {...form.register('estado')}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </FormField>
      ) : null}
      <FormField error={form.formState.errors.cupoMaximo?.message} htmlFor="scheduled-capacity" label="Cupo máximo">
        <Input
          id="scheduled-capacity"
          min={1}
          type="number"
          {...form.register('cupoMaximo', {
            setValueAs: (value) => value === '' ? null : Number(value),
          })}
        />
      </FormField>
      <fieldset className="schedule-fieldset">
        <legend>Horarios</legend>
        {scheduleFields.fields.map((field, index) => (
          <div className="schedule-row" key={field.id}>
            <select aria-label={`Día ${index + 1}`} className="form-select" {...form.register(`horarios.${index}.dia`)}>
              {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
            <Input aria-label={`Inicio ${index + 1}`} type="time" {...form.register(`horarios.${index}.horaInicio`)} />
            <Input aria-label={`Fin ${index + 1}`} type="time" {...form.register(`horarios.${index}.horaFin`)} />
            <select aria-label={`Modalidad ${index + 1}`} className="form-select" {...form.register(`horarios.${index}.modalidad`)}>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hibrido">Híbrido</option>
            </select>
            <Input aria-label={`Ubicación ${index + 1}`} placeholder="Aula o enlace" {...form.register(`horarios.${index}.ubicacion`)} />
            <Button disabled={scheduleFields.fields.length === 1} onClick={() => scheduleFields.remove(index)} type="button" variant="ghost">Quitar</Button>
          </div>
        ))}
        {form.formState.errors.horarios?.root?.message ? <small className="field-error">{form.formState.errors.horarios.root.message}</small> : null}
        <Button onClick={() => scheduleFields.append({ ...emptyScheduleBlock })} type="button" variant="secondary">Agregar horario</Button>
      </fieldset>
      <div className="operation-form__actions">
        {error ? <div className="error-banner">{getApiErrorMessage(error, 'No se pudo guardar el curso programado.')}</div> : null}
        <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">Cancelar</Button>
        <Button disabled={pending} type="submit">{pending ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Guardar'}</Button>
      </div>
    </form>
  );
}
