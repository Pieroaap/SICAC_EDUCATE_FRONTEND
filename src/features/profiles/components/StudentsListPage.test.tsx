import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getStudents: vi.fn(),
}));

vi.mock('../api/profilesApi', () => ({
  getStudents: mocks.getStudents,
}));

import { StudentsListPage } from './StudentsListPage';

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getStudents.mockResolvedValue({
    data: [{
      id: '00000000-0000-4000-8000-000000000001',
      apellidos: 'Prueba Alumno',
      nombres: 'Caso',
      telefono: null,
      dni: '12345678',
      estado: 'activo',
      estadoPersona: 'inactivo',
      anioIngreso: 2026,
      periodoIngreso: '2026-I',
      beneficio: 'normal',
      tipoBeneficio: 'regular',
      tieneAcceso: false,
      carrera: null,
      plan: null,
    }],
    pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
  });
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={['/alumnos']}>
      <QueryClientProvider client={queryClient}>
        <StudentsListPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StudentsListPage', () => {
  it('distingue el registro institucional del estado operativo y permite filtrarlo', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Registro inactivo')).toBeInTheDocument();
    expect(screen.getByText('Alumno activo')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estados' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Estado del registro'), 'inactivo');

    await waitFor(() => expect(mocks.getStudents).toHaveBeenLastCalledWith({
      search: undefined,
      estado: undefined,
      estadoPersona: 'inactivo',
      page: 1,
      pageSize: 20,
    }));
  });
});
