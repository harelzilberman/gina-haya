import type { KnownHemisphere } from './season';
export declare const DEFAULT_CALENDAR_TIMEZONE = "Asia/Jerusalem";
export declare const MIN_VARIANT_OFFSET = -12;
export declare const MAX_VARIANT_OFFSET = 14;
export interface CalendarVariant {
    utcOffsetHours: number;
    hemisphere: KnownHemisphere;
}
/** True when `tz` is an IANA zone the runtime recognises. */
export declare function isValidIanaTimeZone(tz: unknown): tz is string;
/**
 * Variant for a garden on `dateISO` ("YYYY-MM-DD", the garden's local date).
 *
 * The UTC offset is measured at LOCAL NOON of that date, so DST is handled per
 * date (a range crossing a DST change gets two variants). Half- and
 * quarter-hour zones round to the nearest whole hour (India +5:30 → +6,
 * Newfoundland −3:30 → −3), clamped to −12 … +14.
 *
 * Defaults: timezone null/invalid → Asia/Jerusalem; latitude null → north.
 */
export declare function resolveVariant(dateISO: string, timezone: string | null | undefined, latitude: number | null | undefined): CalendarVariant;
/** Today's date ("YYYY-MM-DD") in `timezone` (null/invalid → Asia/Jerusalem). */
export declare function localTodayISO(timezone: string | null | undefined, now?: Date): string;
/** "YYYY-MM-DD" + n days (calendar arithmetic, timezone-free). */
export declare function addDaysISO(dateISO: string, n: number): string;
//# sourceMappingURL=calendarVariant.d.ts.map