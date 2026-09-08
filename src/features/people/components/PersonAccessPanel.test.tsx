import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersonDetail } from '../../../api/types';
import { enablePersonAccess } from '../api/peopleApi';
import { PersonAccessPanel } from './PersonAccessPanel';

vi.mock('../api/peopleApi', () => ({
  enablePersonAccess: vi.fn(),
  resetPersonPassword: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(enablePersonAccess).mockResolvedValue({});
});

function personWithRoles(roles: PersonDetail['roles']): PersonDetail {
  return {
    id: 'person-1',
    tipoDocumento: 'dni',
    numeroDocumento: '12345678',
    nombres: 'Ana',
    apellidoPaterno: 'Rojas',
    apellidoMaterno: null,
    correo: null,
    telefono: null,
    estado: 'activo',
    tieneAcceso: false,
    fechaNacimiento: null,
    alumnoPerfil: null,
    roles,
    tutores: [],
  };
}

function renderPanel(person: PersonDetail) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PersonAccessPanel
        actorRoles={['ADMINISTRADOR_SISTEMA']}
        onFeedback={vi.fn()}
        person={person}
      />
    </QueryClientProvider>,
  );
}

describe('PersonAccessPanel', () => {
  it('reutiliza el rol activo del alumno y no muestra el selector de rol inicial', async () => {
    const user = userEvent.setup();
    renderPanel(personWithRoles([{
      codigo: 'ALUMNO',
      nombre: 'Alumno',
      estado: 'activo',
      fechaInicio: '2025-03-01',
      fechaFin: null,
    }]));

    expect(screen.getByText(/usará sus roles activos: alumno/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Rol inicial')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Habilitar acceso' }));

    await waitFor(() => expect(enablePersonAccess).toHaveBeenCalledWith('person-1'));
  });

  it('solicita y envía un rol inicial si la persona no tiene roles activos', async () => {
    const user = userEvent.setup();
    renderPanel(personWithRoles([]));

    await user.selectOptions(screen.getByLabelText('Rol inicial'), 'ALUMNO');
    await user.click(screen.getByRole('button', { name: 'Habilitar acceso' }));

    await waitFor(() => expect(enablePersonAccess).toHaveBeenCalledWith('person-1', 'ALUMNO'));
  });
});
