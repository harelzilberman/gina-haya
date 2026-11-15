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
export interface MoonDisplayAngle {
    /**
     * Zenith angle of the moon's bright limb, in radians: the direction of the
     * lit side's midpoint on the disc, measured from "straight up" (towards the
     * observer's zenith) counter-clockwise as the observer sees the sky.
     * 0 = lit at the top, π/2 = left, π = bottom, 3π/2 = right.
     */
    angleRad: number;
    /** The instant the angle is computed for. */
    at: Date;
    /** That instant as "HH:MM" (24-hour) in the location's timezone. */
    atLocalTime: string;
}
/** Zenith angle of the bright limb at an instant (suncalc: illumination.angle − parallacticAngle). */
export declare function moonBrightLimbAngleAt(instant: Date, latitude: number, longitude: number): number;
/**
 * How the moon is oriented in the sky for the LOCAL day `date` ("YYYY-MM-DD")
 * at a location — the angle at which to draw the lit side.
 *
 * The instant used:
 *   • today (in `timeZone`): now, if the moon is above the horizon;
 *   • otherwise (and for any other date): the moment of maximum moon altitude
 *     while the sun is below −6° during that date's night (sunset → next
 *     sunrise); if the moon is never up in darkness that night (around new
 *     moon), the moon's upper transit after local noon.
 */
export declare function moonDisplayAngle(date: string, latitude: number, longitude: number, timeZone: string | null | undefined, now?: Date): MoonDisplayAngle;
//# sourceMappingURL=moonTimes.d.ts.map