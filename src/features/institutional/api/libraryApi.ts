import { api } from '../../../api/client';
import type { PaginatedResponse } from '../../../api/types';
import type { AcademicDocument } from '../../documents/api/documentsApi';

export async function getLibrary(page = 1) {
  return (await api.get<PaginatedResponse<AcademicDocument>>('/documentos', {
    params: { page, pageSize: 20, ambito: 'INSTITUCION', biblioteca: 'true' },
  })).data;
}

// Publicación explícita desde la biblioteca. El flujo interno de documentos no cambia.
export async function publishLibraryFile(file: File, confirmed: boolean) {
  if (!confirmed) throw new Error('Confirme que desea compartir este archivo con alumnos y profesores.');
  const body = new FormData();
  body.append('archivo', file); body.append('tipo', 'OTRO'); body.append('ambito', 'INSTITUCION');
  body.append('publicadoBiblioteca', 'true');
  return (await api.post('/documentos', body)).data;
}

export async function getLibraryOptions() {
  const files: AcademicDocument[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await getLibrary(page);
    files.push(...result.data);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return files;
}
