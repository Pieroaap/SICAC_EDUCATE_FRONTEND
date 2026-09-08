import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseEnrollmentAction } from './CourseEnrollmentAction';
import { enrollCourse } from '../api/academicOperationApi';
import { getRecognitionCourses } from '../api/recognitionApi';

vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { roles: [{ codigo: 'ADMINISTRADOR_SISTEMA' }] } }) }));
vi.mock('../api/academicOperationApi', () => ({ enrollCourse: vi.fn() }));
vi.mock('../api/recognitionApi', () => ({ getRecognitionCourses: vi.fn() }));
vi.mock('./RecognitionDialog', () => ({ RecognitionDialog: ({ onSaved }: { onSaved: () => void }) => <button onClick={onSaved}>Confirmar reconocimiento de prueba</button> }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(enrollCourse).mockResolvedValue({});
  vi.mocked(getRecognitionCourses).mockResolvedValue([{ id: 'act3', planCurricularId: 'plan', planNombre: 'Plan', cursoNombre: 'Actuación 3', cursoCodigo: 'ACT3', ciclo: 3, estado: 'sin_aprobacion', prerrequisitoIds: ['act2'] }]);
});
afterEach(cleanup);
function setup(hasAuthorization = false) {
  const onEnrolled = vi.fn(async () => {});
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <CourseEnrollmentAction personId="student" enrollmentId="enrollment" scheduledCourseId="scheduled3" planCourseId="act3" hasAuthorization={hasAuthorization} onEnrolled={onEnrolled} />
  </QueryClientProvider>);
  return { user: userEvent.setup(), onEnrolled };
}
describe('inscripción con reconocimiento', () => {
  it('abre el modal antes de inscribir cuando falta aprobación', async () => {
    const { user, onEnrolled } = setup();
    await user.click(screen.getByRole('button', { name: 'Inscribir' }));
    await screen.findByRole('button', { name: 'Confirmar reconocimiento de prueba' });
    expect(enrollCourse).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar reconocimiento de prueba' }));
    await waitFor(() => expect(onEnrolled).toHaveBeenCalledOnce());
    expect(enrollCourse).toHaveBeenCalledWith(expect.objectContaining({ matriculaCarreraId: 'enrollment', cursoProgramadoId: 'scheduled3' }));
  });
  it('si la inscripción falla informa que los reconocimientos ya se guardaron', async () => {
    vi.mocked(enrollCourse).mockRejectedValue(new Error('Falló inscripción'));
    const { user, onEnrolled } = setup();
    await user.click(screen.getByRole('button', { name: 'Inscribir' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar reconocimiento de prueba' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('status')).toHaveTextContent('ya fueron guardados');
    expect(onEnrolled).not.toHaveBeenCalled();
  });
  it('respeta una autorización excepcional ya aprobada sin exigir reconocimiento', async () => {
    const { user, onEnrolled } = setup(true);
    await user.click(screen.getByRole('button', { name: 'Inscribir' }));
    await waitFor(() => expect(onEnrolled).toHaveBeenCalledOnce());
    expect(getRecognitionCourses).not.toHaveBeenCalled();
  });
});
