// ── Chupchu "Garden facts" block ─────────────────────────────────────────────
//
// A short, authoritative block in Chupchu's system prompt: where the garden
// is, its hemisphere, the local date/time there and the current season.
// Testing showed that location facts buried in the per-user context were
// ignored on the first answer (Israeli-season advice for a Sydney garden), so
// this block has its own loud heading and an explicit rule attached.
//
// Placement: AFTER the cached system blocks, uncached (see askChupChu in
// services/claude.ts). It changes every minute, so it carries the local time
// to the minute.

import { getGardenSeason, type GardenSeason } from '@gina-haya/shared';
import { REGION_COORDS, FALLBACK_TIMEZONE } from './weather';

/** A garden's biodynamic day for its own local today (variant row). */
export interface GardenCalendarToday {
  dayType: string;
  dayTypeHe: string;
  direction: string;   // 'ascending' | 'descending' (hemisphere rule applied)
  directionHe: string;
}

export interface GardenFactsInput {
  id: string;
  name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  location_name?: string | null;
  location_region?: string | null;
}

interface ResolvedGardenFacts {
  id: string;
  name: string | null;
  place: string | null;
  /** True when the place is an Israeli region centroid rather than a saved location. */
  approximate: boolean;
  timezone: string | null;
  season: GardenSeason | null;
  localTime: string | null; // "HH:MM"
  /** Local date with weekday, in the prompt language (e.g. "Thursday 12 November 2026"). */
  localDateLong: string | null;
}

const MAX_GARDENS_LISTED = 6;

function localTime(now: Date, timeZone: string | null): string | null {
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(now);
  } catch {
    return null;
  }
}

/**
 * Full local date with weekday. The weekday matters: Chupchu once used
 * Israel's weekday for a Sydney garden that was already a day ahead.
 */
function localDateLong(now: Date, timeZone: string | null, lang: 'he' | 'en'): string | null {
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', {
      timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(now);
  } catch {
    return null;
  }
}

function resolveFacts(g: GardenFactsInput, now: Date, lang: 'he' | 'en'): ResolvedGardenFacts {
  const id = g.id;
  const name = g.name?.trim() || null;
  const hasCoords = g.latitude != null && g.longitude != null && Number.isFinite(Number(g.latitude));

  if (hasCoords) {
    const tz = g.timezone?.trim() || null;
    return {
      id,
      name,
      place: g.location_name?.trim() || null,
      approximate: false,
      timezone: tz,
      season: getGardenSeason(Number(g.latitude), now, tz),
      localTime: localTime(now, tz),
      localDateLong: localDateLong(now, tz, lang),
    };
  }

  // Legacy gardens: Israeli region only → region centroid, Israel time.
  const region = g.location_region?.trim();
  if (region && region !== 'default' && REGION_COORDS[region]) {
    return {
      id,
      name,
      place: lang === 'he' ? `${region}, ישראל` : `${region} region, Israel`,
      approximate: true,
      timezone: FALLBACK_TIMEZONE,
      season: getGardenSeason(REGION_COORDS[region].lat, now, FALLBACK_TIMEZONE),
      localTime: localTime(now, FALLBACK_TIMEZONE),
      localDateLong: localDateLong(now, FALLBACK_TIMEZONE, lang),
    };
  }

  return { id, name, place: null, approximate: false, timezone: null, season: null, localTime: null, localDateLong: null };
}

