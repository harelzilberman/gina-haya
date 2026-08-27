export interface ChupChuMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  // Set on assistant messages for successful image-recognition turns.
  // Absent on text turns and when the recognition_history insert fails.
  recognition_id?: string;
  recognition_photo_key?: string | null;
  // Survives history restore — true when this recognition was produced by a
  // retry (prevents the client offering a second retry on a retry-result card).
  is_retry?: boolean;
  // The user-supplied correction hint that seeded this retry, if any.
  // Stored here so the client can display it on restored history cards.
  user_hint?: string | null;
  // Prose summary built at write time from the JSON mini-card.
  // Model-input readers (historyForClaude, buildPastContextSummary, convText)
  // prefer this over content so Claude receives prose instead of raw JSON.
  // content is never modified — Flutter card detection depends on it.
  summary?: string;
}

export interface ChupChuContext {
  gardenName: string | null;
  locationRegion: string | null;
  soilType: string | null;
  plants: string[];
  todayCalendar: {
    ascendingDescending: string;
    nodeActive: boolean;
    nodeBlackoutEnd: string | null;
    dayType: string;
    moonSign: string;
    plantingScore: number;
    scoreColour: string;
    prep500Recommended: boolean;
    prep501Recommended: boolean;
    perigeeActive: boolean;
  } | null;
  userLanguage: 'he' | 'en';
  gardenMap?: {
    hasMap: boolean;
    northAngle: number;
    objectCount: number;
    bedCount: number;
    treeCount: number;
    fruitTrees: string[];
    plantCount: number;
    plantNames: string[];
  } | null;
  weather?: {
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
    locationRegion: string;
  } | null;
}
