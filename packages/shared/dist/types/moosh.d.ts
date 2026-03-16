export interface MooshMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}
export interface MooshContext {
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
    };
    userLanguage: 'he' | 'en';
}
//# sourceMappingURL=moosh.d.ts.map