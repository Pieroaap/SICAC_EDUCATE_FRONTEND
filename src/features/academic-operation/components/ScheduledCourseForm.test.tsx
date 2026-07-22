import { zodResolver } from '@hookform/resolvers/zod';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledCourse } from '../../../api/types';
import {
  scheduledCourseSchema,
  type ScheduledCourseInput,
  type ScheduledCourseValues,
} from '../academicOperationForms';
import { ScheduledCourseForm } from './ScheduledCourseForm';

afterEach(cleanup);

const careerId = '00000000-0000-4000-8000-000000000001';
const planId = '00000000-0000-4000-8000-000000000002';
const courseId = '00000000-0000-4000-8000-000000000003';
const planCourseId = '00000000-0000-4000-8000-000000000004';
const periodId = '00000000-0000-4000-8000-000000000005';
const teacherId = '00000000-0000-4000-8000-000000000006';

const defaultValues: ScheduledCourseValues = {
  carreraId: careerId,
  planCurricularId: planId,
  planCursoId: planCourseId,
  periodoAcademicoId: periodId,
  profesorPersonaId: teacherId,
  seccion: 'A',
  estado: 'activo',
  cupoMaximo: 20,
  horarios: [{
    dia: 'lunes',
    horaInicio: '18:00',
    horaFin: '20:00',
    modalidad: 'presencial',
    ubicacion: 'Aula 4',
  }],
};

const historicalCourse: ScheduledCourse = {
  id: '00000000-0000-4000-8000-000000000007',
  seccion: 'A',
  estado: 'activo',
  planCursoId: planCourseId,
  cursoId: courseId,
  cursoCodigo: 'CUR-101',
  cursoNombre: 'Actuación I',
  ciclo: 1,
  planCurricularId: planId,
  planNombre: 'Plan histórico',
  carreraId: careerId,
  carreraNombre: 'Artes Escénicas',
  periodoAcademicoId: periodId,
  periodoNombre: '2025-I',
  profesorPersonaId: teacherId,
  profesorNombres: 'Elena',
  profesorApellidoPaterno: 'Ramos',
  profesorApellidoMaterno: null,
  cupoMaximo: 20,
  horarios: [],
};

const catalogs = {
  careers: [{ id: careerId, codigo: 'AE', nombre: 'Artes Escénicas', descripcion: null, estado: 'activo' as const }],
  plans: [{ id: planId, carreraId: careerId, codigo: 'PAE', nombre: 'Plan actual', version: '1', estado: 'activo' as const }],
  courses: [{ id: courseId, codigo: 'CUR-101', nombre: 'Actuación I', tipo: 'obligatorio' as const, estado: 'activo' as const }],
  planCourses: [{ id: planCourseId, planCurricularId: planId, cursoId: courseId, ciclo: 1, orden: 1, estado: 'activo' as const, prerequisiteIds: [] }],
  periods: [{ id: periodId, carreraId: careerId, anio: 2025, periodo: 'I' as const, nombre: '2025-I', fechaInicio: '2025-03-01', fechaFin: '2025-07-01', estado: 'activo' as const }],
  teachers: [{ id: teacherId, nombres: 'Elena', apellidoPaterno: 'Ramos', apellidoMaterno: null, dni: '12345678', correo: null, estado: 'activo' as const, tieneAcceso: true }],
};

type HarnessProps = {
  mode?: 'create' | 'edit';
  values?: ScheduledCourseValues;
  course?: ScheduledCourse | null;
  catalogState?: { loading: boolean; error: boolean; onRetry: () => void };
  emptyCatalogs?: boolean;
  error?: unknown;
  onSubmit?: (values: ScheduledCourseValues) => void;
};

