import type { BiodynamicDay } from '@gina-haya/shared';
import { apiFetch } from '../config/api';
import { getToken } from './auth';

export async function fetchTodayCalendar(): Promise<BiodynamicDay> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  return apiFetch<BiodynamicDay>('/api/calendar/today', token);
}
