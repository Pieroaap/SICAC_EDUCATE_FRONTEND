import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { PersonDetail, RoleCode } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { getAcademicPeriods, getCareers } from '../../academic-structure/api/academicStructureApi';
import { assignPersonRole } from '../api/peopleApi';

const roleOptions: Array<{ value: RoleCode; label: string }> = [
  { value: 'ALUMNO', label: 'Alumno' },
  { value: 'PROFESOR', label: 'Profesor' },
  { value: 'GESTOR_ACADEMICO', label: 'Gestor académico' },
  { value: 'DIRECTOR_ACADEMICO', label: 'Director académico' },
  { value: 'ADMINISTRADOR_SISTEMA', label: 'Administrador del sistema' },
];
const periodOrder = { I: 1, II: 2, III: 3 } as const;

export function PersonRolesPanel({ person, actorRoles }: { person: PersonDetail; actorRoles: RoleCode[] }) {
  const queryClient = useQueryClient();
  const availableRoles = roleOptions.filter((option) => !person.roles.some(
    (assigned) => assigned.codigo === option.value && assigned.estado === 'activo',
  ));
  const [role, setRole] = useState<RoleCode>(() => availableRoles[0]?.value ?? 'PROFESOR');
  const [careerId, setCareerId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers, enabled: role === 'ALUMNO' });
  const periods = useQuery({
    queryKey: ['academic', 'periods', careerId],
    queryFn: () => getAcademicPeriods({ carreraId: careerId }),
    enabled: role === 'ALUMNO' && Boolean(careerId),
  });
  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = periods.data?.find((period) => (
    period.fechaInicio <= today && period.fechaFin >= today
  ));
  const eligiblePeriods = currentPeriod
    ? periods.data?.filter((period) => (
      period.anio > currentPeriod.anio
      || (period.anio === currentPeriod.anio
        && periodOrder[period.periodo] >= periodOrder[currentPeriod.periodo])
    )).sort((left, right) => (
      left.anio - right.anio || periodOrder[left.periodo] - periodOrder[right.periodo]
    )) ?? []
    : [];
  const mutation = useMutation({
    mutationFn: () => assignPersonRole(person.id, {
      role,
      ...(role === 'ALUMNO' ? {
        student: {
          carreraId: careerId, periodoInicioId: periodId,
          estado: 'activo' as const, beneficio: 'normal' as const, tipoBeneficio: 'regular' as const,
        },
      } : {}),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['person', person.id] }),
  });
  if (!actorRoles.includes('ADMINISTRADOR_SISTEMA')) return null;
  return (
    <div className="detail-panel action-panel">
      <h3>Agregar rol</h3>
      <p>Asigna un rol adicional sin reemplazar los roles vigentes.</p>
      <select aria-label="Nuevo rol" className="form-select" disabled={availableRoles.length === 0} onChange={(event) => setRole(event.target.value as RoleCode)} value={role}>
        {availableRoles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {role === 'ALUMNO' ? (
        <>
          <select aria-label="Carrera para el rol alumno" className="form-select" onChange={(event) => { setCareerId(event.target.value); setPeriodId(''); }} value={careerId}>
            <option value="">Carrera</option>
            {careers.data?.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <select aria-label="Periodo de ingreso del rol alumno" className="form-select" onChange={(event) => setPeriodId(event.target.value)} value={periodId}>
            <option value="">Periodo de inicio</option>
            {eligiblePeriods.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          {careerId && !periods.isPending && !currentPeriod ? (
            <small>La carrera no tiene un periodo académico vigente.</small>
          ) : null}
        </>
      ) : null}
      <Button disabled={availableRoles.length === 0 || mutation.isPending || (role === 'ALUMNO' && (!careerId || !periodId))} onClick={() => mutation.mutate()} type="button">
        {mutation.isPending ? 'Asignando…' : 'Agregar rol'}
      </Button>
      {availableRoles.length === 0 ? <small>La persona ya tiene todos los roles disponibles.</small> : null}
      {mutation.isError ? <small>No se pudo asignar el rol.</small> : null}
    </div>
  );
}
