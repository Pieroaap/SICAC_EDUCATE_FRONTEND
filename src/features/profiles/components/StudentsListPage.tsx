import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { GraduationCap, SquarePen } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { StudentState } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/cn';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { getStudents } from '../api/profilesApi';
import { DirectoryPagination, DirectoryToolbar } from './DirectoryControls';

const PAGE_SIZE = 20;
const states: StudentState[] = [
  'activo', 'en_pausa', 'retirado', 'sin_contestar', 'graduado',
];
const stateLabels: Record<StudentState, string> = {
  activo: 'Activo',
  en_pausa: 'En pausa',
  retirado: 'Retirado',
  sin_contestar: 'Sin contestar',
  graduado: 'Graduado',
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

export function StudentsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const statusParam = searchParams.get('estado');
  const estado = states.find((state) => state === statusParam);
  const rawPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [searchDraft, setSearchDraft] = useState(search);
  const debouncedSearch = useDebouncedValue(searchDraft.trim(), 350);
  const students = useQuery({
    queryKey: ['students', { search, estado, page, pageSize: PAGE_SIZE }],
    queryFn: () => getStudents({
      search: search || undefined,
      estado,
      page,
      pageSize: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (debouncedSearch !== searchDraft.trim()) return;
    if (debouncedSearch === search) return;
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    params.delete('page');
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, search, searchDraft, searchParams, setSearchParams]);

  function updateParams(next: { search?: string; estado?: string; page?: number }) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === 'page' && value === 1)) params.set(key, String(value));
      else params.delete(key);
    }
    if (!('page' in next)) params.delete('page');
    setSearchParams(params);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateParams({ search: searchDraft.trim() });
  }

  const result = students.data;
  const hasFilters = Boolean(search || estado);
  const isSearching = searchDraft.trim() !== search || students.isFetching;

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Identidad</p>
          <h1>Alumnos</h1>
        </div>
        <Button asChild>
          <Link to="/personas/nueva?rol=ALUMNO">Crear alumno</Link>
        </Button>
      </header>

      <DirectoryToolbar
        isSearching={isSearching}
        onSearchChange={setSearchDraft}
        onSearchSubmit={submitSearch}
        onStatusChange={(value) => updateParams({ estado: value })}
        searchDraft={searchDraft}
        status={estado ?? ''}
        statusOptions={states.map((state) => ({ label: stateLabels[state], value: state }))}
      />

      {students.isError ? (
        <section className="table-state is-error">
          <p>No pudimos cargar los alumnos.</p>
          <button onClick={() => void students.refetch()} type="button">Reintentar</button>
        </section>
      ) : students.isPending || !result ? (
        <section className="table-state">Cargando alumnos…</section>
      ) : result.data.length === 0 ? (
        <section className="table-state">
          <GraduationCap size={30} />
          <h2>{hasFilters ? 'No encontramos coincidencias' : 'Aún no hay alumnos'}</h2>
          <p>{hasFilters ? 'Prueba con otros términos o limpia los filtros.' : 'Los perfiles de alumno aparecerán aquí.'}</p>
          {hasFilters ? (
            <button onClick={() => { setSearchDraft(''); setSearchParams({}); }} type="button">
              Limpiar filtros
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table profile-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Ingreso</th>
                  <th>Trayectoria</th>
                  <th>Beneficio</th>
                  <th>Acceso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.apellidos} {student.nombres}</strong>
                      <span>DNI {student.dni}</span>
                    </td>
                    <td>
                      <span className="document-value">{student.periodoIngreso}</span>
                      <small>Año {student.anioIngreso}</small>
                    </td>
                    <td>
                      <strong className="table-primary">{student.carrera ?? 'Sin matrícula'}</strong>
                      <span>{student.plan ?? 'Sin plan asignado'}</span>
                    </td>
                    <td>
                      <strong className="table-primary">{humanize(student.beneficio)}</strong>
                      <span>{humanize(student.tipoBeneficio)}</span>
                    </td>
                    <td>{student.tieneAcceso ? 'Habilitado' : 'Sin acceso'}</td>
                    <td>
                      <span className={cn('profile-state', `is-${student.estado}`)}>
                        {stateLabels[student.estado]}
                      </span>
                    </td>
                    <td className="table-actions">
                      <Button asChild className="table-action-button" variant="ghost">
                        <Link to={`/personas/${student.id}`}>
                          <SquarePen size={15} />
                          Ver ficha
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DirectoryPagination
            noun="alumnos"
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
            page={result.pagination.page}
            total={result.pagination.total}
            totalPages={result.pagination.totalPages}
          />
        </>
      )}
    </main>
  );
}
