import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, LoaderCircle, Search, SquarePen, UsersRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import type { RoleCode } from '../../../api/types';
import { StatusBadge } from '../../../components/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { getPeople } from '../api/peopleApi';

const PAGE_SIZE = 20;
const roleOptions: Array<{ label: string; value: RoleCode }> = [
  { label: 'Alumno', value: 'ALUMNO' },
  { label: 'Profesor', value: 'PROFESOR' },
  { label: 'Gestor académico', value: 'GESTOR_ACADEMICO' },
  { label: 'Director académico', value: 'DIRECTOR_ACADEMICO' },
  { label: 'Administrador', value: 'ADMINISTRADOR_SISTEMA' },
];

export function PeopleListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const search = searchParams.get('search') ?? '';
  const estadoParam = searchParams.get('estado');
  const estado = estadoParam === 'activo' || estadoParam === 'inactivo' ? estadoParam : undefined;
  const roleParam = searchParams.get('rol');
  const rol = roleOptions.find((option) => option.value === roleParam)?.value;
  const rawPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [searchDraft, setSearchDraft] = useState(search);
  const debouncedSearch = useDebouncedValue(searchDraft.trim(), 350);

  const people = useQuery({
    queryKey: ['people', { search, estado, rol, page, pageSize: PAGE_SIZE }],
    queryFn: () => getPeople({
      search: search || undefined,
      estado,
      rol,
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

  function updateParams(next: { search?: string; estado?: string; rol?: string; page?: number }) {
    const params = new URLSearchParams(searchParams);
    if ('search' in next) {
      if (next.search) params.set('search', next.search);
      else params.delete('search');
    }
    if ('estado' in next) {
      if (next.estado) params.set('estado', next.estado);
      else params.delete('estado');
    }
    if ('rol' in next) {
      if (next.rol) params.set('rol', next.rol);
      else params.delete('rol');
    }
    if ('page' in next) {
      if (next.page && next.page > 1) params.set('page', String(next.page));
      else params.delete('page');
    } else {
      params.delete('page');
    }
    setSearchParams(params);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateParams({ search: searchDraft.trim() });
  }

  const result = people.data;
  const hasFilters = Boolean(search || estado || rol);
  const isSearching = searchDraft.trim() !== search || people.isFetching;

  return (
    <main className="page-shell people-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Identidad</p>
          <h1>Personas</h1>
          <p>Identidades, roles y accesos del sistema en un solo lugar.</p>
        </div>
        <Button asChild><Link to="/personas/nueva">Nueva persona</Link></Button>
      </header>

      {typeof location.state === 'object'
        && location.state
        && 'created' in location.state ? (
          <div className="success-banner list-success" role="status">
            La persona fue creada correctamente.
          </div>
        ) : null}

      <section className="list-toolbar" aria-label="Filtros">
        <form className="search-box" onSubmit={submitSearch}>
          {isSearching
            ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
            : <Search aria-hidden="true" size={18} />}
          <Input
            aria-label="Buscar personas"
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="DNI, nombre, apellido o correo"
            value={searchDraft}
          />
          {isSearching ? <span className="search-box__status">Buscando</span> : null}
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <label className="select-filter">
          <span>Estado</span>
          <select
            onChange={(event) => updateParams({ estado: event.target.value })}
            value={estado ?? ''}
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </label>
        <label className="select-filter">
          <span>Rol</span>
          <select
            onChange={(event) => updateParams({ rol: event.target.value })}
            value={rol ?? ''}
          >
            <option value="">Todos</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      {people.isError ? (
        <section className="table-state is-error">
          <p>No pudimos cargar las personas.</p>
          <button onClick={() => void people.refetch()} type="button">Reintentar</button>
        </section>
      ) : people.isPending || !result ? (
        <section className="table-state">Cargando personas…</section>
      ) : result.data.length === 0 ? (
        <section className="table-state">
          <UsersRound size={30} />
          <h2>{hasFilters ? 'No encontramos coincidencias' : 'Aún no hay personas'}</h2>
          <p>{hasFilters ? 'Prueba con otros términos o limpia los filtros.' : 'Los registros aparecerán aquí.'}</p>
          {hasFilters ? (
            <button
              onClick={() => {
                setSearchDraft('');
                setSearchParams({});
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          ) : null}
        </section>
      ) : (
        <>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Documento</th>
                  <th>Roles</th>
                  <th>Acceso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <strong>
                        {person.apellidoPaterno} {person.apellidoMaterno} {person.nombres}
                      </strong>
                      <span>{person.correo ?? 'Sin correo registrado'}</span>
                    </td>
                    <td>
                      <span className="document-value">{person.numeroDocumento}</span>
                      <small>{person.tipoDocumento.replaceAll('_', ' ')}</small>
                    </td>
                    <td>
                      <div className="role-list">
                        {person.roles.length > 0
                          ? person.roles.map((role) => <span key={role.codigo}>{role.nombre}</span>)
                          : <em>Sin rol asignado</em>}
                      </div>
                    </td>
                    <td>{person.tieneAcceso ? 'Habilitado' : 'Sin acceso'}</td>
                    <td><StatusBadge active={person.estado === 'activo'} /></td>
                    <td className="table-actions">
                      <Button asChild className="table-action-button" variant="ghost">
                        <Link to={`/personas/${person.id}`}>
                          <SquarePen size={15} />
                          Editar
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="pagination">
            <p>
              {result.pagination.total.toLocaleString('es-PE')} personas · Página{' '}
              {result.pagination.page} de {Math.max(result.pagination.totalPages, 1)}
            </p>
            <div>
              <Button
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
                variant="secondary"
              >
                <ChevronLeft size={17} />
              </Button>
              <Button
                aria-label="Página siguiente"
                disabled={page >= result.pagination.totalPages}
                onClick={() => updateParams({ page: page + 1 })}
                variant="secondary"
              >
                <ChevronRight size={17} />
              </Button>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
