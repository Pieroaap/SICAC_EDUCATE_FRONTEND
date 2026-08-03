import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersonDetail, RoleCode } from '../../../api/types';
import { changePersonRole, deactivatePersonRole } from '../api/peopleApi';
import { PersonRolesPanel } from './PersonRolesPanel';

vi.mock('../../academic-structure/api/academicStructureApi', () => ({
  getAcademicPeriods: vi.fn(),
  getCareers: vi.fn(),
}));

vi.mock('../api/peopleApi', () => ({
  assignPersonRole: vi.fn(),
  changePersonRole: vi.fn(),
  deactivatePersonRole: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() { this.setAttribute('open', ''); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() { this.removeAttribute('open'); },
  });
});

function personWithRoles(
  roles: Array<{ code: RoleCode; state?: 'activo' | 'inactivo'; endDate?: string | null }>,
): PersonDetail {
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
    tieneAcceso: true,
    fechaNacimiento: null,
    alumnoPerfil: null,
    roles: roles.map(({ code, state = 'activo', endDate = null }, index) => ({
      codigo: code,
      nombre: code === 'ADMINISTRADOR_SISTEMA' ? 'Administrador del sistema' : 'Profesor',
      estado: state,
      fechaInicio: `2026-0${index + 1}-01`,
      fechaFin: endDate,
    })),
    tutores: [],
  };
}

function renderPanel({
  actorId,
  actorRoles = ['ADMINISTRADOR_SISTEMA'],
  person = personWithRoles([{ code: 'PROFESOR' }, { code: 'GESTOR_ACADEMICO' }]),
}: {
  actorId?: string;
  actorRoles?: RoleCode[];
  person?: PersonDetail;
} = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onFeedback = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <PersonRolesPanel
        actorPersonaId={actorId}
        actorRoles={actorRoles}
        onFeedback={onFeedback}
        person={person}
      />
    </QueryClientProvider>,
  );
  return { onFeedback };
}

describe('PersonRolesPanel', () => {
  it('muestra controles administrativos solo a Administrador del sistema', () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonRolesPanel
          actorRoles={['DIRECTOR_ACADEMICO']}
          onFeedback={vi.fn()}
          person={personWithRoles([{ code: 'PROFESOR' }])}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('heading', { name: 'Administrar roles' })).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PersonRolesPanel
          actorRoles={['ADMINISTRADOR_SISTEMA']}
          onFeedback={vi.fn()}
          person={personWithRoles([{ code: 'PROFESOR' }])}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Administrar roles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();
  });

  it('muestra solo asignaciones vigentes y bloquea quitar el único rol', () => {
    renderPanel({ person: personWithRoles([
      { code: 'PROFESOR' },
      { code: 'PROFESOR', state: 'inactivo', endDate: '2025-12-31' },
    ]) });

    const currentRoles = screen.getByRole('list', { name: 'Roles vigentes' });
    expect(within(currentRoles).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeDisabled();
    expect(screen.getByText('No se puede quitar el único rol activo de la persona.')).toBeInTheDocument();
  });

  it('bloquea el retiro y el cambio desde el propio rol administrativo', () => {
    renderPanel({
      actorId: 'person-1',
      person: personWithRoles([{ code: 'ADMINISTRADOR_SISTEMA' }, { code: 'PROFESOR' }]),
    });

    const administrator = screen.getByText('Administrador del sistema').closest('li')!;
    expect(within(administrator).getByRole('button', { name: 'Quitar' })).toBeDisabled();
    expect(within(administrator).getByRole('button', { name: 'Cambiar rol' })).toBeDisabled();
    expect(screen.getByText('No puedes retirarte ni cambiar tu propio rol administrativo.')).toBeInTheDocument();
  });

  it('confirma el retiro y llama al PATCH del rol activo', async () => {
    const user = userEvent.setup();
    vi.mocked(deactivatePersonRole).mockResolvedValue({});
    renderPanel();

    await user.click(screen.getAllByRole('button', { name: 'Quitar' })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Quitar rol' }));

    await waitFor(() => {
      expect(deactivatePersonRole).toHaveBeenCalledWith('person-1', 'PROFESOR');
    });
  });

  it('cambia el rol mediante el POST atómico', async () => {
    const user = userEvent.setup();
    vi.mocked(changePersonRole).mockResolvedValue({});
    renderPanel();

    await user.click(screen.getAllByRole('button', { name: 'Cambiar rol' })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Nuevo rol para reemplazar'), 'DIRECTOR_ACADEMICO');
    await user.click(within(dialog).getByRole('button', { name: 'Cambiar rol' }));

    await waitFor(() => {
      expect(changePersonRole).toHaveBeenCalledWith('person-1', {
        fromRole: 'PROFESOR',
        toRole: 'DIRECTOR_ACADEMICO',
      });
    });
  });

  it('muestra el mensaje específico devuelto por el backend', async () => {
    const user = userEvent.setup();
    vi.mocked(deactivatePersonRole).mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'El rol mantiene responsabilidades activas.' } },
    });
    renderPanel();

    await user.click(screen.getAllByRole('button', { name: 'Quitar' })[0]!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar rol' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El rol mantiene responsabilidades activas.');
  });
});
