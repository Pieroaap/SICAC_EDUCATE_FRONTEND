import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import { enrollCourse } from '../api/academicOperationApi';
import { getRecognitionCourses } from '../api/recognitionApi';
import { RecognitionDialog } from './RecognitionDialog';

export function CourseEnrollmentAction({ personId, enrollmentId, scheduledCourseId, planCourseId, hasAuthorization, onEnrolled }: {
  personId: string; enrollmentId: string; scheduledCourseId: string; planCourseId: string; hasAuthorization: boolean; onEnrolled: () => Promise<void>;
}) {
  const { profile } = useAuth();
  const canRecognize = profile?.roles.some((role) => ['ADMINISTRADOR_SISTEMA', 'DIRECTOR_ACADEMICO'].includes(role.codigo));
  const [showRecognition, setShowRecognition] = useState(false);
  const [saved, setSaved] = useState(false);
  const enroll = useMutation({
    mutationFn: () => enrollCourse({ matriculaCarreraId: enrollmentId, cursoProgramadoId: scheduledCourseId,
      fechaInscripcion: new Date().toISOString().slice(0, 10) }),
    onSuccess: onEnrolled,
  });
  const check = useMutation({
    mutationFn: async () => {
      const courses = await getRecognitionCourses(personId);
      const target = courses.find((course) => course.id === planCourseId);
      if (!target) return false; // La validación definitiva pertenece al backend, también para matrículas anteriores.
      return target.prerrequisitoIds.some((id) => !courses.some((course) => course.id === id && course.estado !== 'sin_aprobacion'));
    },
    onSuccess: (missing) => { if (missing && canRecognize && !hasAuthorization) setShowRecognition(true); else enroll.mutate(); },
  });
  return <>
    <Button disabled={!scheduledCourseId || enroll.isPending || check.isPending} onClick={() => { enroll.reset(); if (canRecognize && !hasAuthorization) check.mutate(); else enroll.mutate(); }} type="button">{check.isPending ? 'Revisando prerrequisitos…' : 'Inscribir'}</Button>
    {saved ? <p role="status">Los reconocimientos ya fueron guardados. La inscripción se valida por separado.</p> : null}
    {check.error || enroll.error ? <div className="error-banner" role="alert">{getApiErrorMessage(check.error ?? enroll.error, 'No se pudo inscribir.')}</div> : null}
    {showRecognition ? <RecognitionDialog personId={personId} targetCourseId={planCourseId}
      onClose={() => setShowRecognition(false)} onSaved={() => { setShowRecognition(false); setSaved(true); enroll.mutate(); }} /> : null}
  </>;
}
