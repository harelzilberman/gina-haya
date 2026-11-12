/**
 * Offset of `timeZone` from UTC at `instantMs`, in minutes
 * (+120 for Israel winter, +330 for India, −300 for New York winter).
 */
export declare function zoneOffsetMinutes(timeZone: string, instantMs: number): number;
/** Today's date ("YYYY-MM-DD") in `tz` (null/invalid → Asia/Jerusalem). */
export declare function todayIn(tz: string | null | undefined, now?: Date): string;
/**
 * UTC ISO timestamp of local midnight at the start of `date` ("YYYY-MM-DD")
 * in `tz`. Works for DST changes and half-hour zones:
 *   localDateToUTCMidnight('2026-09-01', 'Asia/Jerusalem') → '2026-08-31T21:00:00.000Z'
 *   localDateToUTCMidnight('2026-09-01', 'Asia/Kolkata')   → '2026-08-31T18:30:00.000Z'
 */
export declare function localDateToUTCMidnight(date: string, tz: string | null | undefined): string;
/** UTC ISO timestamp for the start of today in `tz`. */
export declare function startOfTodayIn(tz: string | null | undefined): string;
/** UTC ISO timestamp for the start of the current month in `tz`. */
export declare function startOfCurrentMonthIn(tz: string | null | undefined): string;
/** @deprecated Use todayIn(tz) with the garden's or user's home zone. */
export declare function todayInIsrael(): string;
/** @deprecated Use localDateToUTCMidnight(date, tz). */
export declare function israelDateToUTCMidnight(israelDate: string): string;
/** @deprecated Use startOfTodayIn(tz). */
export declare function startOfTodayIsrael(): string;
/** @deprecated Use startOfCurrentMonthIn(tz). */
export declare function startOfCurrentMonthIsrael(): string;
/** Long date in Hebrew ("12 בנובמבר 2026") in `tz` (default Asia/Jerusalem). */
export declare function formatDateHe(dateStr: string, tz?: string | null | undefined): string;
/** Long date in English ("12 November 2026") in `tz` (default Asia/Jerusalem). */
export declare function formatDateEn(dateStr: string, tz?: string | null | undefined): string;
//# sourceMappingURL=date.d.ts.map