import { describe, expect, it } from 'vitest';
import {
  academicRecordSchema,
  careerRegistrationSchema,
  authorizationSchema,
  enrollmentSchema,
  scheduledCourseSchema,
} from './academicOperationForms';

const id = '00000000-0000-4000-8000-000000000001';

describe('formularios de operación académica', () => {
  it('acepta una matrícula periódica válida', () => {
    const result = enrollmentSchema.safeParse({
      personaId: id,
      carreraId: id,
      planCurricularId: id,
      periodoAcademicoId: id,
    });
    expect(result.success).toBe(true);
  });

  it('acepta una programación sin sección', () => {
    const result = scheduledCourseSchema.safeParse({
      carreraId: id,
      planCurricularId: id,
      planCursoId: id,
      periodoAcademicoId: id,
      profesorPersonaId: id,
    });
    expect(result.success).toBe(true);
  });

  it('exige un motivo suficiente para una excepción', () => {
    expect(authorizationSchema.safeParse({ motivo: 'breve' }).success).toBe(false);
    expect(authorizationSchema.safeParse({ motivo: 'Sustento académico documentado' }).success).toBe(true);
  });
  it('exige un periodo de inicio para la inscripción permanente', () => {
    expect(careerRegistrationSchema.safeParse({
      carreraId: id, planCurricularId: id, periodoInicioId: id,
    }).success).toBe(true);
    expect(careerRegistrationSchema.safeParse({
      carreraId: id, planCurricularId: id, periodoInicioId: '',
    }).success).toBe(false);
  });

  it('exige fecha o periodo para un antecedente reconocido', () => {
    expect(academicRecordSchema.safeParse({
      planCursoId: id, fechaReferencial: '', periodoReferencial: '', observacion: '',
    }).success).toBe(false);
    expect(academicRecordSchema.safeParse({
      planCursoId: id, fechaReferencial: '', periodoReferencial: '2024-I', observacion: '',
    }).success).toBe(true);
  });
});
