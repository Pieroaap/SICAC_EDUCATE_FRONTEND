import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Save } from 'lucide-react';
import { useState } from 'react';
import type { PersonDetail, RoleCode, StudentState } from '../../../api/types';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/cn';
import { updateStudentProfile } from '../api/peopleApi';
import { canUpdateStudentProfile } from '../personActions';

const studentStateOptions: Array<{ value: StudentState; label: string; description: string }> = [
  { value: 'activo', label: 'Activo', description: 'Continúa operativo para la gestión académica.' },
  { value: 'en_pausa', label: 'En pausa', description: 'Suspensión temporal sin cerrar la identidad.' },
  { value: 'retirado', label: 'Retirado', description: 'No continúa actualmente como alumno.' },
  { value: 'sin_contestar', label: 'Sin contestar', description: 'Pendiente de confirmación o contacto.' },
  { value: 'graduado', label: 'Graduado', description: 'Culminó su trayectoria como alumno.' },
];

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

type Props = {
  actorRoles: RoleCode[];
  onFeedback: (feedback: { type: 'success' | 'error'; message: string }) => void;
  person: PersonDetail;
};

export function PersonStudentProfilePanel({ actorRoles, onFeedback, person }: Props) {
  const queryClient = useQueryClient();
  const profile = person.alumnoPerfil;
  const sourceEstado = profile?.estado ?? 'activo';
  const [draft, setDraft] = useState<{
    estado: StudentState;
    personId: string;
    sourceEstado: StudentState;
  }>({
    estado: sourceEstado,
    personId: person.id,
    sourceEstado,
  });
  const canEdit = canUpdateStudentProfile(actorRoles);
  const draftIsCurrent = draft.personId === person.id && draft.sourceEstado === sourceEstado;
  const estado = draftIsCurrent ? draft.estado : sourceEstado;
  const hasChanged = profile ? estado !== sourceEstado : false;
  const selectedState = studentStateOptions.find((option) => option.value === estado);

  const updateMutation = useMutation({
    mutationFn: () => updateStudentProfile(person.id, { estado }),
    onSuccess: async () => {
      onFeedback({ type: 'success', message: 'Estado operativo del alumno actualizado correctamente.' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['person', person.id] }),
        queryClient.invalidateQueries({ queryKey: ['students'] }),
      ]);
    },
    onError: (error) => {
      onFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'No pudimos actualizar el estado del alumno.'),
      });
    },
  });

  if (!profile) {
    return (
      <div className="detail-panel student-profile-panel">
        <h3>Perfil de alumno</h3>
        <p>Esta persona tiene rol Alumno, pero aún no tiene perfil operativo asociado.</p>
      </div>
    );
  }

  return (
    <div className="detail-panel student-profile-panel">
      <div className="student-profile-panel__heading">
        <div>
          <h3>Perfil de alumno</h3>
          <p>Este estado no inactiva la persona ni sus otros roles.</p>
        </div>
        <span className={cn('profile-state', `is-${profile.estado}`)}>
          {studentStateOptions.find((option) => option.value === profile.estado)?.label ?? humanize(profile.estado)}
        </span>
      </div>

      <dl className="student-profile-facts">
        <div>
          <dt>Ingreso</dt>
          <dd>{profile.periodoIngreso} · Año {profile.anioIngreso}</dd>
        </div>
        <div>
          <dt>Beneficio</dt>
          <dd>{humanize(profile.beneficio)} · {humanize(profile.tipoBeneficio)}</dd>
        </div>
      </dl>

      <label className="select-filter action-panel__select">
        <span>Estado operativo</span>
        <select
          disabled={!canEdit || updateMutation.isPending}
          onChange={(event) => setDraft({
            estado: event.target.value as StudentState,
            personId: person.id,
            sourceEstado,
          })}
          value={estado}
        >
          {studentStateOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <p>{selectedState?.description}</p>

      <Button
        disabled={!canEdit || !hasChanged || updateMutation.isPending}
        onClick={() => updateMutation.mutate()}
        type="button"
        variant="secondary"
      >
        {updateMutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
        Guardar estado de alumno
      </Button>

      {!canEdit ? <small>No tienes permisos para modificar el perfil de alumno.</small> : null}
    </div>
  );
}
