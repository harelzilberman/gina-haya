import { Router } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { REGION_COORDS, forecastTimezone, resolveGardenWeatherCoords } from '../services/weather';

export const weatherRouter = Router();

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const cache = new Map<string, { data: any; fetchedAt: number }>();

const WIND_DIRECTION_HE = (deg: number): string => {
  const dirs = ['צפון', 'צפון-מזרח', 'מזרח', 'דרום-מזרח', 'דרום', 'דרום-מערב', 'מערב', 'צפון-מערב'];
  return dirs[Math.round(deg / 45) % 8];
};

// English mirror of WIND_DIRECTION_HE — keep in sync by hand.
const WIND_DIRECTION_EN = (deg: number): string => {
  const dirs = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  return dirs[Math.round(deg / 45) % 8];
};

const WMO_HE: Record<number, string> = {
  0: 'שמיים בהירים', 1: 'בהיר בעיקר', 2: 'מעונן חלקית', 3: 'מעונן',
  45: 'ערפל', 48: 'ערפל קפוא',
  51: 'טפטוף קל', 53: 'טפטוף מתון', 55: 'טפטוף כבד',
  61: 'גשם קל', 63: 'גשם מתון', 65: 'גשם כבד',
  71: 'שלג קל', 73: 'שלג מתון', 75: 'שלג כבד',
  80: 'מקלחות קלות', 81: 'מקלחות מתונות', 82: 'מקלחות סוערות',
  95: 'סופת רעמים', 96: 'סופת רעמים עם ברד', 99: 'סופת רעמים עם ברד כבד',
};

// English mirror of WMO_HE — keep in sync by hand.
const WMO_EN: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Cloudy',
  45: 'Fog', 48: 'Freezing fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
  80: 'Light showers', 81: 'Moderate showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
};

function extractTime(isoString: string | null): string {
  if (!isoString) return '';
  const t = isoString.includes('T') ? isoString.split('T')[1] : isoString;
  return t.substring(0, 5);
}

// GET /api/weather/forecast?gardenId=     (authenticated — preferred)
// GET /api/weather/forecast?lat=&lon=     (legacy — older mobile app versions)
//
// gardenId form: coordinates resolved with the shared fallback chain
// (garden lat/lon → REGION_COORDS[location_region] → Jerusalem) and the
// garden's saved timezone. lat/lon form: timezone=auto.
weatherRouter.get(
  '/forecast',
  (req, res, next) => (req.query.gardenId ? verifyToken(req, res, next) : next()),
  async (req, res) => {
  let lat: number;
  let lon: number;
  let tzParam: string;
  let isExactLocation: boolean;

  const gardenId = typeof req.query.gardenId === 'string' ? req.query.gardenId : null;
  if (gardenId) {
    const { data: garden, error } = await db
      .from('gardens')
      .select('id, latitude, longitude, location_region, timezone')
      .eq('id', gardenId)
      .eq('user_id', req.user!.id)
      .maybeSingle();
    if (error) {
      console.error('[GET /api/weather/forecast] garden lookup failed:', error.message);
      return res.status(500).json({ error: 'Internal error' });
    }
    if (!garden) return res.status(404).json({ error: 'garden_not_found' });

    const resolved = resolveGardenWeatherCoords(garden) ?? REGION_COORDS['default'];
    isExactLocation = garden.latitude != null && garden.longitude != null;
    lat = resolved.lat;
    lon = resolved.lon;
    tzParam = forecastTimezone(isExactLocation, garden.timezone);
  } else {
    lat = parseFloat(req.query.lat as string);
    lon = parseFloat(req.query.lon as string);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }
    isExactLocation = true;
    tzParam = 'auto';
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${tzParam}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return res.json({ ...cached.data, isExactLocation });
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current',
      'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation');
    url.searchParams.set('daily',
      'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,weather_code');
    url.searchParams.set('hourly', 'uv_index');
    url.searchParams.set('timezone', tzParam);
    url.searchParams.set('forecast_days', '2');

    const fetchRes = await fetch(url.toString());
    if (!fetchRes.ok) return res.status(502).json({ error: 'Weather API error' });
    const json = await fetchRes.json() as any;

    const cur = json.current;
    const daily = json.daily;

    const todayCode = daily.weather_code[0] as number;
    const tomorrowCode = daily.weather_code[1] as number;

    const result = {
      timezone: typeof json.timezone === 'string' && json.timezone ? json.timezone : tzParam,
      isExactLocation,
      today: {
        tempCurrent:        Math.round(cur.temperature_2m),
        tempMax:            Math.round(daily.temperature_2m_max[0]),
        tempMin:            Math.round(daily.temperature_2m_min[0]),
        humidity:           Math.round(cur.relative_humidity_2m),
        windSpeed:          Math.round(cur.wind_speed_10m),
        windDirection:      WIND_DIRECTION_EN(cur.wind_direction_10m),
        windDirectionHe:    WIND_DIRECTION_HE(cur.wind_direction_10m),
        uvIndex:            Math.round(daily.uv_index_max[0]),
        precipitationMm:    Math.round((daily.precipitation_sum[0] ?? 0) * 10) / 10,
        rainProbability:    Math.round(daily.precipitation_probability_max[0] ?? 0),
        sunrise:            extractTime(daily.sunrise[0]),
        sunset:             extractTime(daily.sunset[0]),
        weatherDescription:   WMO_EN[todayCode] ?? 'Variable weather',
        weatherDescriptionHe: WMO_HE[todayCode] ?? 'מזג אוויר משתנה',
      },
      tomorrow: {
        tempMax:            Math.round(daily.temperature_2m_max[1]),
        tempMin:            Math.round(daily.temperature_2m_min[1]),
        uvIndex:            Math.round(daily.uv_index_max[1]),
        precipitationMm:    Math.round((daily.precipitation_sum[1] ?? 0) * 10) / 10,
        rainProbability:    Math.round(daily.precipitation_probability_max[1] ?? 0),
        weatherDescription:   WMO_EN[tomorrowCode] ?? 'Variable weather',
        weatherDescriptionHe: WMO_HE[tomorrowCode] ?? 'מזג אוויר משתנה',
      },
    };

    cache.set(cacheKey, { data: result, fetchedAt: Date.now() });
    res.json(result);
  } catch (e) {
    console.error('Weather forecast error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
  },
);
