import { z } from 'zod';

export const attendanceStateSchema = z.enum(['presente', 'tardanza', 'falta', 'justificada']);
export const attendanceBatchSchema = z.object({
  fecha: z.string().date(),
  entries: z.array(z.object({
    enrollmentId: z.string().uuid(),
    state: attendanceStateSchema,
  })).min(1),
});
export const reactivationReasonSchema = z.string().trim().min(10).max(1000);

export function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function clampAttendanceDate(date: string, start: string, end: string) {
  const maximum = end < todayIso() ? end : todayIso();
  if (date < start) return start;
  if (date > maximum) return maximum;
  return date;
}
