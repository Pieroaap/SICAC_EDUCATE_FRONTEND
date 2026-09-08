import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecognitionDialog } from './RecognitionDialog';
import { getRecognitionCourses, prerequisiteChain, recognizeCourses, type RecognitionCourse } from '../api/recognitionApi';

vi.mock('../api/recognitionApi', async (original) => ({ ...await original<typeof import('../api/recognitionApi')>(), getRecognitionCourses: vi.fn(), recognizeCourses: vi.fn() }));
const courses: RecognitionCourse[] = [1, 2, 3, 4].map((n) => ({ id: `act${n}`, planCurricularId: 'plan', planNombre: 'Actuación', cursoNombre: `Actuación ${n}`, cursoCodigo: `ACT${n}`, ciclo: n, estado: 'sin_aprobacion', prerrequisitoIds: n > 1 ? [`act${n - 1}`] : [] }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRecognitionCourses).mockResolvedValue(courses);
  vi.mocked(recognizeCourses).mockResolvedValue({ data: [] });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
});
afterEach(cleanup);
function setup(targetCourseId?: string) {
  const onSaved = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <RecognitionDialog personId="student" onClose={vi.fn()} onSaved={onSaved} {...(targetCourseId ? { targetCourseId } : {})} />
  </QueryClientProvider>);
  return { user: userEvent.setup(), onSaved };
}
describe('reconocimiento desde malla', () => {
  it('selecciona 1, 2 y 4 sin marcar 3 ni enviar nota', async () => {
    const { user, onSaved } = setup();
    for (const n of [1, 2, 4]) await user.click(await screen.findByRole('checkbox', { name: 'Actuación ' + n }));
    expect(screen.getByRole('checkbox', { name: /^Actuación 3$/ })).not.toBeChecked();
    await user.type(screen.getByLabelText('Periodo referencial'), 'Anterior a 2026-III');
    await user.type(screen.getByLabelText('Motivo del reconocimiento'), 'Regularización confirmada');
    await user.click(screen.getByRole('checkbox', { name: /Confirmo/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar reconocimientos' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(recognizeCourses).toHaveBeenCalledWith({ personaId: 'student', planCursoIds: ['act1', 'act2', 'act4'], periodoReferencial: 'Anterior a 2026-III', observacion: 'Regularización confirmada' });
  });
  it('muestra la cadena y deshabilita cursos ya aprobados', async () => {
    vi.mocked(getRecognitionCourses).mockResolvedValue(courses.map((course) => course.id === 'act1' ? { ...course, estado: 'aprobado_reconocido' } : course));
    setup('act3');
    expect(await screen.findByRole('checkbox', { name: /^Actuación 1$/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /^Actuación 2$/ })).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: /^Actuación 3$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /^Actuación 4$/ })).not.toBeInTheDocument();
  });
  it('exige selección, motivo y confirmación explícita', async () => {
    const { user } = setup();
    await screen.findByRole('checkbox', { name: /^Actuación 1$/ });
    await user.click(screen.getByRole('button', { name: 'Guardar reconocimientos' }));
    expect(await screen.findByText('Seleccione al menos un curso.')).toBeInTheDocument();
    expect(recognizeCourses).not.toHaveBeenCalled();
  });
  it('no permite guardar si falla la carga de la malla', async () => {
    vi.mocked(getRecognitionCourses).mockRejectedValue(new Error('network'));
    setup();
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Guardar reconocimientos' })).toBeDisabled();
  });
  it('resuelve la cadena sin bucles ni aprobar cursos por transitividad', () => {
    expect([...prerequisiteChain(courses, 'act4')].sort()).toEqual(['act1', 'act2', 'act3']);
    expect([...prerequisiteChain([{ ...courses[0], prerrequisitoIds: ['act2'] } as RecognitionCourse, courses[1]!], 'act1')]).toEqual(['act2']);
  });
});
