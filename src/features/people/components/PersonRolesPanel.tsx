import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { getApiErrorMessage } from '../../../api/client';
import type { PersonDetail, RoleCode } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { getAcademicPeriods, getCareers } from '../../academic-structure/api/academicStructureApi';
import { useAuth } from '../../auth/AuthProvider';
import { hasActiveRole } from '../personActions';
import { assignPersonRole, changePersonRole, deactivatePersonRole } from '../api/peopleApi';

const roleOptions: Array<{ value: RoleCode; label: string }> = [
  { value: 'ALUMNO', label: 'Alumno' },
  { value: 'PROFESOR', label: 'Profesor' },
  { value: 'GESTOR_ACADEMICO', label: 'Gestor académico' },
  { value: 'DIRECTOR_ACADEMICO', label: 'Director académico' },
  { value: 'ADMINISTRADOR_SISTEMA', label: 'Administrador del sistema' },
];
const periodOrder = { I: 1, II: 2, III: 3 } as const;

type StudentRoleInput = {
  carreraId: string; periodoInicioId: string; estado: 'activo'; beneficio: 'normal'; tipoBeneficio: 'regular';
};
type PendingAction = { type: 'remove' | 'change'; role: RoleCode; name: string };
type Props = {
  actorPersonaId?: string;
  actorRoles: RoleCode[];
  onFeedback: (feedback: { type: 'success' | 'error'; message: string }) => void;
  person: PersonDetail;
};

function assignmentKey(role: PersonDetail['roles'][number]) {
  return `${role.codigo}-${role.fechaInicio}-${role.estado}-${role.fechaFin ?? 'vigente'}`;
}

