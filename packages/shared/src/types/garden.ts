export type SoilType = 'clay' | 'sandy' | 'loam' | 'chalky' | 'silty' | 'peaty' | 'mixed';

export interface Garden {
  id: string;
  userId: string;
  name: string;
  locationRegion: string;
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
