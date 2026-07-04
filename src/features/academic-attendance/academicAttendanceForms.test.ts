import { describe, expect, it } from 'vitest';
import {
  attendanceBatchSchema, clampAttendanceDate, reactivationReasonSchema, todayIso,
} from './academicAttendanceForms';

describe('formularios de asistencia', () => {
  it('valida estados y al menos una fila', () => {
    expect(attendanceBatchSchema.safeParse({ fecha: '2026-07-03', entries: [] }).success).toBe(false);
    expect(attendanceBatchSchema.safeParse({
      fecha: '2026-07-03',
      entries: [{ enrollmentId: crypto.randomUUID(), state: 'presente' }],
    }).success).toBe(true);
  });

  it('limita la fecha al periodo', () => {
    expect(clampAttendanceDate('2026-01-01', '2026-06-01', '2026-07-31')).toBe('2026-06-01');
  });

  it('exige motivo suficiente', () => {
    expect(reactivationReasonSchema.safeParse('breve').success).toBe(false);
  });

  it('usa la fecha local del equipo como valor inicial', () => {
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    expect(todayIso()).toBe(expected);
  });
});
