import { ChevronLeft, ChevronRight, LoaderCircle, Search } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

type StatusOption = {
  label: string;
  value: string;
};

export function DirectoryToolbar({
  searchDraft,
  status,
  statusOptions,
  onSearchChange,
  onSearchSubmit,
  onStatusChange,
  isSearching = false,
  extraFilters,
}: {
  searchDraft: string;
  status: string;
  statusOptions: StatusOption[];
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent) => void;
  onStatusChange: (value: string) => void;
  isSearching?: boolean;
  extraFilters?: ReactNode;
}) {
  return (
    <section className="list-toolbar" aria-label="Filtros">
      <form className="search-box" onSubmit={onSearchSubmit}>
        {isSearching
          ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          : <Search aria-hidden="true" size={18} />}
        <Input
          aria-label="Buscar"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="DNI, nombre, apellido o correo"
          value={searchDraft}
        />
        {isSearching ? <span className="search-box__status">Buscando</span> : null}
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>
      <label className="select-filter">
        <span>Estado</span>
        <select onChange={(event) => onStatusChange(event.target.value)} value={status}>
          <option value="">Todos</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      {extraFilters}
    </section>
  );
}

export function DirectoryPagination({
  noun,
  page,
  total,
  totalPages,
  onPageChange,
}: {
  noun: string;
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <footer className="pagination">
      <p>
        {total.toLocaleString('es-PE')} {noun} · Página {page} de {Math.max(totalPages, 1)}
      </p>
      <div>
        <Button
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          variant="secondary"
        >
          <ChevronLeft size={17} />
        </Button>
        <Button
          aria-label="Página siguiente"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          variant="secondary"
        >
          <ChevronRight size={17} />
        </Button>
      </div>
    </footer>
  );
}
