import { describe, expect, it } from 'vitest';
import type { ScheduledCourse } from '../../api/types';
import {
  scheduledCourseToFormValues,
  toCreateScheduledCoursePayload,
  toUpdateScheduledCoursePayload,
} from './scheduledCourseEditing';

const course: ScheduledCourse = {
  id: '00000000-0000-4000-8000-000000000001',
  seccion: 'A', estado: 'activo',
  planCursoId: '00000000-0000-4000-8000-000000000002',
  cursoId: '00000000-0000-4000-8000-000000000003',
  cursoCodigo: 'ACT201', cursoNombre: 'Actuación II', ciclo: 2,
  planCurricularId: '00000000-0000-4000-8000-000000000004', planNombre: 'Plan 2026',
  carreraId: '00000000-0000-4000-8000-000000000005', carreraNombre: 'Club Escuela',
  periodoAcademicoId: '00000000-0000-4000-8000-000000000006', periodoNombre: '2026-I',
  profesorPersonaId: '00000000-0000-4000-8000-000000000007', profesorNombres: 'Ana',
  profesorApellidoPaterno: 'Ruiz', profesorApellidoMaterno: null,
  cupoMaximo: null,
  horarios: [{
    id: '00000000-0000-4000-8000-000000000008', dia: 'martes',
    horaInicio: '18:00:00', horaFin: '20:00:00', modalidad: 'presencial', ubicacion: 'Sala 2',
  }],
};

describe('edición de cursos programados', () => {
  it('convierte el registro API en valores editables', () => {
    expect(scheduledCourseToFormValues(course)).toMatchObject({
      carreraId: course.carreraId,
      planCursoId: course.planCursoId,
      profesorPersonaId: course.profesorPersonaId,
      seccion: 'A', estado: 'activo', cupoMaximo: null,
      horarios: [{ horaInicio: '18:00', horaFin: '20:00', ubicacion: 'Sala 2' }],
    });
  });

  it('omite el profesor histórico cuando no cambia al editar otro campo', () => {
    const values = scheduledCourseToFormValues(course);
    expect(toUpdateScheduledCoursePayload({ ...values, seccion: 'B' }, course.profesorPersonaId)).toEqual({
      seccion: 'B', estado: 'activo', cupoMaximo: null,
      horarios: [{ dia: 'martes', horaInicio: '18:00', horaFin: '20:00', modalidad: 'presencial', ubicacion: 'Sala 2' }],
    });
    expect(toCreateScheduledCoursePayload(values)).toMatchObject({
      planCursoId: course.planCursoId,
      periodoAcademicoId: course.periodoAcademicoId,
      seccion: 'A',
    });
  });

  it('incluye profesorPersonaId solamente cuando el docente cambia', () => {
    const values = scheduledCourseToFormValues(course);
    const newProfessorId = '00000000-0000-4000-8000-000000000099';

    expect(toUpdateScheduledCoursePayload(
      { ...values, profesorPersonaId: newProfessorId },
      course.profesorPersonaId,
    )).toMatchObject({ profesorPersonaId: newProfessorId });
  });
});
