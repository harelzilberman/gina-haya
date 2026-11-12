import type { ScoreColour } from '../types/calendar';

export const SCORE_COLOUR_THRESHOLDS: Array<{ min: number; colour: ScoreColour }> = [
  { min: 8, colour: 'green'  },
  { min: 6, colour: 'yellow' },
  { min: 4, colour: 'orange' },
  { min: 2, colour: 'red'    },
  { min: 0, colour: 'black'  },
];

export const SCORE_COLOURS: Record<ScoreColour, string> = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#333333',
};

export const NODE_BLACKOUT_HOURS = 24;

/** First date of generated calendar data — fallback when /api/calendar/status has no minDate. */
export const CALENDAR_DATA_MIN_DATE = '2025-01-01';
export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';
