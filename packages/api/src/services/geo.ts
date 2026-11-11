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
const nominatimCache = new Map<string, { data: RawPlace[]; fetchedAt: number }>();
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

/**
 * Internal search row: the public shape plus what de-duplication needs.
 *   _id     GeoNames id (Open-Meteo only) — the same place in both languages
 *   _names  every known name of the place, in any language
 *   _cc     ISO country code (language-independent, unlike `country`)
 */
type RawPlace = GeoSearchResult & { _id?: number; _names: string[]; _cc: string | null };

/** Open-Meteo geocoding in one language. */
async function searchOpenMeteo(q: string, lang: 'he' | 'en'): Promise<RawPlace[]> {
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
        _names:    [String(r.name)],
        _cc:       r.country_code ? String(r.country_code).toUpperCase() : null,
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

/** Nominatim free-text search (24h cache). namedetails supplies the place's names in other languages. */
async function searchNominatim(q: string, lang: 'he' | 'en'): Promise<RawPlace[]> {
  const key = `${lang}:${q.toLowerCase()}`;
  const cached = nominatimCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < SEARCH_TTL_MS) return cached.data;

  const json = await nominatimFetch('/search', {
    format: 'jsonv2', q, 'accept-language': lang, limit: '8', addressdetails: '1', namedetails: '1',
  });
  const rows = (Array.isArray(json) ? json : [])
    .map((r: any) => ({ r, name: nominatimPlaceName(r), lat: Number(r?.lat), lon: Number(r?.lon) }))
    .filter(x => x.name && Number.isFinite(x.lat) && Number.isFinite(x.lon));

  const data: RawPlace[] = await Promise.all(rows.map(async ({ r, name, lat, lon }) => {
    const nd = r.namedetails ?? {};
    const names = [name!, nd.name, nd['name:he'], nd['name:en']]
      .filter((n): n is string => typeof n === 'string' && n.trim() !== '');
    return {
      _names:    names,
      _cc:       r.address?.country_code ? String(r.address.country_code).toUpperCase() : null,
      name:      name!,
      admin1:    r.address?.state ? String(r.address.state) : (r.address?.region ? String(r.address.region) : null),
      country:   r.address?.country ? String(r.address.country) : null,
      latitude:  lat,
      longitude: lon,
      // Best effort — the garden POST/PATCH resolves the timezone again anyway.
      timezone:  await resolveTimezone(lat, lon).catch(() => null),
    };
  }));

  boundedSet(nominatimCache, key, { data, fetchedAt: Date.now() });
  return data;
}

/** Great-circle distance in km. */
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Two results this close together, in the same country, are the same place. */
const SAME_PLACE_KM = 2;
/**
 * A name match only counts within this distance: "Berlin, NH" and
 * "Berlin, NJ" share a name and a country but are different towns. Name
 * variants of one place from different sources sit well inside it
 * (Open-Meteo's "Gan Hashomron" and "גן השומרון" are ~0.3 km apart).
 */
const SAME_NAME_MAX_KM = 20;

const normName = (n: string) => n.trim().toLocaleLowerCase();

function isSamePlace(a: RawPlace, b: RawPlace): boolean {
  if (a._id !== undefined && a._id === b._id) return true;
  // Countries must agree when both are known (codes are language-independent).
  if (a._cc && b._cc && a._cc !== b._cc) return false;
  const km = distanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
  if (km <= SAME_PLACE_KM && a._cc && b._cc) return true;
  if (km > SAME_NAME_MAX_KM) return false;
  const aNames = new Set(a._names.map(normName));
  return b._names.some(n => aNames.has(normName(n)));
}

/**
 * Search places by name.
 *
 *   1. Open-Meteo in the requested language and in English, in parallel.
 *   2. Fewer than 3 distinct places → also ask Nominatim (OpenStreetMap),
 *      which knows small places like moshavim and kibbutzim.
 *
 * Merging: two results are the same place when they share a GeoNames id, OR
 * any of their names match case-insensitively in either language (same
 * country, within SAME_NAME_MAX_KM), OR they are within SAME_PLACE_KM of each
 * other in the same country. The requested-language entry is kept, at the
 * position where the place first appeared.
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

  const merged: { place: RawPlace; requestedLang: boolean }[] = [];
  let anySucceeded = false;
  const add = (place: RawPlace, requestedLang: boolean) => {
    const existing = merged.find(m => isSamePlace(m.place, place));
    if (!existing) {
      merged.push({ place: { ...place, _names: [...place._names] }, requestedLang });
      return;
    }
    // Same place: pool the names (so later results can match either
    // language) and prefer the requested-language entry.
    const names = [...existing.place._names, ...place._names];
    if (requestedLang && !existing.requestedLang) {
      existing.place = {
        ...place,
        _id: place._id ?? existing.place._id,
        _cc: place._cc ?? existing.place._cc,
        _names: names,
      };
      existing.requestedLang = true;
    } else {
      existing.place._names = names;
      if (existing.place._id === undefined) existing.place._id = place._id;
    }
  };

  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      anySucceeded = true;
      s.value.forEach(p => add(p, langs[i] === lang));
    } else {
      console.warn('[searchPlaces] Open-Meteo failed:', s.reason?.message ?? s.reason);
    }
  });

  if (merged.length < 3) {
    try {
      // Nominatim answers in the requested language (accept-language).
      (await searchNominatim(query, lang)).forEach(p => add(p, true));
      anySucceeded = true;
    } catch (err: any) {
      console.warn('[searchPlaces] Nominatim failed:', err?.message ?? err);
    }
  }

  if (!anySucceeded) throw new Error('All geocoding sources failed');

  const data: GeoSearchResult[] = merged.map(({ place }) => {
    const { _id, _names, _cc, ...clean } = place;
    return clean;
  });
  boundedSet(searchCache, key, { data, fetchedAt: Date.now() });
  return data;
}

/** Max length of a garden's place name (location_name). */
export const LOCATION_NAME_MAX = 80;

