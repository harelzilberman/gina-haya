// ── Geo helpers: timezone resolution + place search ──────────────────────────
//
// Both backed by Open-Meteo (no API key). In-memory caches only — they reset
// on deploy, which is fine: timezones for a city never change and geocoding
// results are stable.

const TZ_TIMEOUT_MS     = 5_000;
const SEARCH_TIMEOUT_MS = 5_000;
const SEARCH_TTL_MS     = 24 * 60 * 60 * 1000; // 24h

const tzCache = new Map<string, string>();
const searchCache = new Map<string, { data: GeoSearchResult[]; fetchedAt: number }>();

/** Round a coordinate to 2 decimals (~1 km — city-level precision). */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/** True when `tz` is an IANA zone name the runtime recognises. */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the IANA timezone for a coordinate via Open-Meteo (timezone=auto).
 * Returns null on any failure (timeout, HTTP error, malformed payload).
 */
export async function resolveTimezone(lat: number, lon: number): Promise<string | null> {
  const key = `${roundCoord(lat).toFixed(2)},${roundCoord(lon).toFixed(2)}`;
  const cached = tzCache.get(key);
  if (cached) return cached;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',  String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current',   'temperature_2m');
  url.searchParams.set('timezone',  'auto');
  url.searchParams.set('forecast_days', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TZ_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json() as { timezone?: unknown };
    if (!isValidTimeZone(json.timezone)) return null;
    tzCache.set(key, json.timezone);
    return json.timezone;
  } catch (err: any) {
    console.error('[resolveTimezone] failed:', err?.message ?? err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export interface GeoSearchResult {
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

/**
 * Search places by name via the Open-Meteo geocoding API.
 * Throws on upstream failure so the route can return 502.
 */
export async function searchPlaces(q: string, lang: 'he' | 'en'): Promise<GeoSearchResult[]> {
  const key = `${lang}:${q.trim().toLowerCase()}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < SEARCH_TTL_MS) return cached.data;

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name',     q.trim());
  url.searchParams.set('count',    '8');
  url.searchParams.set('language', lang);
  url.searchParams.set('format',   'json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
    const json = await res.json() as { results?: any[] };
    const data: GeoSearchResult[] = (json.results ?? [])
      .filter(r => Number.isFinite(r?.latitude) && Number.isFinite(r?.longitude) && r?.name)
      .map(r => ({
        name:      String(r.name),
        admin1:    r.admin1 ? String(r.admin1) : null,
        country:   r.country ? String(r.country) : null,
        latitude:  Number(r.latitude),
        longitude: Number(r.longitude),
        timezone:  isValidTimeZone(r.timezone) ? r.timezone : null,
      }));

    // Bound memory: drop the oldest entry once the cache grows large.
    if (searchCache.size >= 2000) {
      const oldest = searchCache.keys().next().value;
      if (oldest !== undefined) searchCache.delete(oldest);
    }
    searchCache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Validate + normalise a location payload from a garden create/update body.
 * Returns the DB column updates, or an error message for a 400.
 *
 * Rules:
 *   - latitude/longitude must be supplied together and be in range
 *   - stored rounded to 2 decimals (city-level precision, for privacy)
 *   - timezone: server-resolved from coords; client value used only as a
 *     fallback, and only if it is a valid IANA zone
 *   - location_name saved when supplied (trimmed, max 200 chars)
 */
export async function buildGardenLocationUpdates(body: {
  latitude?: unknown;
  longitude?: unknown;
  timezone?: unknown;
  locationName?: unknown;
}): Promise<{ updates: Record<string, unknown> } | { error: string }> {
  const { latitude, longitude, timezone, locationName } = body;
  const hasLat = latitude  !== undefined && latitude  !== null;
  const hasLon = longitude !== undefined && longitude !== null;
  if (hasLat !== hasLon) return { error: 'latitude and longitude must be supplied together' };

  const updates: Record<string, unknown> = {};

  if (hasLat) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90  || lat > 90)  return { error: 'latitude must be between -90 and 90' };
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { error: 'longitude must be between -180 and 180' };

    const rLat = roundCoord(lat);
    const rLon = roundCoord(lon);
    updates.latitude          = rLat;
    updates.longitude         = rLon;
    updates.coords_updated_at = new Date().toISOString();

    const resolvedTz = await resolveTimezone(rLat, rLon);
    updates.timezone = resolvedTz ?? (isValidTimeZone(timezone) ? timezone : null);
  }

  if (locationName !== undefined) {
    const name = typeof locationName === 'string' ? locationName.trim().slice(0, 200) : '';
    updates.location_name = name || null;
  }

  return { updates };
}

/** Hemisphere label from a latitude. */
export function hemisphereOf(lat: number | null | undefined): 'north' | 'south' | 'unknown' {
  if (lat == null || !Number.isFinite(Number(lat))) return 'unknown';
  return Number(lat) >= 0 ? 'north' : 'south';
}
