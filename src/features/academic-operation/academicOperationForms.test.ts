import { describe, expect, it } from 'vitest';
import {
  academicRecordSchema,
  careerRegistrationSchema,
  authorizationSchema,
  enrollmentSchema,
  scheduledCourseSchema,
} from './academicOperationForms';

const id = '00000000-0000-4000-8000-000000000001';

describe('campos operativos de cursos programados', () => {
  it('completa los campos operativos predeterminados', () => {
    const result = scheduledCourseSchema.parse({
      carreraId: id,
      planCurricularId: id,
      planCursoId: id,
      periodoAcademicoId: id,
      profesorPersonaId: id,
    });
    expect(result.seccion).toBe('ÚNICA');
    expect(result.estado).toBe('activo');
    expect(result.horarios).toHaveLength(1);
  });

  it('rechaza una sección vacía y un cupo no positivo', () => {
    const base = {
      carreraId: id, planCurricularId: id, planCursoId: id,
      periodoAcademicoId: id, profesorPersonaId: id,
      horarios: [{ dia: 'lunes', horaInicio: '18:00', horaFin: '20:00', modalidad: 'presencial', ubicacion: 'Sala 1' }],
    };
    expect(scheduledCourseSchema.safeParse({ ...base, seccion: '' }).success).toBe(false);
    const nonPositiveCapacity = scheduledCourseSchema.safeParse({ ...base, cupoMaximo: 0 });
    const excessiveCapacity = scheduledCourseSchema.safeParse({ ...base, cupoMaximo: 501 });
    expect(nonPositiveCapacity.success).toBe(false);
    expect(excessiveCapacity.success).toBe(false);
    if (!nonPositiveCapacity.success && !excessiveCapacity.success) {
      expect(nonPositiveCapacity.error.issues[0]?.message).toBe('El cupo máximo debe ser mayor que 0');
      expect(excessiveCapacity.error.issues[0]?.message).toBe('El cupo máximo no puede superar 500');
    }
  });

  it('rechaza horarios invertidos o sin ubicación', () => {
    const base = {
      carreraId: id, planCurricularId: id, planCursoId: id,
      periodoAcademicoId: id, profesorPersonaId: id, seccion: 'A', estado: 'activo',
    };
    expect(scheduledCourseSchema.safeParse({
      ...base,
      horarios: [{ dia: 'lunes', horaInicio: '20:00', horaFin: '18:00', modalidad: 'presencial', ubicacion: 'Sala 1' }],
    }).success).toBe(false);
    expect(scheduledCourseSchema.safeParse({
      ...base,
      horarios: [{ dia: 'lunes', horaInicio: '18:00', horaFin: '20:00', modalidad: 'presencial', ubicacion: '' }],
    }).success).toBe(false);
  });
});

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
      carreraId: id, periodoInicioId: id,
    }).success).toBe(true);
    expect(careerRegistrationSchema.safeParse({
      carreraId: id, periodoInicioId: '',
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
