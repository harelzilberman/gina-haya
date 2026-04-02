export type MoonPhaseDirection = 'ascending' | 'descending';
export type DayType = 'fruit' | 'root' | 'flower' | 'leaf';
export type ScoreColour = 'green' | 'yellow' | 'orange' | 'red' | 'black';

export interface BiodynamicDay {
  date: string; // YYYY-MM-DD
  // Podolinsky
  ascendingDescending: MoonPhaseDirection;
  ascendingDescendingHe: string;
  phaseTransitionTime: string | null;
  nodeActive: boolean;
  nodeBlackoutStart: string | null;
  nodeBlackoutEnd: string | null;
  perigeeActive: boolean;
  prep500Recommended: boolean;
  prep501Recommended: boolean;
  // Thun
  moonSign: string;
  moonSignHe: string;
  dayType: DayType;
  dayTypeHe: string;
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
  monDailySummary: string;
}
