import { api } from '../../../api/client';
import type {
  AttendanceBook,
  AttendanceCourse,
  AttendanceReactivationRequest,
  AttendanceState,
  PaginatedResponse,
} from '../../../api/types';

export async function getAttendanceCourses() {
  const { data } = await api.get<PaginatedResponse<AttendanceCourse>>('/asistencia/cursos');
  return data;
}

export async function getAttendanceBook(courseId: string, date: string) {
  const { data } = await api.get<AttendanceBook>(
    `/cursos-programados/${courseId}/libro-asistencia`,
    { params: { fecha: date } },
  );
  return data;
}

export async function saveAttendance(
  courseId: string,
  date: string,
  entries: Array<{ enrollmentId: string; state: AttendanceState }>,
) {
  const { data } = await api.put(`/cursos-programados/${courseId}/asistencias`, { fecha: date, entries });
  return data;
}

export async function createReactivationRequest(withdrawalId: string, motivo: string) {
  const { data } = await api.post(
    `/retiros-asistencia/${withdrawalId}/solicitudes-reactivacion`,
    { motivo },
  );
  return data;
}

export async function getReactivationRequests(estado = 'pendiente') {
  const { data } = await api.get<PaginatedResponse<AttendanceReactivationRequest>>(
    '/solicitudes-reactivacion-asistencia',
    { params: { estado } },
  );
  return data;
}

export async function resolveReactivationRequest(
  requestId: string,
  decision: 'aprobada' | 'rechazada',
  observacion?: string,
) {
  const { data } = await api.patch(
    `/solicitudes-reactivacion-asistencia/${requestId}/resolucion`,
    { decision, observacion },
  );
  return data;
}
