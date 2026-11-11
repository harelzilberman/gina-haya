import { db } from '../client';
import {
  resolveVariant,
  type BiodynamicDay,
  type CalendarTransition,
  type CalendarVariant,
} from '@gina-haya/shared';

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
  mon_daily_summary: string;
  mon_daily_summary_en?: string;
  // biodynamic_calendar_variants only
  utc_offset_hours?: number;
  hemisphere?: 'north' | 'south';
  transitions?: CalendarTransition[];
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
    chupChuDailySummary: row.mon_daily_summary,
    chupChuDailySummaryEn: row.mon_daily_summary_en,
  };
}

function toVariantDay(row: CalendarRow, timezone: string): BiodynamicDay {
  return {
    ...toCalendarDay(row),
    transitions: Array.isArray(row.transitions) ? row.transitions : [],
    utcOffsetHours: row.utc_offset_hours,
    hemisphere: row.hemisphere,
    timezone,
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

// ── Timezone / hemisphere variants ───────────────────────────────────────────
//
// biodynamic_calendar_variants: one row per (date, utc_offset_hours,
// hemisphere). The variant is resolved PER DATE from the garden's timezone, so
// a range that crosses a DST change reads two variants. Dates whose variant row
// is missing (variants not generated yet) fall back to biodynamic_calendar
// (Israel), with a warning logged once per process.

export interface CalendarLocation {
  /** IANA zone (null → Asia/Jerusalem). */
  timezone: string | null;
  /** Garden latitude (null → north). */
  latitude: number | null;
}

let warnedMissingVariants = false;

/** All "YYYY-MM-DD" dates from..to inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** A raw calendar row plus where it came from. */
export type RawCalendarRow = CalendarRow & { [column: string]: unknown; fromVariant: boolean };

/**
 * Raw (snake_case) calendar rows for the given dates in a location's
 * variants, keyed by date. Missing variant rows fall back to
 * biodynamic_calendar (fromVariant = false). Dates found in neither table
 * are absent from the map. For callers that format DB rows directly (Chupchu).
 */
export async function getVariantRawRows(dates: string[], loc: CalendarLocation): Promise<Map<string, RawCalendarRow>> {
  const byDate = new Map<string, RawCalendarRow>();
  if (dates.length === 0) return byDate;

  const groups = new Map<string, { variant: CalendarVariant; dates: string[] }>();
  for (const date of dates) {
    const variant = resolveVariant(date, loc.timezone, loc.latitude);
    const key = `${variant.utcOffsetHours}:${variant.hemisphere}`;
    const g = groups.get(key) ?? { variant, dates: [] };
    g.dates.push(date);
    groups.set(key, g);
  }

  for (const { variant, dates: groupDates } of groups.values()) {
    const { data, error } = await db
      .from('biodynamic_calendar_variants')
      .select('*')
      .eq('utc_offset_hours', variant.utcOffsetHours)
      .eq('hemisphere', variant.hemisphere)
      .gte('date', groupDates[0])
      .lte('date', groupDates[groupDates.length - 1]);
    if (error) {
      if (!warnedMissingVariants) {
        warnedMissingVariants = true;
        console.warn('[calendar] biodynamic_calendar_variants read failed — falling back to biodynamic_calendar:', error.message);
      }
      continue;
    }
    const wanted = new Set(groupDates);
    for (const row of data ?? []) {
      if (wanted.has(row.date)) byDate.set(row.date, { ...row, fromVariant: true });
    }
  }

  const missing = dates.filter(d => !byDate.has(d));
  if (missing.length > 0) {
    if (!warnedMissingVariants) {
      warnedMissingVariants = true;
      console.warn(`[calendar] no variant rows for ${missing.length} date(s) (first ${missing[0]}) — falling back to biodynamic_calendar. Run generate_calendar.py --variants.`);
    }
    const { data, error } = await db
      .from('biodynamic_calendar')
      .select('*')
      .gte('date', missing[0])
      .lte('date', missing[missing.length - 1]);
    if (error) throw error;
    const wanted = new Set(missing);
    for (const row of data ?? []) {
      if (wanted.has(row.date)) byDate.set(row.date, { ...row, fromVariant: false });
    }
  }
  return byDate;
}

/**
 * Calendar days for the given dates in a location's variants, ordered by date.
 * Dates with neither a variant row nor a legacy row are omitted.
 */
export async function getVariantDays(dates: string[], loc: CalendarLocation): Promise<BiodynamicDay[]> {
  if (dates.length === 0) return [];
  const tz = loc.timezone ?? 'Asia/Jerusalem';
  const rows = await getVariantRawRows(dates, loc);
  return dates
    .filter(d => rows.has(d))
    .map(d => {
      const row = rows.get(d)!;
      return row.fromVariant ? toVariantDay(row, tz) : toCalendarDay(row);
    });
}

/** One calendar day in a location's variant (legacy fallback), or null. */
export async function getVariantDay(date: string, loc: CalendarLocation): Promise<BiodynamicDay | null> {
  const [day] = await getVariantDays([date], loc);
  return day ?? null;
}
