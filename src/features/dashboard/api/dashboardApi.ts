import { api } from '../../../api/client';
import type { DashboardResponse } from '../../../api/types';

export async function getDashboard() {
  const { data } = await api.get<DashboardResponse>('/dashboard');
  return data;
}
