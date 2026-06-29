import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Search, UserPlus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { PersonDetail, RoleCode } from '../../../api/types';
import { getApiErrorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { assignStudentGuardian, getPeople } from '../api/peopleApi';
import { canAssignGuardian } from '../personActions';

type Props = {
  actorRoles: RoleCode[];
  onFeedback: (feedback: { type: 'success' | 'error'; message: string }) => void;
  person: PersonDetail;
};

function formatGuardianName(guardian: PersonDetail['tutores'][number]) {
  return [
    guardian.tutorApellidoPaterno,
    guardian.tutorApellidoMaterno,
    guardian.tutorNombres,
  ].filter(Boolean).join(' ');
}

function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function PersonGuardiansPanel({ actorRoles, onFeedback, person }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [startDate, setStartDate] = useState(today);
  const canAssign = canAssignGuardian(actorRoles);
  const activeGuardians = person.tutores.filter((guardian) => guardian.estado === 'activo');
  const canAddMore = activeGuardians.length < 2;
  const normalizedSearch = search.trim();

  const guardianSearch = useQuery({
    queryKey: ['guardian-search', normalizedSearch],
    queryFn: () => getPeople({
      search: normalizedSearch,
      estado: 'activo',
      page: 1,
      pageSize: 8,
    }),
    enabled: canAssign && canAddMore && normalizedSearch.length >= 2,
    placeholderData: keepPreviousData,
  });

  const candidates = useMemo(() => (
    guardianSearch.data?.data.filter((candidate) => candidate.id !== person.id) ?? []
  ), [guardianSearch.data?.data, person.id]);

  const assignMutation = useMutation({
    mutationFn: () => assignStudentGuardian(person.id, {
      guardianId,
      relationship: relationship.trim(),
      startDate,
    }),
    onSuccess: async () => {
      setGuardianId('');
      setRelationship('');
      setSearch('');
      onFeedback({ type: 'success', message: 'Tutor asignado correctamente.' });
      await queryClient.invalidateQueries({ queryKey: ['person', person.id] });
    },
    onError: (error) => {
      onFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos asignar el tutor.') });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!guardianId || !relationship.trim()) {
      onFeedback({ type: 'error', message: 'Selecciona un tutor e indica el parentesco.' });
      return;
    }
    assignMutation.mutate();
  }

  return (
    <div className="detail-panel guardian-panel">
      <h3>Tutores vinculados</h3>
      {person.tutores.length === 0 ? (
        <p>No hay tutores relacionados para esta persona.</p>
      ) : (
        <ul className="detail-list">
          {person.tutores.map((guardian) => (
            <li key={guardian.id}>
              <div>
                <strong>{formatGuardianName(guardian)}</strong>
                <span>{guardian.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
              </div>
              <small>
                {guardian.tipoRelacion} · DNI {guardian.tutorDocumento} · Desde {guardian.fechaInicio}
                {guardian.fechaFin ? ` · Hasta ${guardian.fechaFin}` : ''}
              </small>
            </li>
          ))}
        </ul>
      )}

      {canAssign && canAddMore ? (
        <form className="guardian-form" onSubmit={submit}>
          <label>
            <span>Buscar tutor</span>
            <div className="guardian-search">
              <Search aria-hidden="true" size={16} />
              <Input
                onChange={(event) => {
                  setSearch(event.target.value);
                  setGuardianId('');
                }}
                placeholder="DNI, nombre o correo"
                value={search}
              />
            </div>
          </label>

          {normalizedSearch.length >= 2 ? (
            <div className="guardian-results" role="listbox">
              {guardianSearch.isPending ? (
                <p>Buscando posibles tutores…</p>
              ) : candidates.length === 0 ? (
                <p>No encontramos personas activas con ese criterio.</p>
              ) : candidates.map((candidate) => (
                <button
                  className={candidate.id === guardianId ? 'is-selected' : ''}
                  key={candidate.id}
                  onClick={() => setGuardianId(candidate.id)}
                  type="button"
                >
                  <strong>
                    {candidate.apellidoPaterno} {candidate.apellidoMaterno} {candidate.nombres}
                  </strong>
                  <span>DNI {candidate.numeroDocumento}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="guardian-form__row">
            <label>
              <span>Parentesco</span>
              <Input
                onChange={(event) => setRelationship(event.target.value)}
                placeholder="Madre, padre, apoderado…"
                value={relationship}
              />
            </label>
            <label>
              <span>Inicio</span>
              <Input
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </label>
          </div>

          <Button disabled={assignMutation.isPending || !guardianId} type="submit" variant="secondary">
            {assignMutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <UserPlus size={17} />}
            Asignar tutor
          </Button>
        </form>
      ) : (
        <small>
          {!canAssign
            ? 'No tienes permisos para asignar tutores.'
            : 'El alumno ya tiene el máximo de dos tutores activos.'}
        </small>
      )}
    </div>
  );
}
