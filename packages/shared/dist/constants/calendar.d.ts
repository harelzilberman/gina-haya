import type { ScoreColour } from '../types/calendar';
export declare const SCORE_COLOUR_THRESHOLDS: Array<{
    min: number;
    colour: ScoreColour;
}>;
export declare const SCORE_COLOURS: Record<ScoreColour, string>;
export declare const NODE_BLACKOUT_HOURS = 24;
/** First date of generated calendar data — fallback when /api/calendar/status has no minDate. */
export declare const CALENDAR_DATA_MIN_DATE = "2025-01-01";
export declare const ISRAEL_TIMEZONE = "Asia/Jerusalem";
//# sourceMappingURL=calendar.d.ts.map