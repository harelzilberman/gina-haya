import type { Hemisphere } from '../types/garden';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
/** Hemisphere of a garden whose latitude is known. */
export type KnownHemisphere = Exclude<Hemisphere, 'unknown'>;
export interface GardenSeason {
    season: Season;
    hemisphere: KnownHemisphere;
    /** Local date in the garden's timezone, "YYYY-MM-DD". */
    localDate: string;
    seasonLabel: {
        he: string;
        en: string;
    };
    hemisphereLabel: {
        he: string;
        en: string;
    };
}
export declare const SEASON_LABELS: Record<Season, {
    he: string;
    en: string;
}>;
export declare const HEMISPHERE_LABELS: Record<KnownHemisphere, {
    he: string;
    en: string;
}>;
/**
 * Local calendar date ("YYYY-MM-DD") of `date` in `timeZone`.
 * Falls back to UTC when the timezone is missing or not a valid IANA zone.
 */
export declare function localDateInZone(date: Date, timeZone?: string | null): string;
/**
 * Current meteorological season for a garden.
 *
 * @param latitude  Garden latitude; null/undefined/non-finite → null (unknown location).
 * @param date      The instant to evaluate (usually `new Date()`).
 * @param timezone  Garden IANA timezone; the local date decides the month. UTC if absent.
 */
export declare function getGardenSeason(latitude: number | null | undefined, date: Date, timezone?: string | null): GardenSeason | null;
//# sourceMappingURL=season.d.ts.map