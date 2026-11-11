import type { Hemisphere } from '../types/garden';

// ── Garden season ────────────────────────────────────────────────────────────
//
// Meteorological seasons (whole calendar months), resolved from the garden's
// LOCAL date — a Sydney garden on 1 Dec local time is already in summer even
// while it is still 30 Nov in Israel.
//
//   Month       Northern   Southern
//   Dec–Feb     winter     summer
//   Mar–May     spring     autumn
//   Jun–Aug     summer     winter
//   Sep–Nov     autumn     spring

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
/** Hemisphere of a garden whose latitude is known. */
export type KnownHemisphere = Exclude<Hemisphere, 'unknown'>;

export interface GardenSeason {
  season: Season;
  hemisphere: KnownHemisphere;
  /** Local date in the garden's timezone, "YYYY-MM-DD". */
  localDate: string;
  seasonLabel: { he: string; en: string };
  hemisphereLabel: { he: string; en: string };
}

export const SEASON_LABELS: Record<Season, { he: string; en: string }> = {
  winter: { he: 'חורף', en: 'winter' },
  spring: { he: 'אביב', en: 'spring' },
  summer: { he: 'קיץ',  en: 'summer' },
  autumn: { he: 'סתיו', en: 'autumn' },
};

export const HEMISPHERE_LABELS: Record<KnownHemisphere, { he: string; en: string }> = {
  north: { he: 'חצי הכדור הצפוני', en: 'Northern Hemisphere' },
  south: { he: 'חצי הכדור הדרומי', en: 'Southern Hemisphere' },
};

const NORTH_SEASON_BY_MONTH: Season[] = [
  'winter', 'winter',            // Jan, Feb
  'spring', 'spring', 'spring',  // Mar–May
  'summer', 'summer', 'summer',  // Jun–Aug
  'autumn', 'autumn', 'autumn',  // Sep–Nov
  'winter',                      // Dec
];

const OPPOSITE: Record<Season, Season> = {
  winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring',
};

/**
 * Local calendar date ("YYYY-MM-DD") of `date` in `timeZone`.
 * Falls back to UTC when the timezone is missing or not a valid IANA zone.
 */
export function localDateInZone(date: Date, timeZone?: string | null): string {
  if (timeZone) {
    try {
      return date.toLocaleDateString('sv-SE', { timeZone });
    } catch {
      // invalid zone — fall through to UTC
    }
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Current meteorological season for a garden.
 *
 * @param latitude  Garden latitude; null/undefined/non-finite → null (unknown location).
 * @param date      The instant to evaluate (usually `new Date()`).
 * @param timezone  Garden IANA timezone; the local date decides the month. UTC if absent.
 */
export function getGardenSeason(
  latitude: number | null | undefined,
  date: Date,
  timezone?: string | null,
): GardenSeason | null {
  if (latitude == null || !Number.isFinite(Number(latitude))) return null;
  const hemisphere: KnownHemisphere = Number(latitude) >= 0 ? 'north' : 'south';
  const localDate = localDateInZone(date, timezone);
  const month = Number(localDate.slice(5, 7)); // 1–12
  const north = NORTH_SEASON_BY_MONTH[month - 1];
  const season = hemisphere === 'north' ? north : OPPOSITE[north];
  return {
    season,
    hemisphere,
    localDate,
    seasonLabel: SEASON_LABELS[season],
    hemisphereLabel: HEMISPHERE_LABELS[hemisphere],
  };
}
