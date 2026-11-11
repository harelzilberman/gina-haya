import { api } from './client';
import type { BiodynamicDay } from '@gina-haya/shared';

export const calendarApi = {
  /**
   * Days from..to. `zone` (from useCalendarZone) selects the garden's
   * timezone/hemisphere variant; without it the server returns the legacy
   * Israel calendar.
   */
  getRange: (from: string, to: string, zone?: { query: string; token?: string }) =>
    api.get<BiodynamicDay[]>(
      `/api/calendar/range?from=${from}&to=${to}${zone ? `&${zone.query}` : ''}`,
      zone?.token,
    ),
};