export function PersonRolesPanel({ actorPersonaId, actorRoles, onFeedback, person }: Props) {
  const { reloadProfile } = useAuth();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeAssignments = person.roles.filter((assigned) => assigned.estado === 'activo' && !assigned.fechaFin);
  const availableRoles = roleOptions.filter((option) => !hasActiveRole(person, option.value));
  const firstAvailableRole = availableRoles[0]?.value ?? 'PROFESOR';
  const [role, setRole] = useState<RoleCode>(() => availableRoles[0]?.value ?? 'PROFESOR');
  const [replacementRole, setReplacementRole] = useState<RoleCode>('PROFESOR');
  const [addCareerId, setAddCareerId] = useState('');
  const [addPeriodId, setAddPeriodId] = useState('');
  const [changeCareerId, setChangeCareerId] = useState('');
  const [changePeriodId, setChangePeriodId] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const selectedRole = availableRoles.some((option) => option.value === role) ? role : firstAvailableRole;
  const needsAddStudentFields = selectedRole === 'ALUMNO' && pendingAction === null;
  const needsChangeStudentFields = pendingAction?.type === 'change' && replacementRole === 'ALUMNO';
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers, enabled: needsAddStudentFields || needsChangeStudentFields });
  const addPeriods = useQuery({
    queryKey: ['academic', 'periods', addCareerId],
    queryFn: () => getAcademicPeriods({ carreraId: addCareerId }),
    enabled: needsAddStudentFields && Boolean(addCareerId),
  });
  const changePeriods = useQuery({
    queryKey: ['academic', 'periods', changeCareerId],
    queryFn: () => getAcademicPeriods({ carreraId: changeCareerId }),
    enabled: needsChangeStudentFields && Boolean(changeCareerId),
  });
  const today = new Date().toISOString().slice(0, 10);
  const eligiblePeriods = (periods: typeof addPeriods.data) => {
    const currentPeriod = periods?.find((period) => period.fechaInicio <= today && period.fechaFin >= today);
    return {
      currentPeriod,
      periods: currentPeriod
        ? [...(periods?.filter((period) => period.anio > currentPeriod.anio || (period.anio === currentPeriod.anio && periodOrder[period.periodo] >= periodOrder[currentPeriod.periodo])) ?? [])].sort((left, right) => left.anio - right.anio || periodOrder[left.periodo] - periodOrder[right.periodo])
        : [],
    };
  };
  const addPeriodOptions = eligiblePeriods(addPeriods.data);
  const changePeriodOptions = eligiblePeriods(changePeriods.data);
  const isSelf = actorPersonaId === person.id;
  const addStudent = (): StudentRoleInput => ({ carreraId: addCareerId, periodoInicioId: addPeriodId, estado: 'activo', beneficio: 'normal', tipoBeneficio: 'regular' });
  const changeStudent = (): StudentRoleInput => ({ carreraId: changeCareerId, periodoInicioId: changePeriodId, estado: 'activo', beneficio: 'normal', tipoBeneficio: 'regular' });
  const canAddRole = availableRoles.some((option) => option.value === selectedRole);

  async function refreshRoles() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['person', person.id] }),
      queryClient.invalidateQueries({ queryKey: ['people'] }),
      queryClient.invalidateQueries({ queryKey: ['students'] }),
      queryClient.invalidateQueries({ queryKey: ['teachers'] }),
    ]);
    if (isSelf) await reloadProfile();
  }
  function closeDialog() {
    dialogRef.current?.close();
    setPendingAction(null);
    setActionError(null);
    setChangeCareerId('');
    setChangePeriodId('');
  }
  function openAction(action: PendingAction) {
    setActionError(null);
    setPendingAction(action);
    if (action.type === 'change') {
      setReplacementRole(availableRoles[0]?.value ?? 'PROFESOR');
      setChangeCareerId('');
      setChangePeriodId('');
    }
    dialogRef.current?.showModal();
  }
  const addMutation = useMutation({
    mutationFn: () => {
      if (!canAddRole) throw new Error('El rol seleccionado ya está activo.');
      return assignPersonRole(person.id, { role: selectedRole, ...(selectedRole === 'ALUMNO' ? { student: addStudent() } : {}) });
    },
    onSuccess: async () => {
      if (selectedRole === 'ALUMNO') {
        setAddCareerId('');
        setAddPeriodId('');
      }
      onFeedback({ type: 'success', message: 'Rol agregado correctamente.' });
      await refreshRoles();
    },
    onError: (error) => onFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos agregar el rol.') }),
  });
  const removeMutation = useMutation({
    mutationFn: (fromRole: RoleCode) => deactivatePersonRole(person.id, fromRole),
    onSuccess: async () => { closeDialog(); onFeedback({ type: 'success', message: 'Rol retirado correctamente.' }); await refreshRoles(); },
    onError: (error) => setActionError(getApiErrorMessage(error, 'No pudimos retirar el rol.')),
  });
  const changeMutation = useMutation({
    mutationFn: ({ fromRole, toRole }: { fromRole: RoleCode; toRole: RoleCode }) => changePersonRole(person.id, { fromRole, toRole, ...(toRole === 'ALUMNO' ? { student: changeStudent() } : {}) }),
    onSuccess: async () => { closeDialog(); onFeedback({ type: 'success', message: 'Rol cambiado correctamente.' }); await refreshRoles(); },
    onError: (error) => setActionError(getApiErrorMessage(error, 'No pudimos cambiar el rol.')),
  });

  if (!actorRoles.includes('ADMINISTRADOR_SISTEMA')) return null;
  return (
    <div className="detail-panel action-panel person-roles-panel">
      <header><p className="eyebrow">Control de acceso</p><h3>Administrar roles</h3><p>Gestiona únicamente las asignaciones vigentes. El servidor valida cada operación.</p></header>
      <div>
        <h4>Roles vigentes</h4>
        {activeAssignments.length ? <ul aria-label="Roles vigentes" className="person-roles-panel__list">{activeAssignments.map((assignment) => {
          const isOwnAdministrator = isSelf && assignment.codigo === 'ADMINISTRADOR_SISTEMA';
          const onlyActiveRole = activeAssignments.length === 1;
          const cannotRemove = isOwnAdministrator || onlyActiveRole;
          const cannotChange = isOwnAdministrator || availableRoles.length === 0;
          return <li key={assignmentKey(assignment)}><div><strong>{assignment.nombre}</strong><small>Vigente desde {assignment.fechaInicio}</small></div><div className="button-row"><Button disabled={cannotChange || changeMutation.isPending || removeMutation.isPending} onClick={() => openAction({ type: 'change', role: assignment.codigo, name: assignment.nombre })} type="button" variant="secondary">Cambiar rol</Button><Button disabled={cannotRemove || changeMutation.isPending || removeMutation.isPending} onClick={() => openAction({ type: 'remove', role: assignment.codigo, name: assignment.nombre })} type="button" variant="destructive">Quitar</Button></div>{isOwnAdministrator ? <small>No puedes retirarte ni cambiar tu propio rol administrativo.</small> : null}{!isOwnAdministrator && onlyActiveRole ? <small>No se puede quitar el único rol activo de la persona.</small> : null}{!isOwnAdministrator && !onlyActiveRole && availableRoles.length === 0 ? <small>No hay otro rol disponible para el cambio.</small> : null}</li>;
        })}</ul> : <p>No hay roles activos para administrar.</p>}
      </div>
      <section aria-labelledby="add-role-heading"><h4 id="add-role-heading">Agregar rol</h4><p>Asigna un rol adicional sin reemplazar los roles vigentes.</p><select aria-label="Nuevo rol" className="form-select" disabled={availableRoles.length === 0 || addMutation.isPending} onChange={(event) => { const nextRole = event.target.value as RoleCode; setRole(nextRole); if (nextRole !== 'ALUMNO') { setAddCareerId(''); setAddPeriodId(''); } }} value={selectedRole}>{availableRoles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{needsAddStudentFields ? <StudentFields careerId={addCareerId} careers={careers.data} currentPeriod={addPeriodOptions.currentPeriod} eligiblePeriods={addPeriodOptions.periods} onCareerChange={(nextCareerId) => { setAddCareerId(nextCareerId); setAddPeriodId(''); }} onPeriodChange={setAddPeriodId} periodId={addPeriodId} periodsPending={addPeriods.isPending} /> : null}<Button disabled={!canAddRole || addMutation.isPending || (selectedRole === 'ALUMNO' && (!addCareerId || !addPeriodId))} onClick={() => addMutation.mutate()} type="button">{addMutation.isPending ? 'Agregando…' : 'Agregar rol'}</Button>{availableRoles.length === 0 ? <small>La persona ya tiene todos los roles disponibles.</small> : null}</section>
      <dialog aria-labelledby="role-action-title" className="roles-dialog" onCancel={(event) => { event.preventDefault(); closeDialog(); }} ref={dialogRef}><form onSubmit={(event) => { event.preventDefault(); if (pendingAction?.type === 'remove') removeMutation.mutate(pendingAction.role); if (pendingAction?.type === 'change') changeMutation.mutate({ fromRole: pendingAction.role, toRole: replacementRole }); }}><header><p className="eyebrow">Confirmar acción</p><h2 id="role-action-title">{pendingAction?.type === 'remove' ? 'Quitar rol' : 'Cambiar rol'}</h2><p>{pendingAction?.type === 'remove' ? `Se retirará el rol ${pendingAction.name}.` : `Se reemplazará el rol ${pendingAction?.name ?? ''} de forma atómica.`}</p></header>{pendingAction?.type === 'change' ? <><label className="select-filter"><span>Nuevo rol para reemplazar</span><select aria-label="Nuevo rol para reemplazar" className="form-select" disabled={changeMutation.isPending} onChange={(event) => { const nextRole = event.target.value as RoleCode; setReplacementRole(nextRole); if (nextRole !== 'ALUMNO') { setChangeCareerId(''); setChangePeriodId(''); } }} value={replacementRole}>{availableRoles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{needsChangeStudentFields ? <StudentFields careerId={changeCareerId} careers={careers.data} currentPeriod={changePeriodOptions.currentPeriod} eligiblePeriods={changePeriodOptions.periods} onCareerChange={(nextCareerId) => { setChangeCareerId(nextCareerId); setChangePeriodId(''); }} onPeriodChange={setChangePeriodId} periodId={changePeriodId} periodsPending={changePeriods.isPending} /> : null}</> : null}{actionError ? <div className="error-banner" role="alert">{actionError}</div> : null}<footer><Button disabled={removeMutation.isPending || changeMutation.isPending} onClick={closeDialog} type="button" variant="secondary">Cancelar</Button><Button disabled={removeMutation.isPending || changeMutation.isPending || (pendingAction?.type === 'change' && replacementRole === 'ALUMNO' && (!changeCareerId || !changePeriodId))} type="submit" variant={pendingAction?.type === 'remove' ? 'destructive' : 'primary'}>{pendingAction?.type === 'remove' ? 'Quitar rol' : 'Cambiar rol'}</Button></footer></form></dialog>
    </div>
  );
}

function StudentFields({ careerId, careers, currentPeriod, eligiblePeriods, onCareerChange, onPeriodChange, periodId, periodsPending }: { careerId: string; careers?: Awaited<ReturnType<typeof getCareers>>; currentPeriod?: Awaited<ReturnType<typeof getAcademicPeriods>>[number]; eligiblePeriods: Awaited<ReturnType<typeof getAcademicPeriods>>; onCareerChange: (careerId: string) => void; onPeriodChange: (periodId: string) => void; periodId: string; periodsPending: boolean }) {
  return <div className="person-roles-panel__student-fields"><select aria-label="Carrera para el rol alumno" className="form-select" onChange={(event) => onCareerChange(event.target.value)} value={careerId}><option value="">Carrera</option>{careers?.filter((item) => item.estado === 'activo').map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><select aria-label="Periodo de ingreso del rol alumno" className="form-select" onChange={(event) => onPeriodChange(event.target.value)} value={periodId}><option value="">Periodo de inicio</option>{eligiblePeriods.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>{careerId && !periodsPending && !currentPeriod ? <small>La carrera no tiene un periodo académico vigente.</small> : null}</div>;
}