function factLines(f: ResolvedGardenFacts, lang: 'he' | 'en', isCurrent: boolean, showCurrentMarker: boolean): string[] {
  const lines: string[] = [];
  if (lang === 'he') {
    const marker = showCurrentMarker && isCurrent ? ' (הגינה של השיחה הזו)' : '';
    lines.push(`- גינה: ${f.name ?? 'ללא שם'}${marker}`);
    if (!f.season) {
      lines.push(`  מיקום: לא ידוע — המיקום של הגינה לא הוגדר. חצי הכדור והעונה לא ידועים.`);
      return lines;
    }
    lines.push(`  מקום: ${f.place ?? 'לא ידוע (נשמרו קואורדינטות בלבד)'}${f.approximate ? ' (משוער, לפי אזור)' : ''}`);
    lines.push(`  חצי כדור: ${f.season.hemisphereLabel.he}`);
    const date = f.localDateLong ?? f.season.localDate;
    const when = f.localTime ? `${date}, ${f.localTime}` : date;
    lines.push(`  תאריך ושעה מקומיים בגינה: ${when}${f.timezone ? ` (${f.timezone})` : ''}`);
    lines.push(`  עונה נוכחית בגינה: ${f.season.seasonLabel.he}`);
  } else {
    const marker = showCurrentMarker && isCurrent ? ' (the garden this conversation is about)' : '';
    lines.push(`- Garden: ${f.name ?? 'unnamed'}${marker}`);
    if (!f.season) {
      lines.push(`  Location: unknown — the garden's location has not been set. Hemisphere and season are unknown.`);
      return lines;
    }
    lines.push(`  Place: ${f.place ?? 'unknown (coordinates only)'}${f.approximate ? ' (approximate, by region)' : ''}`);
    lines.push(`  Hemisphere: ${f.season.hemisphereLabel.en}`);
    const date = f.localDateLong ?? f.season.localDate;
    const when = f.localTime ? `${date}, ${f.localTime}` : date;
    lines.push(`  Local date and time at the garden: ${when}${f.timezone ? ` (${f.timezone})` : ''}`);
    lines.push(`  Current season at the garden: ${f.season.seasonLabel.en}`);
  }
  return lines;
}

/**
 * Build the "Garden facts" block for the top of Chupchu's system prompt.
 *
 * @param currentGarden  The garden this conversation resolved to (may be null).
 * @param allGardens     All of the user's gardens (light rows), used to detect
 *                       gardens in different hemispheres.
 * @param gardenCalendars Each garden's biodynamic day for its own local today
 *                       (by garden id). Listed by garden name when they differ.
 */
