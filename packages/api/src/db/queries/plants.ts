import { db } from '../client';
import type { DayType } from '@gina-haya/shared';

// Plant is not yet in shared types — defined here as the source of truth
// until it is promoted to @gina-haya/shared.
export interface Plant {
  id: string;
  commonNameHe: string;
  commonNameEn: string;
  latinName: string | null;
  category: string | null;
  descriptionHe: string;
  descriptionEn: string;
  dayTypeAffinity: DayType[];
  companionPlants: string[];
  avoidPlants: string[];
  sowingMonthsIsrael: number[];
  harvestMonthsIsrael: number[];
}

// ---------------------------------------------------------------------------
// Raw DB row type
// ---------------------------------------------------------------------------

interface PlantRow {
  id: string;
  common_name_he: string;
  common_name_en: string;
  latin_name: string | null;
  category: string | null;
  description_he: string;
  description_en: string;
  day_type_affinity: string[];
  companion_plants: string[];
  avoid_plants: string[];
  sowing_months_israel: number[];
  harvest_months_israel: number[];
}

function toPlant(row: PlantRow): Plant {
  return {
    id: row.id,
    commonNameHe: row.common_name_he,
    commonNameEn: row.common_name_en,
    latinName: row.latin_name,
    category: row.category,
    descriptionHe: row.description_he,
    descriptionEn: row.description_en,
    dayTypeAffinity: row.day_type_affinity as DayType[],
    companionPlants: row.companion_plants,
    avoidPlants: row.avoid_plants,
    sowingMonthsIsrael: row.sowing_months_israel,
    harvestMonthsIsrael: row.harvest_months_israel,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Search plants by name in the given language using case-insensitive substring match.
 * Falls back to searching both columns when query is empty.
 */
export async function searchPlants(query: string, lang: 'he' | 'en'): Promise<Plant[]> {
  const column = lang === 'he' ? 'common_name_he' : 'common_name_en';

  const builder = db
    .from('plants')
    .select<string, PlantRow>('*')
    .order(column, { ascending: true })
    .limit(50);

  const { data, error } = query.trim()
    ? await builder.ilike(column, `%${query.trim()}%`)
    : await builder;

  if (error) throw error;
  return (data ?? []).map(toPlant);
}

/**
 * Fetch a single plant by id.
 */
export async function getPlantById(id: string): Promise<Plant | null> {
  const { data, error } = await db
    .from('plants')
    .select<string, PlantRow>('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data ? toPlant(data) : null;
}

/**
 * Return plants suited to a given biodynamic day type.
 */
export async function getPlantsByDayType(dayType: DayType): Promise<Plant[]> {
  const { data, error } = await db
    .from('plants')
    .select<string, PlantRow>('*')
    .contains('day_type_affinity', [dayType])
    .order('common_name_he', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toPlant);
}
