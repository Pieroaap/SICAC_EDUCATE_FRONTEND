import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Presentation, SquarePen } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '../../../components/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { getTeachers } from '../api/profilesApi';
import { DirectoryPagination, DirectoryToolbar } from './DirectoryControls';

const PAGE_SIZE = 20;

export function TeachersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const statusParam = searchParams.get('estado');
  const estado = statusParam === 'activo' || statusParam === 'inactivo'
    ? statusParam
    : undefined;
  const rawPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [searchDraft, setSearchDraft] = useState(search);
  const debouncedSearch = useDebouncedValue(searchDraft.trim(), 350);
  const teachers = useQuery({
    queryKey: ['teachers', { search, estado, page, pageSize: PAGE_SIZE }],
    queryFn: () => getTeachers({
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

  const result = teachers.data;
  const hasFilters = Boolean(search || estado);
  const isSearching = searchDraft.trim() !== search || teachers.isFetching;

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Identidad</p>
          <h1>Profesores</h1>
        </div>
        <Button asChild>
          <Link to="/personas/nueva?rol=PROFESOR">Crear profesor</Link>
        </Button>
      </header>

      <DirectoryToolbar
        isSearching={isSearching}
        onSearchChange={setSearchDraft}
        onSearchSubmit={submitSearch}
        onStatusChange={(value) => updateParams({ estado: value })}
        searchDraft={searchDraft}
        status={estado ?? ''}
        statusOptions={[
          { label: 'Activos', value: 'activo' },
          { label: 'Inactivos', value: 'inactivo' },
        ]}
      />

      {teachers.isError ? (
        <section className="table-state is-error">
          <p>No pudimos cargar los profesores.</p>
          <button onClick={() => void teachers.refetch()} type="button">Reintentar</button>
        </section>
      ) : teachers.isPending || !result ? (
        <section className="table-state">Cargando profesores…</section>
      ) : result.data.length === 0 ? (
        <section className="table-state">
          <Presentation size={30} />
          <h2>{hasFilters ? 'No encontramos coincidencias' : 'Aún no hay profesores'}</h2>
          <p>{hasFilters ? 'Prueba con otros términos o limpia los filtros.' : 'Los perfiles docentes aparecerán aquí.'}</p>
          {hasFilters ? (
            <button onClick={() => { setSearchDraft(''); setSearchParams({}); }} type="button">
              Limpiar filtros
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table profile-table profile-table--teachers">
              <thead>
                <tr>
                  <th>Profesor</th>
                  <th>Documento</th>
                  <th>Correo</th>
                  <th>Acceso</th>
                  <th>Estado del rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <strong>
                        {teacher.apellidoPaterno} {teacher.apellidoMaterno} {teacher.nombres}
                      </strong>
                      <span>Perfil docente</span>
                    </td>
                    <td><span className="document-value">{teacher.dni}</span></td>
                    <td>{teacher.correo ?? 'Sin correo registrado'}</td>
                    <td>{teacher.tieneAcceso ? 'Habilitado' : 'Sin acceso'}</td>
                    <td><StatusBadge active={teacher.estado === 'activo'} /></td>
                    <td className="table-actions">
                      <Button asChild className="table-action-button" variant="ghost">
                        <Link to={`/personas/${teacher.id}`}>
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
            noun="profesores"
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
