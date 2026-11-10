import { useGardenStore, type Garden } from '../stores/gardenStore';

/** Used only when no garden has coordinates (central Israel). */
export const DEFAULT_MOON_LAT = 31.7;

function hasCoords(g: Garden | null | undefined): g is Garden & { latitude: number; longitude: number } {
  return g?.latitude != null && g?.longitude != null;
}

/**
 * The garden location that drives the moon display (and, later, any weather UI).
 *
 * Garden: the active garden (gardenStore), else the first garden by created_at.
 * Latitude: that garden's coordinates → the first garden (by created_at) that
 * has coordinates → DEFAULT_MOON_LAT.
 */
export function useGardenLocation() {
  const activeGarden = useGardenStore(s => s.activeGarden);
  const gardens = useGardenStore(s => s.gardens);

  const byCreated = [...gardens].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const garden = activeGarden ?? byCreated[0] ?? null;
  const source = hasCoords(garden) ? garden : byCreated.find(hasCoords) ?? null;

  return {
    garden,
    /** True when the active garden itself has coordinates. */
    gardenHasCoords: hasCoords(garden),
    lat: source ? Number(source.latitude) : DEFAULT_MOON_LAT,
  };
}
