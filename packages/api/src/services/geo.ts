// ── Geo helpers: timezone resolution, place search, reverse geocoding ────────
//
// Timezones and primary place search come from Open-Meteo (no API key).
// Nominatim (OpenStreetMap) fills the gaps: small places that Open-Meteo's
// GeoNames-based index misses (e.g. Israeli moshavim) and reverse geocoding
// for GPS-saved gardens. In-memory caches only — they reset on deploy, which
// is fine: timezones and place names are stable.

const TZ_TIMEOUT_MS     = 5_000;
const SEARCH_TIMEOUT_MS = 5_000;
const SEARCH_TTL_MS     = 24 * 60 * 60 * 1000;      // 24h
const REVERSE_TTL_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days
const CACHE_MAX_ENTRIES = 2000;

const tzCache        = new Map<string, string>();
const searchCache    = new Map<string, { data: GeoSearchResult[]; fetchedAt: number }>();
const nominatimCache = new Map<string, { data: GeoSearchResult[]; fetchedAt: number }>();
const reverseCache   = new Map<string, { data: string; fetchedAt: number }>();

/** Insert into a bounded Map, dropping the oldest entry once it is full. */
function boundedSet<V>(map: Map<string, V>, key: string, value: V): void {
  if (!map.has(key) && map.size >= CACHE_MAX_ENTRIES) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

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

// ── Nominatim (OpenStreetMap) client ─────────────────────────────────────────
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/
//   - identify the application with a descriptive User-Agent
//   - at most 1 request per second (enforced by the in-process throttle below)
//   - cache results (24h for search, 30 days for reverse)
const NOMINATIM_BASE        = 'https://nominatim.openstreetmap.org';
const NOMINATIM_USER_AGENT  = 'GinaHaya/1.0 (+https://www.gina-haya.com)';
const NOMINATIM_TIMEOUT_MS  = 6_000;
const NOMINATIM_MIN_GAP_MS  = 1_100; // a little over 1s to absorb clock jitter
const NOMINATIM_MAX_WAIT_MS = 8_000; // shed load instead of queueing forever

let nominatimNextSlot = 0;

/**
 * Fetch a Nominatim endpoint, spaced at least NOMINATIM_MIN_GAP_MS after the
 * previous request from this process. Slots are reserved synchronously, so
 * concurrent callers queue in order. Throws when the queue is too long or on
 * any upstream failure.
 */
async function nominatimFetch(path: string, params: Record<string, string>): Promise<any> {
  const now  = Date.now();
  const slot = Math.max(now, nominatimNextSlot);
  const wait = slot - now;
  if (wait > NOMINATIM_MAX_WAIT_MS) throw new Error('nominatim_queue_full');
  nominatimNextSlot = slot + NOMINATIM_MIN_GAP_MS;
  if (wait > 0) await new Promise(r => setTimeout(r, wait));

  const url = new URL(path, NOMINATIM_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': NOMINATIM_USER_AGENT, 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Settlement-level place name from a Nominatim result. */
function nominatimPlaceName(r: any): string | null {
  const a = r?.address ?? {};
  const name = a.village ?? a.town ?? a.city ?? a.hamlet ?? a.municipality ?? r?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

export interface GeoSearchResult {
  name: string;
  admin1: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

type OpenMeteoResult = GeoSearchResult & { _id?: number };

/** Open-Meteo geocoding in one language. Results carry their GeoNames id for de-duplication. */
async function searchOpenMeteo(q: string, lang: 'he' | 'en'): Promise<OpenMeteoResult[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name',     q);
  url.searchParams.set('count',    '8');
  url.searchParams.set('language', lang);
  url.searchParams.set('format',   'json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`Geocoding API error: ${res.status}`);
    const json = await res.json() as { results?: any[] };
    return (json.results ?? [])
      .filter(r => Number.isFinite(r?.latitude) && Number.isFinite(r?.longitude) && r?.name)
      .map(r => ({
        _id:       Number.isFinite(r.id) ? Number(r.id) : undefined,
        name:      String(r.name),
        admin1:    r.admin1 ? String(r.admin1) : null,
        country:   r.country ? String(r.country) : null,
        latitude:  Number(r.latitude),
        longitude: Number(r.longitude),
        timezone:  isValidTimeZone(r.timezone) ? r.timezone : null,
      }));
  } finally {
    clearTimeout(timeout);
  }
}

/** Nominatim free-text search mapped to GeoSearchResult (24h cache). */
async function searchNominatim(q: string, lang: 'he' | 'en'): Promise<GeoSearchResult[]> {
  const key = `${lang}:${q.toLowerCase()}`;
  const cached = nominatimCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < SEARCH_TTL_MS) return cached.data;

  const json = await nominatimFetch('/search', {
    format: 'jsonv2', q, 'accept-language': lang, limit: '8', addressdetails: '1',
  });
  const rows = (Array.isArray(json) ? json : [])
    .map((r: any) => ({ r, name: nominatimPlaceName(r), lat: Number(r?.lat), lon: Number(r?.lon) }))
    .filter(x => x.name && Number.isFinite(x.lat) && Number.isFinite(x.lon));

  const data: GeoSearchResult[] = await Promise.all(rows.map(async ({ r, name, lat, lon }) => ({
    name:      name!,
    admin1:    r.address?.state ? String(r.address.state) : (r.address?.region ? String(r.address.region) : null),
    country:   r.address?.country ? String(r.address.country) : null,
    latitude:  lat,
    longitude: lon,
    // Best effort — the garden POST/PATCH resolves the timezone again anyway.
    timezone:  await resolveTimezone(lat, lon).catch(() => null),
  })));

  boundedSet(nominatimCache, key, { data, fetchedAt: Date.now() });
  return data;
}

/** De-duplication key: same name + coordinates rounded to 2 decimals. */
function dedupeKey(r: GeoSearchResult): string {
  return `${r.name.trim().toLowerCase()}|${roundCoord(r.latitude).toFixed(2)},${roundCoord(r.longitude).toFixed(2)}`;
}

/**
 * Search places by name.
 *
 *   1. Open-Meteo in the requested language and in English, in parallel.
 *      Requested-language results come first; duplicates are dropped (same
 *      name + 2-decimal coordinates, or the same GeoNames id returned in
 *      both languages, e.g. "ברלין" / "Berlin").
 *   2. Fewer than 3 results → also ask Nominatim (OpenStreetMap), which
 *      knows small places like moshavim and kibbutzim.
 *
 * Throws only when every source failed, so the route can return 502.
 */
export async function searchPlaces(q: string, lang: 'he' | 'en'): Promise<GeoSearchResult[]> {
  const query = q.trim();
  const key = `${lang}:${query.toLowerCase()}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < SEARCH_TTL_MS) return cached.data;

  const langs: ('he' | 'en')[] = lang === 'en' ? ['en'] : [lang, 'en'];
  const settled = await Promise.allSettled(langs.map(l => searchOpenMeteo(query, l)));

  const merged: GeoSearchResult[] = [];
  const seenKeys = new Set<string>();
  const seenIds  = new Set<number>();
  let anySucceeded = false;
  const add = (r: OpenMeteoResult) => {
    const k = dedupeKey(r);
    if (seenKeys.has(k) || (r._id !== undefined && seenIds.has(r._id))) return;
    seenKeys.add(k);
    if (r._id !== undefined) seenIds.add(r._id);
    const { _id, ...clean } = r;
    merged.push(clean);
  };

  for (const s of settled) {
    if (s.status === 'fulfilled') {
      anySucceeded = true;
      s.value.forEach(add);
    } else {
      console.warn('[searchPlaces] Open-Meteo failed:', s.reason?.message ?? s.reason);
    }
  }

  if (merged.length < 3) {
    try {
      (await searchNominatim(query, lang)).forEach(add);
      anySucceeded = true;
    } catch (err: any) {
      console.warn('[searchPlaces] Nominatim failed:', err?.message ?? err);
    }
  }

  if (!anySucceeded) throw new Error('All geocoding sources failed');

  boundedSet(searchCache, key, { data: merged, fetchedAt: Date.now() });
  return merged;
}

/**
 * Reverse-geocode coordinates to "place, country" (e.g. "גן השומרון, ישראל")
 * via Nominatim /reverse. 30-day cache keyed by 2-decimal coordinates.
 * Returns null on any failure — never throws.
 *
 * zoom=13 (village/suburb level), not 10 (city level): at zoom 10 a moshav
 * like Gan HaShomron resolves to its regional council ("מועצה אזורית מנשה").
 * At 13 the address still carries `city` for urban points, and
 * nominatimPlaceName() prefers village/town/city over suburb, so big cities
 * come back as "Sydney" / "ברלין", not a neighbourhood.
 */
export async function reverseGeocode(lat: number, lon: number, lang: 'he' | 'en'): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const rLat = roundCoord(lat).toFixed(2);
  const rLon = roundCoord(lon).toFixed(2);
  const key = `${lang}:${rLat},${rLon}`;
  const cached = reverseCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < REVERSE_TTL_MS) return cached.data;

  try {
    const json = await nominatimFetch('/reverse', {
      format: 'jsonv2', lat: rLat, lon: rLon, zoom: '13', 'accept-language': lang, addressdetails: '1',
    });
    if (!json || json.error) return null;
    const place   = nominatimPlaceName(json) ?? json.address?.county ?? json.address?.state ?? null;
    const country = json.address?.country ?? null;
    const parts = [place, country]
      .map(v => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
    if (parts.length === 0) return null;
    const label = [...new Set(parts)].join(', ').slice(0, 200);
    boundedSet(reverseCache, key, { data: label, fetchedAt: Date.now() });
    return label;
  } catch (err: any) {
    console.warn('[reverseGeocode] failed:', err?.message ?? err);
    return null;
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
 *   - coordinates saved without a location name (GPS "use my location"):
 *     location_name is filled by reverse geocoding in the user's language.
 *     A geocoding failure never fails the save — the name is simply left as is.
 *
 * `getLanguage` is called lazily, only when reverse geocoding is needed.
 */
export async function buildGardenLocationUpdates(
  body: {
    latitude?: unknown;
    longitude?: unknown;
    timezone?: unknown;
    locationName?: unknown;
  },
  getLanguage?: () => Promise<'he' | 'en'>,
): Promise<{ updates: Record<string, unknown> } | { error: string }> {
  const { latitude, longitude, timezone, locationName } = body;
  const suppliedName = typeof locationName === 'string' ? locationName.trim().slice(0, 200) : '';
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

    const reverseName = async (): Promise<string | null> => {
      if (suppliedName) return null;
      try {
        const lang = getLanguage ? await getLanguage() : 'he';
        return await reverseGeocode(rLat, rLon, lang);
      } catch (err: any) {
        console.warn('[buildGardenLocationUpdates] reverse geocode skipped:', err?.message ?? err);
        return null;
      }
    };
    const [resolvedTz, geocodedName] = await Promise.all([resolveTimezone(rLat, rLon), reverseName()]);
    updates.timezone = resolvedTz ?? (isValidTimeZone(timezone) ? timezone : null);
    if (geocodedName) updates.location_name = geocodedName;
  }

  if (suppliedName) {
    updates.location_name = suppliedName;
  } else if (locationName !== undefined && !updates.location_name) {
    // Explicitly cleared (and nothing geocoded in its place).
    updates.location_name = null;
  }

  return { updates };
}

/** Hemisphere label from a latitude. */
export function hemisphereOf(lat: number | null | undefined): 'north' | 'south' | 'unknown' {
  if (lat == null || !Number.isFinite(Number(lat))) return 'unknown';
  return Number(lat) >= 0 ? 'north' : 'south';
}
