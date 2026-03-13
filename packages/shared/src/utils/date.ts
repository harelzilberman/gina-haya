import { ISRAEL_TIMEZONE } from '../constants/calendar';

export function todayInIsrael(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: ISRAEL_TIMEZONE });
}

export function formatDateHe(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: ISRAEL_TIMEZONE,
  });
}

export function formatDateEn(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: ISRAEL_TIMEZONE,
  });
}
