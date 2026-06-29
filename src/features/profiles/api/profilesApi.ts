import { api } from '../../../api/client';
import type {
  PaginatedResponse,
  StudentListItem,
  StudentState,
  TeacherListItem,
} from '../../../api/types';

export type DirectoryFilters<TState extends string> = {
  search?: string;
  estado?: TState;
  page: number;
  pageSize: number;
};

export async function getStudents(filters: DirectoryFilters<StudentState>) {
  const { data } = await api.get<PaginatedResponse<StudentListItem>>('/alumnos', {
    params: filters,
  });
  return data;
}

export async function getTeachers(filters: DirectoryFilters<'activo' | 'inactivo'>) {
  const { data } = await api.get<PaginatedResponse<TeacherListItem>>('/profesores', {
    params: filters,
  });
  return data;
}
