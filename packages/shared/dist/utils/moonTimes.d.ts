/** Israel default location (Jerusalem) — used when a garden has no coordinates. */
export declare const ISRAEL_DEFAULT_COORDS: {
    readonly latitude: 31.78;
    readonly longitude: 35.22;
};
export interface MoonRiseSet {
    /** Moonrise during the local day, or null when the moon does not rise that day. */
    rise: Date | null;
    /** Moonset during the local day, or null when the moon does not set that day. */
    set: Date | null;
    /** No rise/set that day and the moon is above the horizon all day. */
    alwaysUp: boolean;
    /** No rise/set that day and the moon is below the horizon all day. */
    alwaysDown: boolean;
}
/**
 * Moonrise and moonset during the LOCAL day `date` ("YYYY-MM-DD") in `timeZone`
 * at the given coordinates.
 *
 * suncalc.getMoonTimes() always scans from midnight in the runtime's zone (or
 * UTC); this runs the same algorithm (altitude sampled every hour with a
 * quadratic fit through 3 points) from the garden's local midnight to the next
 * local midnight, so it is correct for any zone, including DST days.
 */
export declare function moonRiseSetForLocalDate(date: string, latitude: number, longitude: number, timeZone: string | null | undefined): MoonRiseSet;
/** "HH:MM" for an instant in `timeZone` (24-hour for he, locale default otherwise). */
export declare function formatTimeInZone(instant: Date, timeZone: string | null | undefined, locale: string): string;
//# sourceMappingURL=moonTimes.d.ts.map