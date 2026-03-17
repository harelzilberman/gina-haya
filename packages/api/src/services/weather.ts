const REGION_COORDS: Record<string, { lat: number; lon: number }> = {
  'צפון':     { lat: 32.9,  lon: 35.5  },
  'גליל':     { lat: 32.9,  lon: 35.5  },
  'מרכז':     { lat: 32.08, lon: 34.78 },
  'תל אביב':  { lat: 32.08, lon: 34.78 },
  'ירושלים':  { lat: 31.78, lon: 35.22 },
  'דרום':     { lat: 31.25, lon: 34.79 },
  'שפלה':     { lat: 31.75, lon: 34.95 },
  'שרון':     { lat: 32.31, lon: 34.87 },
  'נגב':      { lat: 30.6,  lon: 34.8  },
  'ערבה':     { lat: 29.5,  lon: 35.0  },
  'default':  { lat: 31.78, lon: 35.22 },
};

const WEATHER_CODE_HE: Record<number, string> = {
  0: 'שמיים בהירים',
  1: 'בעיקר מעונן', 2: 'בעיקר מעונן', 3: 'בעיקר מעונן',
  45: 'ערפל', 48: 'ערפל',
  51: 'טפטוף קל', 53: 'טפטוף קל', 55: 'טפטוף קל',
  61: 'גשם', 63: 'גשם', 65: 'גשם',
  71: 'שלג', 73: 'שלג', 75: 'שלג',
  80: 'גשמי סתיו', 81: 'גשמי סתיו', 82: 'גשמי סתיו',
  95: 'סופת רעמים',
};

const WEATHER_CODE_EN: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly cloudy', 2: 'Mainly cloudy', 3: 'Mainly cloudy',
  45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Light drizzle', 55: 'Light drizzle',
  61: 'Rain', 63: 'Rain', 65: 'Rain',
  71: 'Snow', 73: 'Snow', 75: 'Snow',
  80: 'Showers', 81: 'Showers', 82: 'Showers',
  95: 'Thunderstorm',
};

export interface WeatherData {
  locationRegion: string;
  tempMax: number;
  tempMin: number;
  tempCurrent: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  precipitationMm: number;
  willRainToday: boolean;
  willRainTomorrow: boolean;
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  weatherDescription: string;
  weatherDescriptionHe: string;
}

// Simple in-memory cache: key → { data, fetchedAt }
const cache = new Map<string, { data: WeatherData; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function extractTime(isoOrTime: string | null | undefined): string {
  if (!isoOrTime) return '';
  // Handles both "2024-06-01T05:43" and "05:43"
  const match = isoOrTime.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : isoOrTime.slice(0, 5);
}

export async function fetchWeatherForRegion(
  locationRegion: string | null
): Promise<WeatherData | null> {
  const region = locationRegion ?? 'default';
  const coords = REGION_COORDS[region] ?? REGION_COORDS['default'];

  const cacheKey = `${coords.lat},${coords.lon}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ...cached.data, locationRegion: region };
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',  String(coords.lat));
    url.searchParams.set('longitude', String(coords.lon));
    url.searchParams.set('daily',     'temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset,moonrise,moonset');
    url.searchParams.set('hourly',    'temperature_2m,relative_humidity_2m,wind_speed_10m');
    url.searchParams.set('current',   'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code');
    url.searchParams.set('timezone',  'Asia/Jerusalem');
    url.searchParams.set('forecast_days', '2');

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const json = await res.json() as any;
    const cur   = json.current;
    const daily = json.daily;

    const code = cur.weather_code as number;

    const data: WeatherData = {
      locationRegion:        region,
      tempCurrent:           Math.round(cur.temperature_2m * 10) / 10,
      humidity:              Math.round(cur.relative_humidity_2m),
      windSpeed:             Math.round(cur.wind_speed_10m * 10) / 10,
      tempMax:               Math.round(daily.temperature_2m_max[0] * 10) / 10,
      tempMin:               Math.round(daily.temperature_2m_min[0] * 10) / 10,
      uvIndex:               Math.round(daily.uv_index_max[0] * 10) / 10,
      precipitationMm:       Math.round((daily.precipitation_sum[0] ?? 0) * 10) / 10,
      willRainToday:         (daily.precipitation_sum[0] ?? 0) > 0,
      willRainTomorrow:      (daily.precipitation_sum[1] ?? 0) > 0,
      sunrise:               extractTime(daily.sunrise[0]),
      sunset:                extractTime(daily.sunset[0]),
      moonrise:              extractTime(daily.moonrise[0]),
      moonset:               extractTime(daily.moonset[0]),
      weatherDescriptionHe:  WEATHER_CODE_HE[code] ?? 'מזג אוויר משתנה',
      weatherDescription:    WEATHER_CODE_EN[code] ?? 'Variable weather',
    };

    cache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}
