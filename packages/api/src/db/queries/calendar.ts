import { db } from '../client';
import type { BiodynamicDay } from '@gina-haya/shared';

// Shape of a raw row from biodynamic_calendar
interface CalendarRow {
  date: string;
  ascending_descending: 'ascending' | 'descending';
  ascending_descending_he: string;
  phase_transition_time: string | null;
  node_active: boolean;
  node_blackout_start: string | null;
  node_blackout_end: string | null;
  perigee_active: boolean;
  prep_500_recommended: boolean;
  prep_501_recommended: boolean;
  moon_sign: string;
  moon_sign_he: string;
  day_type: 'fruit' | 'root' | 'flower' | 'leaf';
  day_type_he: string;
  day_type_change_time: string | null;
  moon_phase_pct: number;
  moon_phase_name: string;
  moon_phase_name_he: string;
  moon_phase_angle?: number;
  moon_phase_he?: string;
  planting_score: number;
  score_colour: 'green' | 'yellow' | 'orange' | 'red' | 'black';
  moonrise_time: string | null;
  moonset_time: string | null;
  moosh_daily_summary: string;
}

function toCalendarDay(row: CalendarRow): BiodynamicDay {
  return {
    date: row.date,
    ascendingDescending: row.ascending_descending,
    ascendingDescendingHe: row.ascending_descending_he,
    phaseTransitionTime: row.phase_transition_time,
    nodeActive: row.node_active,
    nodeBlackoutStart: row.node_blackout_start,
    nodeBlackoutEnd: row.node_blackout_end,
    perigeeActive: row.perigee_active,
    prep500Recommended: row.prep_500_recommended,
    prep501Recommended: row.prep_501_recommended,
    moonSign: row.moon_sign,
    moonSignHe: row.moon_sign_he,
    dayType: row.day_type,
    dayTypeHe: row.day_type_he,
    dayTypeChangeTime: row.day_type_change_time,
    moonPhasePct: row.moon_phase_pct,
    moonPhaseName: row.moon_phase_name,
    moonPhaseNameHe: row.moon_phase_name_he,
    moonPhaseAngle: row.moon_phase_angle,
    moonPhaseHe: row.moon_phase_he,
    plantingScore: row.planting_score,
    scoreColour: row.score_colour,
    moonriseTime: row.moonrise_time,
    moonsetTime: row.moonset_time,
    mooshDailySummary: row.moosh_daily_summary,
  };
}

/**
 * Fetch a single biodynamic calendar day by date.
 * @param date YYYY-MM-DD
 */
export async function getCalendarDay(date: string): Promise<BiodynamicDay | null> {
  const { data, error } = await db
    .from('biodynamic_calendar')
    .select<'*', CalendarRow>('*')
    .eq('date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // row not found
    throw error;
  }

  return data ? toCalendarDay(data) : null;
}

/**
 * Fetch a range of biodynamic calendar days.
 * @param from YYYY-MM-DD
 * @param to   YYYY-MM-DD (inclusive)
 */
export async function getCalendarRange(from: string, to: string): Promise<BiodynamicDay[]> {
  const { data, error } = await db
    .from('biodynamic_calendar')
    .select<'*', CalendarRow>('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toCalendarDay);
}
