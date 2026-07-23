import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledCourse } from '../../../api/types';

const mocks = vi.hoisted(() => ({
  getAcademicPeriods: vi.fn(),
  getCareers: vi.fn(),
  getCourses: vi.fn(),
  getCurriculumPlans: vi.fn(),
  getPlanCourses: vi.fn(),
  getScheduledCourses: vi.fn(),
  getTeachers: vi.fn(),
  createScheduledCourse: vi.fn(),
  updateScheduledCourse: vi.fn(),
}));

vi.mock('../../academic-structure/api/academicStructureApi', () => ({
  getAcademicPeriods: mocks.getAcademicPeriods,
  getCareers: mocks.getCareers,
  getCourses: mocks.getCourses,
  getCurriculumPlans: mocks.getCurriculumPlans,
  getPlanCourses: mocks.getPlanCourses,
}));

vi.mock('../../profiles/api/profilesApi', () => ({
  getStudents: vi.fn(),
  getTeachers: mocks.getTeachers,
}));

vi.mock('../api/academicOperationApi', () => ({
  createBulkEnrollments: vi.fn(),
  createEnrollment: vi.fn(),
  createScheduledCourse: mocks.createScheduledCourse,
  enrollCourse: vi.fn(),
  enrollCourseCandidates: vi.fn(),
  getAuthorizations: vi.fn(),
  getBulkEnrollmentCandidates: vi.fn(),
  getEnrollmentCourses: vi.fn(),
  getEnrollments: vi.fn(),
  getScheduledCourseCandidates: vi.fn(),
  getScheduledCourses: mocks.getScheduledCourses,
  requestAuthorization: vi.fn(),
  resolveAuthorization: vi.fn(),
  updateScheduledCourse: mocks.updateScheduledCourse,
  withdrawCourseStudent: vi.fn(),
}));

import { getAllActiveTeachers } from '../loadAllActiveTeachers';
import { ScheduledCoursesView } from './AcademicOperationPage';

afterEach(cleanup);

const ids = {
  career: '00000000-0000-4000-8000-000000000001',
  plan: '00000000-0000-4000-8000-000000000002',
  course: '00000000-0000-4000-8000-000000000003',
  planCourse: '00000000-0000-4000-8000-000000000004',
  period: '00000000-0000-4000-8000-000000000005',
  teacher: '00000000-0000-4000-8000-000000000006',
  activeTeacher: '00000000-0000-4000-8000-000000000009',
};

function scheduledCourse(id: string, seccion: string, name: string): ScheduledCourse {
  return {
    id,
    seccion,
    estado: 'activo',
    planCursoId: ids.planCourse,
    cursoId: ids.course,
    cursoCodigo: 'CUR-101',
    cursoNombre: name,
    ciclo: 1,
    planCurricularId: ids.plan,
    planNombre: 'Plan histórico',
    carreraId: ids.career,
    carreraNombre: 'Artes Escénicas',
    periodoAcademicoId: ids.period,
    periodoNombre: '2025-I',
    profesorPersonaId: ids.teacher,
    profesorNombres: 'Elena',
    profesorApellidoPaterno: 'Ramos',
    profesorApellidoMaterno: null,
    cupoMaximo: 20,
    horarios: [{
      id: `${id.slice(0, -1)}8`,
      dia: 'lunes',
      horaInicio: '18:00:00',
      horaFin: '20:00:00',
      modalidad: 'presencial',
      ubicacion: 'Aula 4',
    }],
  };
}

const firstCourse = scheduledCourse('00000000-0000-4000-8000-000000000011', 'A', 'Actuación I');
const secondCourse = scheduledCourse('00000000-0000-4000-8000-000000000012', 'B', 'Actuación II');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCareers.mockResolvedValue([{ id: ids.career, codigo: 'AE', nombre: 'Artes Escénicas', descripcion: null, estado: 'activo' }]);
  mocks.getCurriculumPlans.mockResolvedValue([{ id: ids.plan, carreraId: ids.career, codigo: 'PAE', nombre: 'Plan actual', version: '1', estado: 'activo' }]);
  mocks.getCourses.mockResolvedValue([{ id: ids.course, codigo: 'CUR-101', nombre: 'Actuación I', tipo: 'obligatorio', estado: 'activo' }]);
  mocks.getPlanCourses.mockResolvedValue([{ id: ids.planCourse, planCurricularId: ids.plan, cursoId: ids.course, ciclo: 1, orden: 1, estado: 'activo', prerequisiteIds: [] }]);
  mocks.getAcademicPeriods.mockResolvedValue([{ id: ids.period, carreraId: ids.career, anio: 2025, periodo: 'I', nombre: '2025-I', fechaInicio: '2025-03-01', fechaFin: '2025-07-01', estado: 'activo' }]);
  mocks.getTeachers.mockResolvedValue({
    data: [{ id: ids.activeTeacher, nombres: 'María', apellidoPaterno: 'López', apellidoMaterno: null, dni: '12345678', correo: null, estado: 'activo', tieneAcceso: true }],
    pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  });
  mocks.getScheduledCourses.mockResolvedValue([firstCourse, secondCourse]);
});

function renderView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ScheduledCoursesView />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ScheduledCoursesView', () => {
  it('bloquea todos los disparadores y conserva el borrador mientras la escritura está pendiente', async () => {
    let resolveUpdate!: (value: ScheduledCourse) => void;
    mocks.updateScheduledCourse.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
    const user = userEvent.setup();
    renderView();

    const editButtons = await screen.findAllByRole('button', { name: 'Editar' });
    await user.click(editButtons[0]!);

    expect(editButtons[0]).toHaveAttribute('aria-controls', 'scheduled-course-form');
    expect(editButtons[0]).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByLabelText('Profesor')).toHaveFocus());
    await user.clear(screen.getByLabelText('Sección'));
    await user.type(screen.getByLabelText('Sección'), 'C');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Programar curso' })).toBeDisabled();
      screen.getAllByRole('button', { name: 'Editar' }).forEach((button) => expect(button).toBeDisabled());
      expect(screen.getByLabelText('Sección')).toBeDisabled();
    });
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[1]!);
    expect(screen.getByText(/Actuación I · Sección A/)).toBeInTheDocument();
    expect(screen.getByLabelText('Sección')).toHaveValue('C');

    resolveUpdate(firstCourse);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument());
  });

  it('carga todas las páginas de profesores activos', async () => {
    mocks.getTeachers.mockImplementation(async ({ page }: { page: number }) => ({
      data: [{ id: `teacher-${page}` }],
      pagination: { page, pageSize: 100, total: 3, totalPages: 3 },
    }));

    await expect(getAllActiveTeachers()).resolves.toEqual([
      { id: 'teacher-1' }, { id: 'teacher-2' }, { id: 'teacher-3' },
    ]);
    expect(mocks.getTeachers).toHaveBeenNthCalledWith(1, { page: 1, pageSize: 100, estado: 'activo' });
    expect(mocks.getTeachers).toHaveBeenCalledWith({ page: 2, pageSize: 100, estado: 'activo' });
    expect(mocks.getTeachers).toHaveBeenCalledWith({ page: 3, pageSize: 100, estado: 'activo' });
  });
});
