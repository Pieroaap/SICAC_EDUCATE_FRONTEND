import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTeachers = vi.hoisted(() => vi.fn());

vi.mock('../profiles/api/profilesApi', () => ({ getTeachers }));

import { getAllActiveTeachers } from './loadAllActiveTeachers';

describe('getAllActiveTeachers', () => {
  beforeEach(() => {
    getTeachers.mockReset();
  });

  it('concatena todas las páginas usando el máximo admitido por /profesores', async () => {
    getTeachers.mockImplementation(async ({ page }: { page: number }) => ({
      data: [{ id: `teacher-${page}` }],
      pagination: { page, pageSize: 20, total: 3, totalPages: 3 },
    }));

    await expect(getAllActiveTeachers()).resolves.toEqual([
      { id: 'teacher-1' },
      { id: 'teacher-2' },
      { id: 'teacher-3' },
    ]);
    expect(getTeachers).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 20,
      estado: 'activo',
    });
    expect(getTeachers).toHaveBeenCalledWith({ page: 2, pageSize: 20, estado: 'activo' });
    expect(getTeachers).toHaveBeenCalledWith({ page: 3, pageSize: 20, estado: 'activo' });
  });

  it('no solicita páginas adicionales cuando el resultado tiene una sola página', async () => {
    getTeachers.mockResolvedValue({
      data: [{ id: 'teacher-1' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    await expect(getAllActiveTeachers()).resolves.toEqual([{ id: 'teacher-1' }]);
    expect(getTeachers).toHaveBeenCalledOnce();
    expect(getTeachers).toHaveBeenCalledWith({ page: 1, pageSize: 20, estado: 'activo' });
  });
});
