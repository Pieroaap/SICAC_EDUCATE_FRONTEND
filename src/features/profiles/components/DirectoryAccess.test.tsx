import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentsListPage } from './StudentsListPage';
import { TeachersListPage } from './TeachersListPage';

const state = vi.hoisted(() => ({
  actorRole: 'ADMINISTRADOR_SISTEMA', enabled: false,
  getPersonDetail: vi.fn(), enablePersonAccess: vi.fn(),
}));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { roles: [{ codigo: state.actorRole }] } }) }));
vi.mock('../../people/api/peopleApi', () => ({ getPersonDetail: state.getPersonDetail, enablePersonAccess: state.enablePersonAccess }));
vi.mock('../api/profilesApi', () => {
  const pagination = { page: 2, pageSize: 20, total: 21, totalPages: 2 };
  return {
    getStudents: vi.fn(async () => ({ pagination, data: [{ id: 'person', apellidos: 'Rojas', nombres: 'Ana', dni: '12345678', estado: 'en_pausa', estadoPersona: 'activo', anioIngreso: 2026, periodoIngreso: '2026-III', beneficio: 'normal', tipoBeneficio: 'regular', tieneAcceso: state.enabled }] })),
    getTeachers: vi.fn(async () => ({ pagination, data: [{ id: 'person', apellidoPaterno: 'Rojas', apellidoMaterno: null, nombres: 'Ana', dni: '12345678', estado: 'activo', tieneAcceso: state.enabled }] })),
  };
});
beforeEach(() => {
  vi.clearAllMocks(); state.actorRole = 'ADMINISTRADOR_SISTEMA'; state.enabled = false;
  state.getPersonDetail.mockResolvedValue({ tieneAcceso: false, roles: [] });
  state.enablePersonAccess.mockImplementation(async () => { state.enabled = true; });
});
afterEach(cleanup);
function Location() { const location = useLocation(); return <output aria-label="Ubicación">{location.pathname}{location.search}</output>; }
function setup(teacher: boolean) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter initialEntries={[`${teacher ? '/profesores' : '/alumnos'}?search=Ana&page=2`]}>
      {teacher ? <TeachersListPage /> : <StudentsListPage />}<Location />
    </MemoryRouter>
  </QueryClientProvider>);
  return userEvent.setup();
}

describe.each([{ teacher: false, role: 'ALUMNO' }, { teacher: true, role: 'PROFESOR' }])('acceso directo $role', ({ teacher, role }) => {
  it('un clic crea acceso con el rol del directorio y conserva filtros y página', async () => {
    const user = setup(teacher);
    await user.click(await screen.findByRole('button', { name: 'Dar acceso' }));
    await waitFor(() => expect(state.enablePersonAccess).toHaveBeenCalledExactlyOnceWith('person', role));
    expect(await screen.findByText(/Acceso habilitado para/)).toBeInTheDocument();
    await screen.findByText('Habilitado');
    expect(screen.queryByRole('button', { name: 'Dar acceso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ubicación')).toHaveTextContent('?search=Ana&page=2');
    if (!teacher) expect(screen.getByText('En pausa', { selector: 'span' })).toBeInTheDocument();
  });
  it('conserva los roles activos sin asignar otro rol', async () => {
    state.getPersonDetail.mockResolvedValue({ tieneAcceso: false, roles: [{ codigo: role, estado: 'activo', fechaFin: null }] });
    const user = setup(teacher);
    await user.click(await screen.findByRole('button', { name: 'Dar acceso' }));
    await waitFor(() => expect(state.enablePersonAccess).toHaveBeenCalledExactlyOnceWith('person'));
  });
  it('no ofrece creación cuando ya tiene cuenta o el actor no es administrador', async () => {
    state.actorRole = 'GESTOR_ACADEMICO'; setup(teacher);
    await screen.findByText('Sin acceso');
    expect(screen.queryByRole('button', { name: 'Dar acceso' })).not.toBeInTheDocument();
    cleanup(); state.actorRole = 'ADMINISTRADOR_SISTEMA'; state.enabled = true; setup(teacher);
    await screen.findByText('Habilitado');
    expect(screen.queryByRole('button', { name: 'Dar acceso' })).not.toBeInTheDocument();
  });
  it('bloquea doble clic durante la petición y permite reintentar tras error', async () => {
    let rejectRequest!: (error: Error) => void;
    state.enablePersonAccess.mockImplementation(() => new Promise((_resolve, reject) => { rejectRequest = reject; }));
    const user = setup(teacher);
    await user.click(await screen.findByRole('button', { name: 'Dar acceso' }));
    expect(await screen.findByRole('button', { name: 'Habilitando…' })).toBeDisabled();
    await waitFor(() => expect(state.enablePersonAccess).toHaveBeenCalledTimes(1));
    rejectRequest(new Error('network'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos habilitar');
    expect(screen.getByRole('button', { name: 'Dar acceso' })).toBeEnabled();
  });
  it('revalida la cuenta antes de crear si otra sesión ya dio acceso', async () => {
    state.getPersonDetail.mockImplementation(async () => { state.enabled = true; return { tieneAcceso: true, roles: [] }; });
    const user = setup(teacher);
    await user.click(await screen.findByRole('button', { name: 'Dar acceso' }));
    await screen.findByText(/ya tiene acceso al sistema/);
    expect(state.enablePersonAccess).not.toHaveBeenCalled();
  });
});
