import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Save } from 'lucide-react';
import { useState } from 'react';
import type { PersonDetail, RoleCode } from '../../../api/types';
import { getApiErrorMessage } from '../../../api/client';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { cn } from '../../../lib/cn';
import { updateStudentProfile } from '../api/peopleApi';
import { canUpdateStudentProfile } from '../personActions';
import { toStudentProfilePayload, type StudentProfileValues } from '../personForm';
import {
  benefitOptions,
  benefitTypeOptions,
  humanizeStudentValue,
  studentStateOptions,
} from '../studentProfileOptions';

type Props = {
  actorRoles: RoleCode[];
  onFeedback: (feedback: { type: 'success' | 'error'; message: string }) => void;
  person: PersonDetail;
};

function profileToValues(profile: NonNullable<PersonDetail['alumnoPerfil']>): StudentProfileValues {
  return {
    estado: profile.estado,
    anioIngreso: profile.anioIngreso,
    periodoIngreso: profile.periodoIngreso,
    beneficio: profile.beneficio,
    tipoBeneficio: profile.tipoBeneficio,
  };
}

export function PersonStudentProfilePanel({ actorRoles, onFeedback, person }: Props) {
  const queryClient = useQueryClient();
  const profile = person.alumnoPerfil;
  const sourceKey = profile
    ? [
      person.id,
      profile.estado,
      profile.anioIngreso,
      profile.periodoIngreso,
      profile.beneficio,
      profile.tipoBeneficio,
    ].join('|')
    : person.id;
  const [draft, setDraft] = useState<{
    values: StudentProfileValues | null;
    personId: string;
    sourceKey: string;
  }>({
    values: profile ? profileToValues(profile) : null,
    personId: person.id,
    sourceKey,
  });
  const canEdit = canUpdateStudentProfile(actorRoles);
  const draftIsCurrent = draft.personId === person.id && draft.sourceKey === sourceKey;
  const editableProfile = draftIsCurrent ? draft.values : profile ? profileToValues(profile) : null;
  const sourceProfile = profile ? profileToValues(profile) : null;
  const hasChanged = Boolean(
    sourceProfile
      && editableProfile
      && JSON.stringify(toStudentProfilePayload(editableProfile)) !== JSON.stringify(sourceProfile),
  );
  const selectedState = studentStateOptions.find((option) => option.value === editableProfile?.estado);

  const updateDraft = <Key extends keyof StudentProfileValues>(key: Key, value: StudentProfileValues[Key]) => {
    if (!editableProfile) return;
    setDraft({
      values: { ...editableProfile, [key]: value },
      personId: person.id,
      sourceKey,
    });
  };

  const updateMutation = useMutation({
    mutationFn: () => updateStudentProfile(person.id, toStudentProfilePayload(editableProfile!)),
    onSuccess: async () => {
      onFeedback({ type: 'success', message: 'Perfil de alumno actualizado correctamente.' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['person', person.id] }),
        queryClient.invalidateQueries({ queryKey: ['students'] }),
      ]);
    },
    onError: (error) => {
      onFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'No pudimos actualizar el perfil del alumno.'),
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
          <p>Estos datos son propios del alumno; no inactivan la persona ni sus otros roles.</p>
        </div>
        <span className={cn('profile-state', `is-${profile.estado}`)}>
          {studentStateOptions.find((option) => option.value === profile.estado)?.label
            ?? humanizeStudentValue(profile.estado)}
        </span>
      </div>

      <dl className="student-profile-facts">
        <div>
          <dt>Ingreso</dt>
          <dd>{profile.periodoIngreso} · Año {profile.anioIngreso}</dd>
        </div>
        <div>
          <dt>Beneficio</dt>
          <dd>{humanizeStudentValue(profile.beneficio)} · {humanizeStudentValue(profile.tipoBeneficio)}</dd>
        </div>
      </dl>

      <div className="student-profile-edit-grid">
        <FormField htmlFor="studentEstado" label="Estado operativo">
          <select
            className="form-select"
            disabled={!canEdit || updateMutation.isPending}
            id="studentEstado"
            onChange={(event) => updateDraft('estado', event.target.value as StudentProfileValues['estado'])}
            value={editableProfile?.estado}
          >
            {studentStateOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FormField>
        <FormField htmlFor="studentAnioIngreso" label="Año de ingreso">
          <Input
            disabled={!canEdit || updateMutation.isPending}
            id="studentAnioIngreso"
            inputMode="numeric"
            onChange={(event) => updateDraft('anioIngreso', Number(event.target.value))}
            type="number"
            value={editableProfile?.anioIngreso ?? ''}
          />
        </FormField>
        <FormField htmlFor="studentPeriodoIngreso" label="Periodo de ingreso">
          <Input
            disabled={!canEdit || updateMutation.isPending}
            id="studentPeriodoIngreso"
            onChange={(event) => updateDraft('periodoIngreso', event.target.value)}
            placeholder="2026-I"
            value={editableProfile?.periodoIngreso ?? ''}
          />
        </FormField>
        <FormField htmlFor="studentBeneficio" label="Beneficio">
          <select
            className="form-select"
            disabled={!canEdit || updateMutation.isPending}
            id="studentBeneficio"
            onChange={(event) => updateDraft('beneficio', event.target.value as StudentProfileValues['beneficio'])}
            value={editableProfile?.beneficio}
          >
            {benefitOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FormField>
        <FormField htmlFor="studentTipoBeneficio" label="Tipo de beneficio">
          <select
            className="form-select"
            disabled={!canEdit || updateMutation.isPending}
            id="studentTipoBeneficio"
            onChange={(event) => updateDraft('tipoBeneficio', event.target.value as StudentProfileValues['tipoBeneficio'])}
            value={editableProfile?.tipoBeneficio}
          >
            {benefitTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FormField>
      </div>
      <p>{selectedState?.description}</p>

      <Button
        disabled={!canEdit || !hasChanged || !editableProfile || updateMutation.isPending}
        onClick={() => updateMutation.mutate()}
        type="button"
        variant="secondary"
      >
        {updateMutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
        Guardar perfil de alumno
      </Button>

      {!canEdit ? <small>No tienes permisos para modificar el perfil de alumno.</small> : null}
    </div>
  );
}
