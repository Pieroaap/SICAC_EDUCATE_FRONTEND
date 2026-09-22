import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getApiErrorMessage } from '../../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { enablePersonAccess, getPersonDetail } from '../../people/api/peopleApi';
import { canProvisionAccess } from '../../people/personActions';

type AccessRequest = { personId: string; name: string; initialRole: 'ALUMNO' | 'PROFESOR' };

export function useDirectoryAccess() {
  const { profile } = useAuth();
  const client = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const canGiveAccess = canProvisionAccess(profile?.roles.map((role) => role.codigo) ?? []);
  const mutation = useMutation({
    mutationFn: async ({ personId, initialRole }: AccessRequest) => {
      // Consultar el estado actual evita duplicar cuentas desde una lista desactualizada.
      const person = await getPersonDetail(personId);
      if (person.tieneAcceso) return { alreadyEnabled: true };
      const hasRoles = person.roles.some((role) => role.estado === 'activo' && !role.fechaFin);
      if (hasRoles) await enablePersonAccess(personId);
      else await enablePersonAccess(personId, initialRole);
      return { alreadyEnabled: false };
    },
    onMutate: () => setFeedback(null),
    onSuccess: async (result, { personId, name }) => {
      setFeedback({ type: 'success', message: result.alreadyEnabled
        ? `${name} ya tiene acceso al sistema.`
        : `Acceso habilitado para ${name}. La contraseña temporal es su documento; deberá cambiarla al iniciar sesión.` });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['people'] }),
        client.invalidateQueries({ queryKey: ['students'] }),
        client.invalidateQueries({ queryKey: ['teachers'] }),
        client.invalidateQueries({ queryKey: ['person', personId] }),
      ]);
    },
    onError: (error) => setFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos habilitar el acceso. Inténtalo nuevamente.') }),
  });
  return { canGiveAccess, mutation, feedback };
}
