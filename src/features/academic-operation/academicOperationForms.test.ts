import { describe, expect, it } from 'vitest';
import {
  authorizationSchema,
  enrollmentSchema,
  scheduledCourseSchema,
} from './academicOperationForms';

const id = '00000000-0000-4000-8000-000000000001';

describe('formularios de operación académica', () => {
  it('acepta una matrícula periódica válida sin costo', () => {
    const result = enrollmentSchema.safeParse({
      personaId: id,
      carreraId: id,
      planCurricularId: id,
      periodoAcademicoId: id,
      fechaMatricula: '2026-07-02',
      costo: '',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza una programación sin sección', () => {
    const result = scheduledCourseSchema.safeParse({
      carreraId: id,
      planCurricularId: id,
      planCursoId: id,
      periodoAcademicoId: id,
      profesorPersonaId: id,
      seccion: ' ',
    });
    expect(result.success).toBe(false);
  });

  it('exige un motivo suficiente para una excepción', () => {
    expect(authorizationSchema.safeParse({ motivo: 'breve' }).success).toBe(false);
    expect(authorizationSchema.safeParse({ motivo: 'Sustento académico documentado' }).success).toBe(true);
  });
});
