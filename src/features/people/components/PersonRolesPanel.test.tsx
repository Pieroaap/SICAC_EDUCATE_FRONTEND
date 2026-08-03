import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersonDetail, RoleCode } from '../../../api/types';
import { getAcademicPeriods, getCareers } from '../../academic-structure/api/academicStructureApi';
import { useAuth } from '../../auth/AuthProvider';
import { assignPersonRole, changePersonRole, deactivatePersonRole } from '../api/peopleApi';
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

vi.mock('../../auth/AuthProvider', () => ({ useAuth: vi.fn() }));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ reloadProfile: vi.fn() } as never);
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
  const view = render(
    <QueryClientProvider client={client}>
      <PersonRolesPanel
        actorPersonaId={actorId}
        actorRoles={actorRoles}
        onFeedback={onFeedback}
        person={person}
      />
    </QueryClientProvider>,
  );
  return { ...view, onFeedback };
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

  it('recarga el perfil real solo cuando la mutación afecta al actor autenticado', async () => {
    const user = userEvent.setup();
    const reloadProfile = vi.fn().mockResolvedValue({});
    vi.mocked(useAuth).mockReturnValue({ reloadProfile } as never);
    vi.mocked(deactivatePersonRole).mockResolvedValue({});
    renderPanel({ actorId: 'person-1' });

    await user.click(screen.getAllByRole('button', { name: 'Quitar' })[0]!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Quitar rol' }));

    await waitFor(() => expect(reloadProfile).toHaveBeenCalledOnce());
  });

  it('envía el contexto de alumno al cambiar hacia ALUMNO', async () => {
    const user = userEvent.setup();
    vi.mocked(getCareers).mockResolvedValue([{ id: 'career-1', codigo: 'ART', nombre: 'Artes', descripcion: null, estado: 'activo' }]);
    vi.mocked(getAcademicPeriods).mockResolvedValue([{ id: 'period-1', carreraId: 'career-1', anio: 2026, periodo: 'II', nombre: '2026-II', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', estado: 'activo' }]);
    vi.mocked(changePersonRole).mockResolvedValue({});
    renderPanel();

    await user.click(screen.getAllByRole('button', { name: 'Cambiar rol' })[0]!);
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Carrera para el rol alumno'), 'career-1');
    await user.selectOptions(await within(dialog).findByLabelText('Periodo de ingreso del rol alumno'), 'period-1');
    await user.click(within(dialog).getByRole('button', { name: 'Cambiar rol' }));

    await waitFor(() => expect(changePersonRole).toHaveBeenCalledWith('person-1', {
      fromRole: 'PROFESOR',
      toRole: 'ALUMNO',
      student: { carreraId: 'career-1', periodoInicioId: 'period-1', estado: 'activo', beneficio: 'normal', tipoBeneficio: 'regular' },
    }));
  });

  it('sincroniza el selector si el rol elegido se vuelve activo tras refrescar', async () => {
    const { rerender } = renderPanel();
    expect(screen.getByLabelText('Nuevo rol')).toHaveValue('ALUMNO');

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PersonRolesPanel
          actorRoles={['ADMINISTRADOR_SISTEMA']}
          onFeedback={vi.fn()}
          person={personWithRoles([{ code: 'PROFESOR' }, { code: 'GESTOR_ACADEMICO' }, { code: 'ALUMNO' }])}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText('Nuevo rol')).toHaveValue('DIRECTOR_ACADEMICO'));
    expect(screen.getByRole('button', { name: 'Agregar rol' })).toBeEnabled();
    expect(assignPersonRole).not.toHaveBeenCalled();
  });

  it('usa claves compuestas para asignaciones del mismo rol en fechas distintas', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderPanel({ person: personWithRoles([{ code: 'PROFESOR' }, { code: 'PROFESOR' }]) });

    expect(within(screen.getByRole('list', { name: 'Roles vigentes' })).getAllByRole('listitem')).toHaveLength(2);
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining('unique "key"'));
    error.mockRestore();
  });
});