function Harness({
  mode = 'create',
  values = defaultValues,
  course = null,
  catalogState = { loading: false, error: false, onRetry: vi.fn() },
  emptyCatalogs = false,
  error = null,
  onSubmit = vi.fn(),
}: HarnessProps) {
  const form = useForm<ScheduledCourseInput, unknown, ScheduledCourseValues>({
    resolver: zodResolver(scheduledCourseSchema),
    defaultValues: values,
  });
  const data = emptyCatalogs ? {
    careers: [], plans: [], courses: [], planCourses: [], periods: [], teachers: [],
  } : catalogs;

  return (
    <ScheduledCourseForm
      {...data}
      catalogState={catalogState}
      course={course}
      error={error}
      form={form}
      mode={mode}
      onCancel={vi.fn()}
      onSubmit={onSubmit}
      pending={false}
    />
  );
}

describe('ScheduledCourseForm', () => {
  it('asocia y anuncia los errores anidados de cada horario', async () => {
    const user = userEvent.setup();
    render(<Harness values={{
      ...defaultValues,
      horarios: [{
        ...defaultValues.horarios[0]!,
        horaInicio: '20:00',
        horaFin: '18:00',
        ubicacion: '',
      }],
    }} />);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const endInput = await screen.findByLabelText('Fin 1');
    const locationInput = screen.getByLabelText('Ubicación 1');
    expect(endInput).toHaveAttribute('aria-invalid', 'true');
    expect(locationInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('La hora de fin debe ser posterior al inicio')).toHaveAttribute('role', 'alert');
    expect(screen.getByText('Indica aula o enlace')).toHaveAttribute('role', 'alert');
    expect(endInput).toHaveAccessibleDescription('La hora de fin debe ser posterior al inicio');
    expect(locationInput).toHaveAccessibleDescription('Indica aula o enlace');
  });

  it('conserva y anuncia el error de colección de horarios', async () => {
    const user = userEvent.setup();
    render(<Harness values={{ ...defaultValues, horarios: [] }} />);

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const collectionError = await screen.findByText('Agrega al menos un horario');
    expect(collectionError).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('group', { name: 'Horarios' })).toHaveAccessibleDescription(
      'Agrega al menos un horario',
    );
  });

  it('distingue carga, bloquea el guardado y no la presenta como catálogo vacío', () => {
    render(<Harness catalogState={{ loading: true, error: false, onRetry: vi.fn() }} emptyCatalogs />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogos');
    expect(screen.queryByText('No hay carreras activas disponibles.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('presenta un error recuperable de catálogos con reintento', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<Harness catalogState={{ loading: false, error: true, onRetry }} emptyCatalogs />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los catálogos');
    expect(screen.queryByText('No hay carreras activas disponibles.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('explica los catálogos vacíos y bloquea la creación', () => {
    render(<Harness emptyCatalogs />);

    expect(screen.getByText('No hay carreras activas disponibles.')).toBeInTheDocument();
    expect(screen.getByText('No hay profesores activos disponibles.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('conserva visibles las opciones históricas aunque no estén en catálogos activos', () => {
    render(<Harness course={historicalCourse} emptyCatalogs mode="edit" />);

    expect(screen.getByLabelText('Carrera')).toHaveValue(careerId);
    expect(screen.getByLabelText('Curso')).toHaveValue(planCourseId);
    expect(screen.getByLabelText('Periodo')).toHaveValue(periodId);
    expect(screen.getByLabelText('Profesor')).toHaveValue(teacherId);
    expect(within(screen.getByLabelText('Profesor')).getByRole('option', { name: 'Ramos, Elena' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  it('anuncia los errores de guardado de la API', () => {
    render(<Harness error={new Error('fallo')} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo guardar el curso programado.',
    );
  });

  it('conserva cupo null al enviar una edición válida', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <Harness
        course={{ ...historicalCourse, cupoMaximo: null }}
        mode="edit"
        onSubmit={onSubmit}
        values={{ ...defaultValues, cupoMaximo: null }}
      />,
    );

    expect(screen.getByLabelText('Cupo máximo')).toHaveValue(null);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ cupoMaximo: null });
    expect(screen.queryByText(/cupo máximo debe/i)).not.toBeInTheDocument();
  });
});