/**
 * Most specific settlement-level name in a Nominatim /reverse address.
 * Order: hamlet → village → town → city → municipality → suburb → county.
 * A village or hamlet wins over a neighbouring town; suburb comes after city
 * so big cities return the city ("Berlin"), not a district ("Mitte").
 */
function reversePlaceName(address: any): string | null {
  const a = address ?? {};
  for (const k of ['hamlet', 'village', 'town', 'city', 'municipality', 'suburb', 'county']) {
    const v = a[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Reverse-geocode coordinates to "place, country" (e.g. "גן השומרון, ישראל")
 * via Nominatim /reverse. Returns null on any failure — never throws.
 *
 * Callers pass the coordinates the CLIENT sent, not the 2-decimal stored
 * values: rounding to 2 decimals moves a point up to ~700 m, enough to land
 * a border village (Gan HaShomron) in its neighbour (Pardes Hanna-Karkur).
 * The query and the 30-day cache key use 3 decimals (~100 m). zoom=14
 * (neighbourhood level) so small villages and hamlets resolve as themselves.
 */
export async function reverseGeocode(lat: number, lon: number, lang: 'he' | 'en'): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const rLat = (Math.round(lat * 1000) / 1000).toFixed(3);
  const rLon = (Math.round(lon * 1000) / 1000).toFixed(3);
  const key = `${lang}:${rLat},${rLon}`;
  const cached = reverseCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < REVERSE_TTL_MS) return cached.data;

  try {
    const json = await nominatimFetch('/reverse', {
      format: 'jsonv2', lat: rLat, lon: rLon, zoom: '14', 'accept-language': lang, addressdetails: '1',
    });
    if (!json || json.error) return null;
    const place   = reversePlaceName(json.address);
    const country = json.address?.country ?? null;
    const parts = [place, country]
      .map(v => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
    if (parts.length === 0) return null;
    const label = [...new Set(parts)].join(', ').slice(0, LOCATION_NAME_MAX);
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
 *   - with coordinates: location_name saved when supplied (trimmed, cut to
 *     LOCATION_NAME_MAX). Without one (GPS "use my location") it is filled by
 *     reverse geocoding the client's precise coordinates (3 decimals) in the
 *     user's language. A geocoding failure never fails the save.
 *   - locationName WITHOUT coordinates (renaming the place): only
 *     location_name changes — never coordinates or timezone. 1–80 chars after
 *     trimming (longer → 400); empty resets it to the reverse-geocoded name of
 *     the garden's current (stored) coordinates, or null if that fails.
 *
 * Callbacks are called lazily, only when reverse geocoding is needed:
 *   getLanguage       user's profile language (default 'he')
 *   getCurrentCoords  the garden's stored coordinates (PATCH only)
 */
export async function buildGardenLocationUpdates(
  body: {
    latitude?: unknown;
    longitude?: unknown;
    timezone?: unknown;
    locationName?: unknown;
  },
  opts: {
    getLanguage?: () => Promise<'he' | 'en'>;
    getCurrentCoords?: () => Promise<{ lat: number; lon: number } | null>;
  } = {},
): Promise<{ updates: Record<string, unknown> } | { error: string; code?: 'invalid_location_name' }> {
  const { latitude, longitude, timezone, locationName } = body;
  const { getLanguage, getCurrentCoords } = opts;
  const hasLat = latitude  !== undefined && latitude  !== null;
  const hasLon = longitude !== undefined && longitude !== null;
  if (hasLat !== hasLon) return { error: 'latitude and longitude must be supplied together' };
  if (locationName !== undefined && locationName !== null && typeof locationName !== 'string') {
    return { error: 'locationName must be a string', code: 'invalid_location_name' };
  }
  const trimmedName = typeof locationName === 'string' ? locationName.trim() : '';

  const updates: Record<string, unknown> = {};

  // ── Rename only: locationName without coordinates ─────────────────────────
  if (!hasLat && locationName !== undefined) {
    if (trimmedName.length > LOCATION_NAME_MAX) {
      return { error: `locationName must be at most ${LOCATION_NAME_MAX} characters`, code: 'invalid_location_name' };
    }
    if (trimmedName) {
      updates.location_name = trimmedName;
      return { updates };
    }
    // Empty → reset to the automatic name for the current coordinates.
    let autoName: string | null = null;
    try {
      const coords = getCurrentCoords ? await getCurrentCoords() : null;
      if (coords) {
        const lang = getLanguage ? await getLanguage() : 'he';
        autoName = await reverseGeocode(coords.lat, coords.lon, lang);
      }
    } catch (err: any) {
      console.warn('[buildGardenLocationUpdates] name reset geocode skipped:', err?.message ?? err);
    }
    updates.location_name = autoName;
    return { updates };
  }

  const suppliedName = trimmedName.slice(0, LOCATION_NAME_MAX);

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
        // Precise client coordinates — NOT the 2-decimal stored values.
        return await reverseGeocode(lat, lon, lang);
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