export function buildGardenFactsBlock(
  currentGarden: GardenFactsInput | null,
  allGardens: GardenFactsInput[],
  lang: 'he' | 'en',
  now: Date = new Date(),
  gardenCalendars: Map<string, GardenCalendarToday> = new Map(),
): string {
  const current = currentGarden ? resolveFacts(currentGarden, now, lang) : null;
  const others = allGardens
    .filter(g => g.id !== currentGarden?.id)
    .map(g => resolveFacts(g, now, lang));

  const hemispheres = new Set(
    [current, ...others].filter((f): f is ResolvedGardenFacts => !!f?.season).map(f => f.season!.hemisphere),
  );
  const mixedHemispheres = hemispheres.size > 1;
  // List every garden when they straddle hemispheres, or when no single garden
  // was resolved for this conversation.
  const listAll = mixedHemispheres || (!current && others.length > 0);

  const entries: { facts: ResolvedGardenFacts; isCurrent: boolean }[] = [];
  if (current) entries.push({ facts: current, isCurrent: true });
  if (listAll) entries.push(...others.slice(0, MAX_GARDENS_LISTED - entries.length).map(facts => ({ facts, isCurrent: false })));

  const anyKnown = entries.some(e => e.facts.season);
  const anyUnknown = entries.length === 0 || entries.some(e => !e.facts.season);
  const multiple = entries.length > 1;

  // Gardens whose own "today" differs in day type or asc/desc (another
  // timezone or hemisphere) are each named with their calendar day.
  const calendarDiffers = new Set(
    [...gardenCalendars.values()].map(c => `${c.dayType}|${c.direction}`),
  ).size > 1;
  const nameOf = new Map(allGardens.map(g => [g.id, g.name?.trim() || null]));
  const calendarLines = (l: 'he' | 'en'): string[] => {
    if (!calendarDiffers) return [];
    const rows = [...gardenCalendars.entries()].map(([id, c]) => {
      const n = nameOf.get(id) ?? (l === 'he' ? 'ללא שם' : 'unnamed');
      return l === 'he'
        ? `- ${n}: יום ${c.dayTypeHe}, ירח ${c.directionHe}`
        : `- ${n}: ${c.dayType} day, ${c.direction} moon`;
    });
    return [
      l === 'he'
        ? `היום הביודינמי של כל גינה היום (לפי התאריך המקומי שלה) — הם שונים, אז ציין לאיזו גינה העצה מתייחסת:`
        : `Each garden's biodynamic day today (by its own local date) — they differ, so say which garden the advice is for:`,
      ...rows,
    ];
  };

  const out: string[] = [];
  if (lang === 'he') {
    out.push(`## עובדות הגינה — מקור קובע, גובר על כל הנחת ברירת מחדל לגבי ישראל או העונה`);
    out.push(`אלה עובדות מאומתות על מיקום הגינה, הזמן בה והעונה בה. הן גוברות על כל הנחה אחרת בהנחיה זו.`);
    out.push(`כל עצה על שתילה, זריעה, גיזום ועונתיות **חייבת** להתאים לעובדות האלה — לפי העונה וחצי הכדור של הגינה, לא לפי התאריך בישראל. לעולם אל תניח ישראל או אקלים ים-תיכוני, אלא אם כתוב כאן שהגינה בישראל.`);
    if (entries.length === 0) {
      out.push(`- אין למשתמש גינה עם מיקום ידוע. חצי הכדור והעונה לא ידועים.`);
    } else {
      for (const e of entries) out.push(...factLines(e.facts, 'he', e.isCurrent, multiple));
    }
    out.push(...calendarLines('he'));
    out.push(`בחצי הכדור הדרומי, עולה/יורד לפי המוסכמה האנטיפודית — הפוך מחצי הכדור הצפוני. ערכי הלוח שמסופקים כבר מותאמים לכך.`);
    if (mixedHemispheres) {
      out.push(`למשתמש יש גינות בחצאי כדור שונים. כשהעצה תלויה בעונה ולא ברור לאיזו גינה הוא מתכוון — שאל קודם לאיזו גינה הכוונה.`);
    } else if (!current && multiple) {
      out.push(`לא ידוע לאיזו גינה מתייחסת השיחה. כשזה משנה לעצה — שאל לאיזו גינה הכוונה.`);
    }
    if (anyUnknown) {
      out.push(anyKnown
        ? `לגינה שמיקומה לא ידוע — אל תניח מיקום. מותר לשאול פעם אחת, בעדינות, איפה היא נמצאת (או להציע להגדיר מיקום בהגדרות הגינה).`
        : `המיקום לא ידוע — אל תניח מיקום ואל תניח ישראל. מותר לשאול פעם אחת, בעדינות, איפה הגינה נמצאת (או להציע להגדיר מיקום בהגדרות הגינה), ולתת בינתיים עצה כללית שלא תלויה בעונה.`);
    }
  } else {
    out.push(`## GARDEN FACTS — authoritative, overrides any default assumption about Israel or season`);
    out.push(`Verified facts about where the garden is, its local time and its season. They override any other assumption in this prompt.`);
    out.push(`All planting, sowing, pruning and seasonal advice **MUST** follow these facts — the garden's own season and hemisphere, not the date in Israel. Never assume Israel or a Mediterranean climate unless these facts say the garden is in Israel.`);
    if (entries.length === 0) {
      out.push(`- The user has no garden with a known location. Hemisphere and season are unknown.`);
    } else {
      for (const e of entries) out.push(...factLines(e.facts, 'en', e.isCurrent, multiple));
    }
    out.push(...calendarLines('en'));
    out.push(`In the southern hemisphere, ascending/descending follows the Antipodean convention (reversed from the north). The calendar values supplied are already adjusted.`);
    if (mixedHemispheres) {
      out.push(`The user has gardens in different hemispheres. When advice depends on the season and it is not clear which garden they mean, ask which garden first.`);
    } else if (!current && multiple) {
      out.push(`It is not known which garden this conversation is about. When it matters for the advice, ask which garden they mean.`);
    }
    if (anyUnknown) {
      out.push(anyKnown
        ? `For a garden whose location is unknown, do not assume one. You may ask once, gently, where it is (or suggest setting the location in the garden settings).`
        : `The location is unknown — do not assume one, and do not assume Israel. You may ask once, gently, where the garden is (or suggest setting the location in the garden settings), and meanwhile give general advice that does not depend on the season.`);
    }
  }
  return out.join('\n');
}
