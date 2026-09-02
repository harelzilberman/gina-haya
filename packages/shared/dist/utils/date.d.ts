export declare function todayInIsrael(): string;
/**
 * Converts a "YYYY-MM-DD" date string (in Israel time) to the UTC ISO timestamp
 * of midnight at the start of that day in Israel.
 *
 * Example (Israel = UTC+3 in summer):
 *   israelDateToUTCMidnight('2026-09-01') → '2026-08-31T21:00:00.000Z'
 *
 * Uses the Intl API to find the actual UTC offset at noon on that date,
 * so DST transitions are handled correctly without hard-coding offsets.
 */
export declare function israelDateToUTCMidnight(israelDate: string): string;
/** UTC ISO timestamp for the start of today in Israel time. */
export declare function startOfTodayIsrael(): string;
/** UTC ISO timestamp for the start of the current month in Israel time. */
export declare function startOfCurrentMonthIsrael(): string;
export declare function formatDateHe(dateStr: string): string;
export declare function formatDateEn(dateStr: string): string;
//# sourceMappingURL=date.d.ts.map