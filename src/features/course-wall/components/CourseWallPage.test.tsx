import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCoursePost: vi.fn(),
  getCourseWall: vi.fn(),
  removeCoursePost: vi.fn(),
  removeDocument: vi.fn(),
  updateCoursePost: vi.fn(),
  uploadCourseAttachment: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('../../auth/AuthProvider', () => ({ useAuth: mocks.useAuth }));
vi.mock('../../documents/api/documentsApi', () => ({
  downloadDocument: vi.fn(),
  removeDocument: mocks.removeDocument,
}));
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
  mocks.removeDocument.mockResolvedValue(undefined);
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
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(screen.getByRole('button', { name: 'Nueva publicación' })).toHaveFocus();
  });

  it('no muestra la acción de creación al alumno', async () => {
    mocks.useAuth.mockReturnValue({ profile: { roles: [{ codigo: 'ALUMNO' }] } });
    renderPage();

    await screen.findByText('Aún no hay publicaciones en este curso.');
    expect(screen.queryByRole('button', { name: 'Nueva publicación' })).not.toBeInTheDocument();
  });

  it('mantiene loading como único estado y no habilita composición antes de una lectura exitosa', async () => {
    let resolveWall!: (value: typeof wall) => void;
    mocks.getCourseWall.mockReturnValue(new Promise((resolve) => { resolveWall = resolve; }));
    renderPage();

    expect(await screen.findByRole('status')).toHaveTextContent('Cargando publicaciones del curso');
    expect(screen.queryByText('Aún no hay publicaciones en este curso.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva publicación' })).not.toBeInTheDocument();

    resolveWall(wall);
    expect(await screen.findByRole('button', { name: 'Nueva publicación' })).toBeInTheDocument();
  });

  it('muestra solo el error de carga y oculta la acción de creación', async () => {
    mocks.getCourseWall.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'No tienes acceso al muro.' } } });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes acceso al muro.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Aún no hay publicaciones en este curso.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva publicación' })).not.toBeInTheDocument();
  });

  it('cierra el modal al pulsar Escape', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  });

  it('mantiene el modal abierto al pulsar Escape durante la publicación', async () => {
    let resolveCreate!: (value: { id: string }) => void;
    const user = userEvent.setup();
    mocks.createCoursePost.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    expect(await within(dialog).findByRole('button', { name: 'Publicando…' })).toBeDisabled();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(dialog).toHaveAttribute('open');
    expect(mocks.removeDocument).not.toHaveBeenCalled();
    resolveCreate({ id: 'post-1' });
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

  it('reutiliza los adjuntos ya subidos cuando falla la creación y se reintenta', async () => {
    const user = userEvent.setup();
    const file = new File(['contenido'], 'guion.pdf', { type: 'application/pdf' });
    mocks.uploadCourseAttachment.mockResolvedValue({ id: 'document-1' });
    mocks.createCoursePost
      .mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'No se pudo crear la publicación.' } } })
      .mockResolvedValueOnce({ id: 'post-1' });
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.upload(within(dialog).getByLabelText('Adjuntos'), file);
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se pudo crear la publicación.');

    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(mocks.createCoursePost).toHaveBeenLastCalledWith('course-1', {
      titulo: 'Ensayo general', contenido: 'Traer el texto impreso.', documentIds: ['document-1'],
    }));
    expect(mocks.uploadCourseAttachment).toHaveBeenCalledTimes(1);
    expect(mocks.removeDocument).not.toHaveBeenCalled();
  });

  it('compensa adjuntos ya subidos al cancelar después de un fallo de creación', async () => {
    const user = userEvent.setup();
    mocks.uploadCourseAttachment.mockResolvedValue({ id: 'document-1' });
    mocks.createCoursePost.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'No se pudo crear la publicación.' } } });
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.upload(within(dialog).getByLabelText('Adjuntos'), new File(['contenido'], 'guion.pdf', { type: 'application/pdf' }));
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    await within(dialog).findByRole('alert');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(mocks.removeDocument).toHaveBeenCalledWith('document-1'));
    expect(dialog).not.toHaveAttribute('open');
  });

  it('compensa los adjuntos temporales al reemplazar los archivos seleccionados', async () => {
    const user = userEvent.setup();
    mocks.uploadCourseAttachment.mockResolvedValue({ id: 'document-1' });
    mocks.createCoursePost.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'No se pudo crear la publicación.' } } });
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.upload(within(dialog).getByLabelText('Adjuntos'), new File(['uno'], 'uno.pdf', { type: 'application/pdf' }));
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    await within(dialog).findByRole('alert');

    await user.upload(within(dialog).getByLabelText('Adjuntos'), new File(['dos'], 'dos.pdf', { type: 'application/pdf' }));

    await waitFor(() => expect(mocks.removeDocument).toHaveBeenCalledWith('document-1'));
    expect(within(dialog).getByText('1 archivo seleccionado')).toBeInTheDocument();
  });

  it('conserva adjuntos temporales tras un borrado fallido y permite reintentar sin reupload', async () => {
    const user = userEvent.setup();
    mocks.uploadCourseAttachment.mockResolvedValue({ id: 'document-1' });
    mocks.createCoursePost.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'No se pudo crear la publicación.' } } });
    mocks.removeDocument
      .mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'No se pudo eliminar el adjunto temporal.' } } })
      .mockResolvedValueOnce(undefined);
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.upload(within(dialog).getByLabelText('Adjuntos'), new File(['uno'], 'uno.pdf', { type: 'application/pdf' }));
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    await within(dialog).findByRole('alert');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(await within(dialog).findByText('No se pudo eliminar el adjunto temporal.')).toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByText('1 archivo seleccionado')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Reintentar limpieza' }));
    await waitFor(() => expect(mocks.removeDocument).toHaveBeenCalledTimes(2));
    expect(within(dialog).queryByRole('button', { name: 'Reintentar limpieza' })).not.toBeInTheDocument();
    expect(mocks.uploadCourseAttachment).toHaveBeenCalledTimes(1);

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  });

  it('bloquea publicar hasta completar una compensación mixta y luego publica sin IDs duplicados', async () => {
    const user = userEvent.setup();
    mocks.uploadCourseAttachment
      .mockResolvedValueOnce({ id: 'document-a' })
      .mockResolvedValueOnce({ id: 'document-b' })
      .mockResolvedValueOnce({ id: 'document-c' })
      .mockResolvedValueOnce({ id: 'document-d' });
    mocks.createCoursePost
      .mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'No se pudo crear la publicación.' } } })
      .mockResolvedValueOnce({ id: 'post-1' });
    mocks.removeDocument
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'No se pudo eliminar B.' } } })
      .mockResolvedValueOnce(undefined);
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.upload(within(dialog).getByLabelText('Adjuntos'), [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
    ]);
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    await within(dialog).findByRole('alert');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(await within(dialog).findByText('No se pudo eliminar B.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Publicar' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: 'Reintentar limpieza' }));
    await waitFor(() => expect(mocks.removeDocument).toHaveBeenCalledTimes(3));
    expect(within(dialog).getByRole('button', { name: 'Publicar' })).toBeEnabled();

    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(mocks.createCoursePost).toHaveBeenLastCalledWith('course-1', {
      titulo: 'Ensayo general', contenido: 'Traer el texto impreso.', documentIds: ['document-c', 'document-d'],
    }));
    expect(mocks.uploadCourseAttachment).toHaveBeenCalledTimes(4);
  });

  it('compensa los adjuntos de una carga parcial fallida y conserva los archivos seleccionados', async () => {
    const user = userEvent.setup();
    const first = new File(['uno'], 'uno.pdf', { type: 'application/pdf' });
    const second = new File(['dos'], 'dos.pdf', { type: 'application/pdf' });
    mocks.uploadCourseAttachment
      .mockResolvedValueOnce({ id: 'document-1' })
      .mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'El segundo archivo no es válido.' } } });
    renderPage();
    await screen.findByText('Aún no hay publicaciones en este curso.');
    const dialog = await openComposer(user);

    await user.type(within(dialog).getByLabelText('Título de la publicación'), 'Ensayo general');
    await user.type(within(dialog).getByLabelText('Contenido de la publicación'), 'Traer el texto impreso.');
    await user.upload(within(dialog).getByLabelText('Adjuntos'), [first, second]);
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('El segundo archivo no es válido.');
    await waitFor(() => expect(mocks.removeDocument).toHaveBeenCalledWith('document-1'));
    expect(within(dialog).getByText('2 archivos seleccionados')).toBeInTheDocument();
    expect(mocks.createCoursePost).not.toHaveBeenCalled();
  });

  it('muestra un único error de la última acción en la publicación afectada', async () => {
    const user = userEvent.setup();
    mocks.getCourseWall.mockResolvedValue({
      ...wall,
      data: [
        { id: 'post-1', titulo: 'Primera', contenido: 'Contenido', fijada: false, publicadaAt: '2026-08-03T12:00:00.000Z', archivos: [] },
        { id: 'post-2', titulo: 'Segunda', contenido: 'Contenido', fijada: false, publicadaAt: '2026-08-03T12:00:00.000Z', archivos: [] },
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
    mocks.updateCoursePost.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'No se pudo fijar la publicación.' } } });
    renderPage();
    const first = (await screen.findByRole('heading', { name: 'Primera' })).closest('article')!;
    const second = screen.getByRole('heading', { name: 'Segunda' }).closest('article')!;

    await user.click(within(first).getByRole('button', { name: 'Fijar' }));

    expect(await within(first).findByRole('alert')).toHaveTextContent('No se pudo fijar la publicación.');
    expect(within(second).queryByRole('alert')).not.toBeInTheDocument();
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
