import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCoursePost: vi.fn(),
  getCourseWall: vi.fn(),
  removeCoursePost: vi.fn(),
  updateCoursePost: vi.fn(),
  uploadCourseAttachment: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('../../auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('../api/courseWallApi', () => ({
  createCoursePost: mocks.createCoursePost,
  getCourseWall: mocks.getCourseWall,
  removeCoursePost: mocks.removeCoursePost,
  updateCoursePost: mocks.updateCoursePost,
  uploadCourseAttachment: mocks.uploadCourseAttachment,
}));

import { CourseWallPage } from './CourseWallPage';

afterEach(cleanup);

const wall = {
  course: { id: 'course-1', code: 'ACT-101', name: 'Actuación I' },
  data: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCourseWall.mockResolvedValue(wall);
  mocks.useAuth.mockReturnValue({ profile: { roles: [{ codigo: 'PROFESOR' }] } });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() { this.setAttribute('open', ''); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); },
  });
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
  const view = render(
    <MemoryRouter initialEntries={['/muro/course-1']}>
      <QueryClientProvider client={client}>
        <Routes><Route element={<CourseWallPage />} path="/muro/:courseId" /></Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { ...view, client, invalidateQueries };
}

async function openComposer(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Nueva publicación' }));
  return screen.getByRole('dialog');
}

describe('CourseWallPage', () => {
  it('muestra un estado vacío explícito para un muro sin publicaciones', async () => {
    renderPage();

    expect(await screen.findByText('Aún no hay publicaciones en este curso.')).toBeInTheDocument();
    expect(screen.getByText('Las nuevas comunicaciones aparecerán aquí cuando el equipo docente las publique.')).toBeInTheDocument();
  });

  it('mantiene el formulario dentro del modal hasta que se pulse Nueva publicación', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Aún no hay publicaciones en este curso.');
    expect(document.querySelector('dialog[open]')).not.toBeInTheDocument();

    const dialog = await openComposer(user);
    expect(within(dialog).getByLabelText('Título de la publicación')).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Nueva publicación' })).toHaveFocus();
  });

  it('no muestra la acción de creación al alumno', async () => {
    mocks.useAuth.mockReturnValue({ profile: { roles: [{ codigo: 'ALUMNO' }] } });
    renderPage();

    await screen.findByText('Aún no hay publicaciones en este curso.');
    expect(screen.queryByRole('button', { name: 'Nueva publicación' })).not.toBeInTheDocument();
  });

  it('cierra el modal al pulsar Escape', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(dialog).not.toHaveAttribute('open');
  });

  it('muestra el error real del adjunto y conserva el borrador para reintentar', async () => {
    const user = userEvent.setup();
    mocks.uploadCourseAttachment.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'El archivo excede el tamaño permitido.' } } });
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);
    const file = new File(['contenido'], 'guion.pdf', { type: 'application/pdf' });

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.upload(within(dialog).getByLabelText('Adjuntos'), file);
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El archivo excede el tamaño permitido.');
    expect(within(dialog).getByLabelText('Título de la publicación')).toHaveValue('Ensayo general');
    expect(within(dialog).getByLabelText('Contenido de la publicación')).toHaveValue('Traer el texto impreso.');
    expect(within(dialog).getByText('1 archivo seleccionado')).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
  });

  it('limpia, cierra e invalida solo la query del muro al publicar correctamente', async () => {
    const user = userEvent.setup();
    mocks.uploadCourseAttachment.mockResolvedValue({ id: 'document-1' });
    mocks.createCoursePost.mockResolvedValue({ id: 'post-1' });
    const { invalidateQueries } = renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.createCoursePost).toHaveBeenCalledWith('course-1', {
      titulo: 'Ensayo general', contenido: 'Traer el texto impreso.', documentIds: [],
    }));
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(within(dialog).getByLabelText('Título de la publicación')).toHaveValue('');
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['course-wall', 'course-1'] });
  });

  it('aplica clases dedicadas al título y contenido de cada publicación', async () => {
    mocks.getCourseWall.mockResolvedValue({
      ...wall,
      data: [{ id: 'post-1', titulo: 'Material de lectura', contenido: 'https://sicac.edu.pe/material', fijada: false, publicadaAt: '2026-08-03T12:00:00.000Z', archivos: [] }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    renderPage();

    const title = await screen.findByRole('heading', { name: 'Material de lectura' });
    expect(title).toHaveClass('wall-post__title');
    expect(title.closest('article')?.querySelector('.wall-content')).toBeInTheDocument();
  });
});
