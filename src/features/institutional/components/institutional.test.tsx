import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PrivacyGate } from './PrivacyGate';
import { LibraryPage } from './LibraryPage';
import { NewsPage } from './NewsPage';
import { PrivacyAdminPage } from './PrivacyAdminPage';
import * as api from '../api/institutionalApi';
import * as library from '../api/libraryApi';

const auth = vi.hoisted(() => ({ roles: ['ALUMNO'], logout: vi.fn() }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ profile: { personaId: 'person', roles: auth.roles.map((codigo) => ({ codigo })) }, logout: auth.logout }) }));
vi.mock('../api/institutionalApi', () => ({ getPrivacyStatus: vi.fn(), acceptPrivacy: vi.fn(), getNews: vi.fn(), saveNews: vi.fn(), getPrivacyAcceptances: vi.fn(), getPrivacyPolicies: vi.fn(), publishPrivacy: vi.fn() }));
vi.mock('../api/libraryApi', () => ({ getLibrary: vi.fn(), publishLibraryFile: vi.fn(), getLibraryOptions: vi.fn() }));
const policy = { id: 'policy1', version: 'temporal-1', titulo: 'Privacidad', contenido: 'Texto provisional para revisión', provisional: true, vigente: true, publicadaAt: '2026-09-01T00:00:00Z' };
const empty = { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
beforeEach(() => {
  vi.clearAllMocks(); auth.roles = ['ALUMNO'];
  vi.mocked(api.getPrivacyStatus).mockResolvedValue({ policy, accepted: false, acceptedAt: null });
  vi.mocked(api.acceptPrivacy).mockResolvedValue({});
  vi.mocked(api.getNews).mockResolvedValue(empty);
  vi.mocked(api.saveNews).mockResolvedValue({});
  vi.mocked(api.getPrivacyPolicies).mockResolvedValue({ ...empty, data: [policy] });
  vi.mocked(api.getPrivacyAcceptances).mockResolvedValue(empty);
  vi.mocked(api.publishPrivacy).mockResolvedValue({});
  vi.mocked(library.getLibrary).mockResolvedValue(empty);
  vi.mocked(library.getLibraryOptions).mockResolvedValue([]);
  vi.mocked(library.publishLibraryFile).mockResolvedValue({});
});
afterEach(cleanup);
function setup(node: ReactNode) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);
  return userEvent.setup();
}
describe('privacidad y comunidad', () => {
  it('impide entrar antes de marcar aceptación y la registra contra la versión leída', async () => {
    const user = setup(<PrivacyGate><p>Portal habilitado</p></PrivacyGate>);
    expect(await screen.findByRole('button', { name: 'Aceptar y continuar' })).toBeDisabled();
    expect(screen.queryByText('Portal habilitado')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    vi.mocked(api.getPrivacyStatus).mockResolvedValue({ policy, accepted: true, acceptedAt: 'server-time' });
    await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
    await screen.findByText('Portal habilitado');
    expect(api.acceptPrivacy).toHaveBeenCalledWith('policy1');
  });
  it('rechazar cierra sesión y no registra aceptación', async () => {
    const user = setup(<PrivacyGate><p>Portal</p></PrivacyGate>);
    await user.click(await screen.findByRole('button', { name: 'No aceptar y cerrar sesión' }));
    expect(auth.logout).toHaveBeenCalledOnce(); expect(api.acceptPrivacy).not.toHaveBeenCalled();
  });
  it('si no puede consultar la política, mantiene cerrado el portal', async () => {
    vi.mocked(api.getPrivacyStatus).mockRejectedValue(new Error('network'));
    setup(<PrivacyGate><p>Portal habilitado</p></PrivacyGate>);
    await screen.findByRole('alert'); expect(screen.queryByText('Portal habilitado')).not.toBeInTheDocument();
  });
  it('la biblioteca del alumno no muestra acciones de publicación', async () => {
    setup(<LibraryPage />); await screen.findByText('No hay documentos institucionales publicados.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo para compartir')).not.toBeInTheDocument();
  });
  it('un gestor debe confirmar el archivo antes de publicarlo', async () => {
    auth.roles = ['GESTOR_ACADEMICO']; const user = setup(<LibraryPage />);
    const file = new File(['%PDF-1.7'], 'horario.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Archivo para compartir'), file);
    await user.click(screen.getByRole('button', { name: 'Publicar archivo para alumnos y profesores' }));
    expect(await screen.findByText('Confirme la publicación del documento institucional.')).toBeInTheDocument();
    expect(library.publishLibraryFile).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Publicar archivo para alumnos y profesores' }));
    await waitFor(() => expect(library.publishLibraryFile).toHaveBeenCalledWith(file, true));
  });
  it('alumno consulta noticias sin controles de gestión', async () => {
    setup(<NewsPage />); await screen.findByText('Aún no hay noticias publicadas.');
    expect(screen.queryByRole('button', { name: 'Nueva noticia' })).not.toBeInTheDocument(); expect(api.getNews).toHaveBeenCalledWith(1, false);
  });
  it('gestor crea un borrador con título y contenido', async () => {
    auth.roles = ['GESTOR_ACADEMICO']; const user = setup(<NewsPage />);
    await user.click(screen.getByRole('button', { name: 'Nueva noticia' }));
    await user.type(screen.getByLabelText('Título'), 'Bienvenida'); await user.type(screen.getByLabelText('Contenido'), 'Inicio de clases');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar noticia' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Guardar noticia' }));
    await waitFor(() => expect(api.saveNews).toHaveBeenCalledWith({ titulo: 'Bienvenida', contenido: 'Inicio de clases', estado: 'borrador', fijada: false, documentoIds: [] }, undefined));
  });
  it('administración edita el temporal publicando una versión nueva', async () => {
    auth.roles = ['ADMINISTRADOR_SISTEMA']; const user = setup(<PrivacyAdminPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar texto vigente' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Editar texto vigente' }));
    expect(screen.getByLabelText('Texto de privacidad')).toHaveValue(policy.contenido);
    await user.type(screen.getByLabelText('Nueva versión'), 'v2');
    await user.click(screen.getByRole('button', { name: 'Publicar nueva versión' }));
    await waitFor(() => expect(api.publishPrivacy).toHaveBeenCalledWith(expect.objectContaining({ version: 'v2', contenido: policy.contenido }), expect.anything()));
  });
});
