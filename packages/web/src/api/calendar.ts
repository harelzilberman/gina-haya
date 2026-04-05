import { api } from './client';
import type { BiodynamicDay } from '@gina-haya/shared';

export const calendarApi = {
  getRange: (from: string, to: string) =>
    api.get<BiodynamicDay[]>(`/api/calendar/range?from=${from}&to=${to}`),
};
