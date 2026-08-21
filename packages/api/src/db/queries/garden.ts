import { db } from '../client';
import type { Garden, GardenPlant } from '@gina-haya/shared';

// ---------------------------------------------------------------------------
// Raw DB row types
// ---------------------------------------------------------------------------

interface GardenPlantRow {
  plant_id: string | null;
  common_name_he: string;
  common_name_en: string;
  added_at: string;
  notes: string;
}

interface GardenRow {
  id: string;
  user_id: string;
  name: string;
  location_region: string;
  soil_type: Garden['soilType'];
  notes: string;
  created_at: string;
  updated_at: string;
  garden_plants: GardenPlantRow[];
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toGardenPlant(row: GardenPlantRow): GardenPlant {
  return {
    plantId: row.plant_id ?? '',
    commonNameHe: row.common_name_he,
    commonNameEn: row.common_name_en,
    addedAt: row.added_at,
    notes: row.notes,
  };
}

function toGarden(row: GardenRow): Garden {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    locationRegion: row.location_region,
    soilType: row.soil_type,
    notes: row.notes,
    plants: (row.garden_plants ?? []).map(toGardenPlant),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Return all gardens (with their plants) belonging to a user.
 */
export async function getGardensByUser(userId: string): Promise<Garden[]> {
  const { data, error } = await db
    .from('gardens')
    .select<string, GardenRow>('*, garden_plants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toGarden);
}

/**
 * Fetch a single garden by id, ensuring it belongs to the given user.
 */
export async function getGardenById(gardenId: string, userId: string): Promise<Garden | null> {
  const { data, error } = await db
    .from('gardens')
    .select<string, GardenRow>('*, garden_plants(*)')
    .eq('id', gardenId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data ? toGarden(data) : null;
}

/**
 * Create a new garden for a user.
 */
export async function createGarden(
  userId: string,
  input: Pick<Garden, 'name' | 'locationRegion' | 'soilType' | 'notes'>
): Promise<Garden> {
  const { data, error } = await db
    .from('gardens')
    .insert({
      user_id: userId,
      name: input.name,
      location_region: input.locationRegion,
      soil_type: input.soilType ?? null,
      notes: input.notes,
    })
    .select<string, GardenRow>('*, garden_plants(*)')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Garden creation returned no data');
  return toGarden(data);
}

/**
 * Remove a plant entry from a garden by its plant_id.
 */
export async function removePlantFromGarden(
  gardenId: string,
  plantId: string
): Promise<void> {
  const { error } = await db
    .from('garden_plants')
    .delete()
    .eq('garden_id', gardenId)
    .eq('plant_id', plantId);

  if (error) throw error;
}
