export type SoilType = 'clay' | 'sandy' | 'loam' | 'chalky' | 'silty' | 'peaty' | 'mixed';
export interface Garden {
    id: string;
    userId: string;
    name: string;
    /** Legacy Israeli region label. New gardens no longer write it. */
    locationRegion: string | null;
    /** Garden coordinates, rounded to 2 decimals (city-level). */
    latitude: number | null;
    longitude: number | null;
    /** IANA timezone resolved from the coordinates, e.g. 'Europe/Berlin'. */
    timezone: string | null;
    /** Display name chosen in the city picker, e.g. 'Gan Hashomron, Israel'. */
    locationName: string | null;
    soilType: SoilType | null;
    plants: GardenPlant[];
    notes: string;
    createdAt: string;
    updatedAt: string;
}
export interface GardenPlant {
    plantId: string;
    commonNameHe: string;
    commonNameEn: string;
    addedAt: string;
    notes: string;
}
export type Hemisphere = 'north' | 'south' | 'unknown';
/** Location fields every garden GET/list response includes (API row shape). */
export interface GardenLocationFields {
    latitude: number | null;
    longitude: number | null;
    timezone: string | null;
    location_name: string | null;
}
/** Body accepted by POST /api/garden and PATCH /api/garden/:id for the location. */
export interface GardenLocationInput {
    latitude: number;
    longitude: number;
    /** Client (browser/device) timezone — used only if server-side resolution fails. */
    timezone?: string | null;
    locationName?: string | null;
}
/** One result of GET /api/geo/search. */
export interface GeoSearchResult {
    name: string;
    admin1: string | null;
    country: string | null;
    latitude: number;
    longitude: number;
    timezone: string | null;
}
//# sourceMappingURL=garden.d.ts.map