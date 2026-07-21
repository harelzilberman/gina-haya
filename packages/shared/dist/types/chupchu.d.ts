export interface ChupChuMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    recognition_id?: string;
    recognition_photo_key?: string | null;
    is_retry?: boolean;
    user_hint?: string | null;
}
export interface ChupChuContext {
    gardenName: string | null;
    locationRegion: string | null;
    soilType: string | null;
    plants: string[];
    todayCalendar: {
        ascendingDescending: string;
        nodeActive: boolean;
        nodeBlackoutEnd: string | null;
        dayType: string;
        moonSign: string;
        plantingScore: number;
        scoreColour: string;
        prep500Recommended: boolean;
        prep501Recommended: boolean;
        perigeeActive: boolean;
    } | null;
    userLanguage: 'he' | 'en';
    gardenMap?: {
        hasMap: boolean;
        northAngle: number;
        objectCount: number;
        bedCount: number;
        treeCount: number;
        fruitTrees: string[];
        plantCount: number;
        plantNames: string[];
    } | null;
    recentHarvests?: Array<{
        plantNameHe: string;
        harvestDate: string;
        dayType: string;
        plantingScore: number;
    }> | null;
    weather?: {
        tempMax: number;
        tempMin: number;
        tempCurrent: number;
        humidity: number;
        windSpeed: number;
        uvIndex: number;
        precipitationMm: number;
        willRainToday: boolean;
        willRainTomorrow: boolean;
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        weatherDescription: string;
        weatherDescriptionHe: string;
        locationRegion: string;
    } | null;
}
//# sourceMappingURL=chupchu.d.ts.map