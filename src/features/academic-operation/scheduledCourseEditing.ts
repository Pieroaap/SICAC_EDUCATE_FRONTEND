import type { ScheduledCourse } from '../../api/types';
import { emptyScheduleBlock, type ScheduledCourseValues } from './academicOperationForms';

export type ScheduledCourseUpdatePayload = Pick<
  ScheduledCourseValues,
  'profesorPersonaId' | 'seccion' | 'estado' | 'cupoMaximo' | 'horarios'
>;

export function scheduledCourseToFormValues(course: ScheduledCourse): ScheduledCourseValues {
  return {
    carreraId: course.carreraId,
    planCurricularId: course.planCurricularId,
    planCursoId: course.planCursoId,
    periodoAcademicoId: course.periodoAcademicoId,
    profesorPersonaId: course.profesorPersonaId,
    seccion: course.seccion,
    estado: course.estado,
    cupoMaximo: course.cupoMaximo,
    horarios: course.horarios.length ? course.horarios.map((item) => ({
      dia: item.dia,
      horaInicio: item.horaInicio.slice(0, 5),
      horaFin: item.horaFin.slice(0, 5),
      modalidad: item.modalidad,
      ubicacion: item.ubicacion ?? '',
    })) : [{ ...emptyScheduleBlock }],
  };
}

export function toCreateScheduledCoursePayload(values: ScheduledCourseValues) {
  return {
    planCursoId: values.planCursoId,
    periodoAcademicoId: values.periodoAcademicoId,
    profesorPersonaId: values.profesorPersonaId,
    seccion: values.seccion,
    cupoMaximo: values.cupoMaximo ?? undefined,
    horarios: values.horarios,
  };
}

export function toUpdateScheduledCoursePayload(
  values: ScheduledCourseValues,
): ScheduledCourseUpdatePayload {
  return {
    profesorPersonaId: values.profesorPersonaId,
    seccion: values.seccion,
    estado: values.estado,
    cupoMaximo: values.cupoMaximo,
    horarios: values.horarios,
  };
}
