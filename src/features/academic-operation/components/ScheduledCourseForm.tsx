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
  catalogState: {
    loading: boolean;
    error: boolean;
    onRetry: () => void;
  };
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
  catalogState,
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
  const activeCareers = careers.filter((item) => item.estado === 'activo');
  const availablePlanCourses = planCourses.filter((item) => (
    item.planCurricularId === planId && item.estado === 'activo'
  ));
  const availablePeriods = periods.filter((item) => (
    item.carreraId === careerId && (mode === 'edit' || item.estado !== 'culminado')
  ));
  const activePlans = plans.filter((item) => item.estado === 'activo');
  const activeCourses = courses.filter((item) => item.estado === 'activo');
  const activePlanCourses = planCourses.filter((item) => item.estado === 'activo');
  const openPeriods = periods.filter((item) => item.estado !== 'culminado');
  const emptyCatalogMessages = catalogState.loading || catalogState.error ? [] : [
    ...(mode === 'create' && activeCareers.length === 0
      ? ['No hay carreras activas disponibles.']
      : []),
    ...(mode === 'create' && activePlans.length === 0
      ? ['No hay planes curriculares activos disponibles.']
      : []),
    ...(mode === 'create' && activeCourses.length === 0
      ? ['No hay cursos activos disponibles.']
      : []),
    ...(mode === 'create' && activePlanCourses.length === 0
      ? ['No hay cursos vinculados a planes activos.']
      : []),
    ...(mode === 'create' && openPeriods.length === 0
      ? ['No hay periodos académicos disponibles.']
      : []),
    ...(mode === 'create' && teachers.length === 0
      ? ['No hay profesores activos disponibles.']
      : []),
    ...(mode === 'create' && activePlans.length > 0 && Boolean(careerId) && !activePlanId
      ? ['La carrera seleccionada no tiene un plan curricular activo.']
      : []),
    ...(mode === 'create' && activePlanCourses.length > 0 && Boolean(planId) && availablePlanCourses.length === 0
      ? ['El plan seleccionado no tiene cursos activos disponibles.']
      : []),
    ...(mode === 'create' && openPeriods.length > 0 && Boolean(careerId) && availablePeriods.length === 0
      ? ['La carrera seleccionada no tiene periodos disponibles.']
      : []),
  ];
  const catalogsUnavailable = catalogState.loading
    || catalogState.error
    || emptyCatalogMessages.length > 0;
  const scheduleCollectionError = form.formState.errors.horarios?.root?.message
    ?? form.formState.errors.horarios?.message;

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
      {catalogState.loading ? (
        <div className="scheduled-course-form__catalog-state" role="status">
          Cargando catálogos para el formulario…
        </div>
      ) : null}
      {catalogState.error ? (
        <div className="error-banner scheduled-course-form__catalog-state" role="alert">
          <span>No se pudieron cargar los catálogos del formulario.</span>
          <Button onClick={catalogState.onRetry} type="button" variant="secondary">Reintentar</Button>
        </div>
      ) : null}
      {emptyCatalogMessages.length ? (
        <div className="scheduled-course-form__catalog-state" role="status">
          <strong>Faltan opciones para guardar.</strong>
          <ul>{emptyCatalogMessages.map((message) => <li key={message}>{message}</li>)}</ul>
        </div>
      ) : null}
      <FormField error={form.formState.errors.carreraId?.message} htmlFor="scheduled-career" label="Carrera">
        <select className="form-select" disabled={mode === 'edit' || catalogState.loading || catalogState.error} id="scheduled-career" {...form.register('carreraId')}>
          <option value="">Seleccionar</option>
          {mode === 'edit' && course ? <option value={course.carreraId}>{course.carreraNombre}</option> : null}
          {activeCareers.filter((item) => mode !== 'edit' || item.id !== course?.carreraId).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
      </FormField>
      <FormField error={form.formState.errors.planCursoId?.message} htmlFor="scheduled-course" label="Curso">
        <select className="form-select" disabled={mode === 'edit' || !planId || catalogState.loading || catalogState.error} id="scheduled-course" {...form.register('planCursoId')}>
          <option value="">Seleccionar</option>
          {mode === 'edit' && course ? <option value={course.planCursoId}>Ciclo {course.ciclo} · {course.cursoNombre}</option> : null}
          {availablePlanCourses.filter((item) => mode !== 'edit' || item.id !== course?.planCursoId).map((item) => (
            <option key={item.id} value={item.id}>Ciclo {item.ciclo} · {courses.find((courseItem) => courseItem.id === item.cursoId)?.nombre ?? 'Curso'}</option>
          ))}
        </select>
      </FormField>
      <FormField error={form.formState.errors.periodoAcademicoId?.message} htmlFor="scheduled-period" label="Periodo">
        <select className="form-select" disabled={mode === 'edit' || catalogState.loading || catalogState.error} id="scheduled-period" {...form.register('periodoAcademicoId')}>
          <option value="">Seleccionar</option>
          {mode === 'edit' && course ? <option value={course.periodoAcademicoId}>{course.periodoNombre}</option> : null}
          {availablePeriods.filter((item) => mode !== 'edit' || item.id !== course?.periodoAcademicoId).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
      </FormField>
      <FormField error={form.formState.errors.profesorPersonaId?.message} htmlFor="scheduled-teacher" label="Profesor">
        <select className="form-select" disabled={catalogState.loading || catalogState.error} id="scheduled-teacher" {...form.register('profesorPersonaId')}>
          <option value="">Seleccionar</option>
          {mode === 'edit' && course ? <option value={course.profesorPersonaId}>{course.profesorApellidoPaterno}, {course.profesorNombres}</option> : null}
          {teachers.filter((item) => mode !== 'edit' || item.id !== course?.profesorPersonaId).map((item) => <option key={item.id} value={item.id}>{item.apellidoPaterno}, {item.nombres}</option>)}
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
      <fieldset
        aria-describedby={scheduleCollectionError ? 'scheduled-course-schedules-error' : undefined}
        aria-invalid={Boolean(scheduleCollectionError)}
        className="schedule-fieldset"
      >
        <legend>Horarios</legend>
        {scheduleFields.fields.map((field, index) => {
          const scheduleError = form.formState.errors.horarios?.[index];
          const dayError = scheduleError?.dia?.message;
          const startError = scheduleError?.horaInicio?.message;
          const endError = scheduleError?.horaFin?.message;
          const modalityError = scheduleError?.modalidad?.message;
          const locationError = scheduleError?.ubicacion?.message;
          const errorId = (name: string) => `scheduled-course-schedule-${field.id}-${name}-error`;

          return (
            <div className="schedule-row" key={field.id}>
              <div className="schedule-control">
                <select
                  aria-describedby={dayError ? errorId('day') : undefined}
                  aria-invalid={Boolean(dayError)}
                  aria-label={`Día ${index + 1}`}
                  className="form-select"
                  {...form.register(`horarios.${index}.dia`)}
                >
                  {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
                {dayError ? <small className="field-error" id={errorId('day')} role="alert">{dayError}</small> : null}
              </div>
              <div className="schedule-control">
                <Input
                  aria-describedby={startError ? errorId('start') : undefined}
                  aria-invalid={Boolean(startError)}
                  aria-label={`Inicio ${index + 1}`}
                  type="time"
                  {...form.register(`horarios.${index}.horaInicio`)}
                />
                {startError ? <small className="field-error" id={errorId('start')} role="alert">{startError}</small> : null}
              </div>
              <div className="schedule-control">
                <Input
                  aria-describedby={endError ? errorId('end') : undefined}
                  aria-invalid={Boolean(endError)}
                  aria-label={`Fin ${index + 1}`}
                  type="time"
                  {...form.register(`horarios.${index}.horaFin`)}
                />
                {endError ? <small className="field-error" id={errorId('end')} role="alert">{endError}</small> : null}
              </div>
              <div className="schedule-control">
                <select
                  aria-describedby={modalityError ? errorId('modality') : undefined}
                  aria-invalid={Boolean(modalityError)}
                  aria-label={`Modalidad ${index + 1}`}
                  className="form-select"
                  {...form.register(`horarios.${index}.modalidad`)}
                >
                  <option value="presencial">Presencial</option>
                  <option value="virtual">Virtual</option>
                  <option value="hibrido">Híbrido</option>
                </select>
                {modalityError ? <small className="field-error" id={errorId('modality')} role="alert">{modalityError}</small> : null}
              </div>
              <div className="schedule-control">
                <Input
                  aria-describedby={locationError ? errorId('location') : undefined}
                  aria-invalid={Boolean(locationError)}
                  aria-label={`Ubicación ${index + 1}`}
                  placeholder="Aula o enlace"
                  {...form.register(`horarios.${index}.ubicacion`)}
                />
                {locationError ? <small className="field-error" id={errorId('location')} role="alert">{locationError}</small> : null}
              </div>
              <Button disabled={scheduleFields.fields.length === 1} onClick={() => scheduleFields.remove(index)} type="button" variant="ghost">Quitar</Button>
            </div>
          );
        })}
        {scheduleCollectionError ? (
          <small className="field-error" id="scheduled-course-schedules-error" role="alert">
            {scheduleCollectionError}
          </small>
        ) : null}
        <Button onClick={() => scheduleFields.append({ ...emptyScheduleBlock })} type="button" variant="secondary">Agregar horario</Button>
      </fieldset>
      <div className="operation-form__actions">
        {error ? <div className="error-banner" role="alert">{getApiErrorMessage(error, 'No se pudo guardar el curso programado.')}</div> : null}
        <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">Cancelar</Button>
        <Button disabled={pending || catalogsUnavailable} type="submit">{pending ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Guardar'}</Button>
      </div>
    </form>
  );
}
