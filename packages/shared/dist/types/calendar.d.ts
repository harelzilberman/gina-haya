export type MoonPhaseDirection = 'ascending' | 'descending';
export type DayType = 'fruit' | 'root' | 'flower' | 'leaf';
export type ScoreColour = 'green' | 'yellow' | 'orange' | 'red' | 'black';
export interface BiodynamicDay {
    date: string;
    ascendingDescending: MoonPhaseDirection;
    ascendingDescendingHe: string;
    phaseTransitionTime: string | null;
    nodeActive: boolean;
    nodeBlackoutStart: string | null;
    nodeBlackoutEnd: string | null;
    perigeeActive: boolean;
    prep500Recommended: boolean;
    prep501Recommended: boolean;
    moonSign: string;
    moonSignHe: string;
    dayType: DayType;
    dayTypeHe: string;
    dayTypeChangeTime: string | null;
    moonPhasePct: number;
    moonPhaseName: string;
    moonPhaseNameHe: string;
    moonPhaseAngle?: number;
    moonPhaseHe?: string;
    plantingScore: number;
    scoreColour: ScoreColour;
    moonriseTime: string | null;
    moonsetTime: string | null;
    chupChuDailySummary: string;
}
//# sourceMappingURL=calendar.d.ts.map