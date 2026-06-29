import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { PersonDetail, RoleCode } from '../../../api/types';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import {
  enablePersonAccess,
  resetPersonPassword,
  type ProvisionableRole,
} from '../api/peopleApi';
import { accessRoleOptions, canProvisionAccess, canResetPassword } from '../personActions';

type Props = {
  actorPersonaId?: string;
  actorRoles: RoleCode[];
  onFeedback: (feedback: { type: 'success' | 'error'; message: string }) => void;
  person: PersonDetail;
};

export function PersonAccessPanel({ actorPersonaId, actorRoles, onFeedback, person }: Props) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<ProvisionableRole>('PROFESOR');
  const canEnable = canProvisionAccess(actorRoles);
  const isSelf = actorPersonaId === person.id;
  const canReset = canResetPassword(actorRoles, person) && !isSelf;

  async function refreshPerson() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['people'] }),
      queryClient.invalidateQueries({ queryKey: ['students'] }),
      queryClient.invalidateQueries({ queryKey: ['teachers'] }),
      queryClient.invalidateQueries({ queryKey: ['person', person.id] }),
    ]);
  }

  const enableMutation = useMutation({
    mutationFn: () => enablePersonAccess(person.id, role),
    onSuccess: async () => {
      onFeedback({
        type: 'success',
        message: 'Acceso habilitado. La contraseña temporal es el documento de la persona.',
      });
      await refreshPerson();
    },
    onError: (error) => {
      onFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos habilitar el acceso.') });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => resetPersonPassword(person.id),
    onSuccess: async (result) => {
      onFeedback({ type: 'success', message: result.message });
      await refreshPerson();
    },
    onError: (error) => {
      onFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos reiniciar la contraseña.') });
    },
  });

  return (
    <div className="detail-panel action-panel">
      <h3>Acceso al sistema</h3>
      {person.tieneAcceso ? (
        <>
          <p>La cuenta está habilitada. Si la persona olvidó su clave, puedes reiniciarla al documento.</p>
          <Button
            disabled={!canReset || resetMutation.isPending}
            onClick={() => {
              if (!window.confirm('La clave volverá al documento y deberá cambiarse al iniciar sesión. ¿Continuar?')) return;
              onFeedback({ type: 'success', message: 'Procesando reinicio de clave…' });
              resetMutation.mutate();
            }}
            type="button"
            variant="secondary"
          >
            {resetMutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <KeyRound size={17} />}
            Reiniciar clave
          </Button>
          {!canReset ? (
            <small>
              {isSelf
                ? 'Para tu propia cuenta usa la opción de cambiar clave.'
                : 'No tienes permisos para reiniciar esta cuenta.'}
            </small>
          ) : null}
        </>
      ) : (
        <>
          <p>Crea una cuenta operativa y asigna el rol inicial. El portal de alumno queda fuera de este corte.</p>
          <label className="select-filter action-panel__select">
            <span>Rol inicial</span>
            <select
              disabled={!canEnable || enableMutation.isPending}
              onChange={(event) => setRole(event.target.value as ProvisionableRole)}
              value={role}
            >
              {accessRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <Button
            disabled={!canEnable || enableMutation.isPending}
            onClick={() => {
              onFeedback({ type: 'success', message: 'Habilitando acceso…' });
              enableMutation.mutate();
            }}
            type="button"
          >
            {enableMutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
            Habilitar acceso
          </Button>
          {!canEnable ? <small>Solo administración del sistema puede crear cuentas de acceso.</small> : null}
        </>
      )}
    </div>
  );
}
