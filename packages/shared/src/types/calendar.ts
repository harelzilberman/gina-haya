export type MoonPhaseDirection = 'ascending' | 'descending';
export type DayType = 'fruit' | 'root' | 'flower' | 'leaf';
export type ScoreColour = 'green' | 'yellow' | 'orange' | 'red' | 'black';

export interface BiodynamicDay {
  date: string; // YYYY-MM-DD
  // Podolinsky
  ascendingDescending: MoonPhaseDirection;
  ascendingDescendingHe: string;
  /** Variant days: the new/full moon moment inside the local day (UTC ISO), else null. */
  phaseTransitionTime: string | null;
  nodeActive: boolean;
  /** Variant days: node_exact_utc − NODE_BLACKOUT_HOURS/2 (UTC ISO). */
  nodeBlackoutStart: string | null;
  /** Variant days: node_exact_utc + NODE_BLACKOUT_HOURS/2 (UTC ISO). */
  nodeBlackoutEnd: string | null;
  /**
   * True when [nodeBlackoutStart, nodeBlackoutEnd] overlaps this day in the
   * garden's local time (also the neighbouring day when the ±12 h window
   * spills over). Use for "node today" UI. nodeActive (node near local noon)
   * stays the planting-score input. Legacy fallback days: equals nodeActive.
   */
  nodeBlackoutToday?: boolean;
  perigeeActive: boolean;
  prep500Recommended: boolean;
  prep501Recommended: boolean;
  // Thun
  moonSign: string;
  moonSignHe: string;
  dayType: DayType;
  dayTypeHe: string;
  /** Variant days: the first sign change inside the local day (UTC ISO), else null. */
  dayTypeChangeTime: string | null;
  // Shared
  moonPhasePct: number;
  moonPhaseName: string;
  moonPhaseNameHe: string;
  moonPhaseAngle?: number;
  moonPhaseHe?: string;
  plantingScore: number;
  scoreColour: ScoreColour;
  moonriseTime: string | null;
  moonsetTime: string | null;
  chupChuDailySummary: string;
  chupChuDailySummaryEn?: string;
  // ── Timezone/hemisphere variant fields ──────────────────────────────────
  // Present only when the day was read from biodynamic_calendar_variants
  // (calendar endpoints called with ?gardenId= or ?tz=).
  /** Events inside the local day, sorted by time. */
  transitions?: CalendarTransition[];
  /** Whole-hour UTC offset of the variant (-12 … +14). */
  utcOffsetHours?: number;
  hemisphere?: 'north' | 'south';
  /** IANA zone the request was resolved for. */
  timezone?: string;
}

/** One event inside a local calendar day (biodynamic_calendar_variants.transitions). */
export type CalendarTransition =
  | (CalendarTransitionBase & {
      type: 'sign_change';
      from_sign: string; from_sign_he: string;
      to_sign: string;   to_sign_he: string;
      from_day_type: DayType; from_day_type_he: string;
      to_day_type: DayType;   to_day_type_he: string;
    })
  | (CalendarTransitionBase & {
      type: 'asc_desc_change';
      /** Direction from this moment on (hemisphere rule already applied). */
      value: MoonPhaseDirection;
      value_he: string;
    })
  | (CalendarTransitionBase & { type: 'new_moon' | 'full_moon'; label_he: string })
  | (CalendarTransitionBase & {
      type: 'node';
      /** Astronomical: the moon crosses the ecliptic going north (ascending) or south. */
      direction: MoonPhaseDirection;
      label_he: string;
      label_en: string;
    });

interface CalendarTransitionBase {
  /** ISO timestamp, minute precision, UTC. */
  at_utc: string;
  /** "HH:MM" in the variant's local time. */
  local_time: string;
}
