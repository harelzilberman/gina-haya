import { db } from '../db/client';

/**
 * Returns true if userId owns the garden identified by gardenId.
 * On DB error or missing row, returns false. Never throws.
 */
export async function userOwnsGarden(gardenId: string, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from('gardens')
    .select('id')
    .eq('id', gardenId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[userOwnsGarden] DB error:', error.message, { gardenId, userId });
    return false;
  }
  return data !== null;
}

/**
 * Returns true if userId owns the garden_plants row identified by gardenPlantId.
 * Ownership is transitive: garden_plants.garden_id → gardens.user_id.
 * On DB error or missing row, returns false. Never throws.
 */
export async function userOwnsGardenPlant(gardenPlantId: string, userId: string): Promise<boolean> {
  // Step 1: fetch garden_id from garden_plants (no user_id column on garden_plants)
  const { data: gp, error: gpError } = await db
    .from('garden_plants')
    .select('garden_id')
    .eq('id', gardenPlantId)
    .maybeSingle();
  if (gpError) {
    console.error('[userOwnsGardenPlant] DB error fetching garden_plant:', gpError.message, { gardenPlantId, userId });
    return false;
  }
  if (!gp) return false;

  // Step 2: verify the garden belongs to the user
  return userOwnsGarden(gp.garden_id, userId);
}
