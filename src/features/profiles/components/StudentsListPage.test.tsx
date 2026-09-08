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
      estado: 'en_pausa',
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
  it('muestra solo el estado académico en la insignia y conserva el filtro institucional', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('En pausa', { selector: 'span' })).toHaveClass('profile-state', 'is-en_pausa');
    expect(screen.queryByText('Registro inactivo')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Estado del alumno' })).toBeInTheDocument();

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
