import { getTeachers } from '../profiles/api/profilesApi';

export async function getAllActiveTeachers() {
  const pageSize = 20;
  const firstPage = await getTeachers({ page: 1, pageSize, estado: 'activo' });
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) => (
      getTeachers({ page: index + 2, pageSize, estado: 'activo' })
    )),
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}
