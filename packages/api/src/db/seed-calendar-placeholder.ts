import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Start date: always today
const START_DATE = new Date().toISOString().slice(0, 10);
const TOTAL_DAYS = 365;

// Zodiac cycle with 2-3 days per sign (alternating 3, 2)
// Total cycle length: 6×3 + 6×2 = 30 days
const ZODIAC_CYCLE = [
  { sign: 'Aries',       signHe: 'טלה',     dayType: 'fruit',  dayTypeHe: 'פרי',  days: 3 },
  { sign: 'Taurus',      signHe: 'שור',      dayType: 'root',   dayTypeHe: 'שורש', days: 2 },
  { sign: 'Gemini',      signHe: 'תאומים',   dayType: 'flower', dayTypeHe: 'פרח',  days: 3 },
  { sign: 'Cancer',      signHe: 'סרטן',     dayType: 'leaf',   dayTypeHe: 'עלה',  days: 2 },
  { sign: 'Leo',         signHe: 'אריה',     dayType: 'fruit',  dayTypeHe: 'פרי',  days: 3 },
  { sign: 'Virgo',       signHe: 'בתולה',    dayType: 'root',   dayTypeHe: 'שורש', days: 2 },
  { sign: 'Libra',       signHe: 'מאזניים',  dayType: 'flower', dayTypeHe: 'פרח',  days: 3 },
  { sign: 'Scorpio',     signHe: 'עקרב',     dayType: 'leaf',   dayTypeHe: 'עלה',  days: 2 },
  { sign: 'Sagittarius', signHe: 'קשת',      dayType: 'fruit',  dayTypeHe: 'פרי',  days: 3 },
  { sign: 'Capricorn',   signHe: 'גדי',      dayType: 'root',   dayTypeHe: 'שורש', days: 2 },
  { sign: 'Aquarius',    signHe: 'דלי',      dayType: 'flower', dayTypeHe: 'פרח',  days: 3 },
  { sign: 'Pisces',      signHe: 'דגים',     dayType: 'leaf',   dayTypeHe: 'עלה',  days: 2 },
] as const;

// Build cycle map: position-in-30-day-cycle → sign index
// Also build sign start positions for dayInSign calculation
const CYCLE_MAP: number[] = [];
const SIGN_START: number[] = [];
{
  let pos = 0;
  for (let s = 0; s < ZODIAC_CYCLE.length; s++) {
    SIGN_START.push(pos);
    for (let d = 0; d < ZODIAC_CYCLE[s].days; d++) {
      CYCLE_MAP.push(s);
    }
    pos += ZODIAC_CYCLE[s].days;
  }
}
const CYCLE_LEN = CYCLE_MAP.length; // 30

// Moon phase names
const MOON_PHASES = [
  { max: 3,   name: 'New Moon',        nameHe: 'ירח חדש' },
  { max: 25,  name: 'Waxing Crescent', nameHe: 'סהר גדל' },
  { max: 32,  name: 'First Quarter',   nameHe: 'רבע ראשון' },
  { max: 50,  name: 'Waxing Gibbous',  nameHe: 'דבשת גדלה' },
  { max: 57,  name: 'Full Moon',       nameHe: 'ירח מלא' },
  { max: 75,  name: 'Waning Gibbous',  nameHe: 'דבשת פוחתת' },
  { max: 82,  name: 'Last Quarter',    nameHe: 'רבע אחרון' },
  { max: 100, name: 'Waning Crescent', nameHe: 'סהר פוחת' },
];

function getMoonPhase(pct: number) {
  return MOON_PHASES.find(p => pct <= p.max) ?? MOON_PHASES[MOON_PHASES.length - 1];
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Short ChupChu summaries by day type
const CHUPCHU_SUMMARIES: Record<string, string> = {
  fruit:  'יום פרי — הזמן האידיאלי לשתילת עגבניות, מלפפונים ופלפלים',
  root:   'יום שורש — שתול גזר, סלק ובצל היום',
  flower: 'יום פרח — מצוין לשתילת פרחים ועשבי תיבול',
  leaf:   'יום עלה — זמן טוב לגיזום וקציר ירקות עלים',
  node:   'יום צומת — נח לגינה, הימנע משתילה וקציר',
};

// 3 node blackout periods (each 2 days) spread across the year
const NODE_PERIODS = [
  { start: 55,  end: 56  },  // ~2 months in
  { start: 175, end: 176 },  // ~6 months in
  { start: 300, end: 301 },  // ~10 months in
];

// Perigee: two consecutive days, roughly every 29 days
const PERIGEE_DAYS = new Set<number>();
for (let p = 20; p < TOTAL_DAYS; p += 29) {
  PERIGEE_DAYS.add(p);
  PERIGEE_DAYS.add(p + 1);
}

async function seed() {
  console.log(`🌱 Seeding ${TOTAL_DAYS} days of biodynamic calendar data starting ${START_DATE}...`);

  // Delete all existing calendar data
  console.log('🗑️  Deleting existing calendar data...');
  const { error: delError } = await db
    .from('biodynamic_calendar')
    .delete()
    .gte('date', '2000-01-01');
  if (delError) {
    console.error('Delete error:', delError);
    process.exit(1);
  }
  console.log('  ✓ Existing data cleared');

  const rows = [];

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = addDays(START_DATE, i);

    // Sign from 30-day cycle; compute day-within-sign for change time
    const cyclePos  = i % CYCLE_LEN;
    const signIdx   = CYCLE_MAP[cyclePos];
    const zodiac    = ZODIAC_CYCLE[signIdx];
    const dayInSign = cyclePos - SIGN_START[signIdx];

    // Ascending/descending: flip every 14 days
    const direction   = Math.floor(i / 14) % 2 === 0 ? 'descending' : 'ascending';
    const directionHe = direction === 'descending' ? 'ירח יורד' : 'ירח עולה';

    // Node blackout
    const nodePeriod       = NODE_PERIODS.find(p => i >= p.start && i <= p.end);
    const nodeActive       = !!nodePeriod;
    let nodeBlackoutStart: string | null = null;
    let nodeBlackoutEnd:   string | null = null;
    if (nodePeriod) {
      // Rough Israel DST: switch at ~90 days (end of March) and ~270 days (end of October)
      const tz = (i < 90 || i >= 270) ? '+02:00' : '+03:00';
      nodeBlackoutStart = addDays(START_DATE, nodePeriod.start) + `T08:00:00${tz}`;
      nodeBlackoutEnd   = addDays(START_DATE, nodePeriod.end + 1) + `T08:00:00${tz}`;
    }

    // Perigee
    const perigeeActive = PERIGEE_DAYS.has(i);

    // Moon phase: 29.5-day cycle; offset 11 days so day 0 is mid-cycle
    const moonCycleDay = (i + 11) % 30;
    const moonPhasePct = Math.min(100, Math.round((moonCycleDay / 29.5) * 100));
    const moonPhase    = getMoonPhase(moonPhasePct);

    // Planting score
    let plantingScore: number;
    let scoreColour: string;
    if (nodeActive) {
      plantingScore = 2;
      scoreColour   = 'red';
    } else if (direction === 'descending') {
      plantingScore = i % 2 === 0 ? 9 : 8;
      scoreColour   = 'green';
    } else {
      plantingScore = i % 2 === 0 ? 7 : 6;
      scoreColour   = 'yellow';
    }

    // BD prep recommendations
    const prep500 = direction === 'descending' && !nodeActive;
    const prep501 = direction === 'ascending'  && !nodeActive;

    // Phase transition time (varies by day)
    const tz = (i < 90 || i >= 270) ? '+02:00' : '+03:00';
    const phaseTransitionHour = 10 + (i % 4);
    const phaseTransitionTime = `${date}T${String(phaseTransitionHour).padStart(2, '0')}:30:00${tz}`;

    // Day type change time: non-null from the 2nd day within each sign onwards
    const dayTypeChangeTime = dayInSign > 0 ? `${date}T14:00:00${tz}` : null;

    // Moonrise advances ~50 min per day; base 15:30 on day 0
    const moonriseMin = (15 * 60 + 30 + i * 50) % (24 * 60);
    const moonsetMin  = (moonriseMin + 6 * 60 + 20) % (24 * 60);

    // ChupChu daily summary
    const chupChuDailySummary = nodeActive
      ? CHUPCHU_SUMMARIES.node
      : (CHUPCHU_SUMMARIES[zodiac.dayType] ?? CHUPCHU_SUMMARIES.fruit);


    rows.push({
      date,
      ascending_descending:    direction,
      ascending_descending_he: directionHe,
      phase_transition_time:   phaseTransitionTime,
      node_active:             nodeActive,
      node_blackout_start:     nodeBlackoutStart,
      node_blackout_end:       nodeBlackoutEnd,
      perigee_active:          perigeeActive,
      prep_500_recommended:    prep500,
      prep_501_recommended:    prep501,
      moon_sign:               zodiac.sign,
      moon_sign_he:            zodiac.signHe,
      day_type:                zodiac.dayType,
      day_type_he:             zodiac.dayTypeHe,
      day_type_change_time:    dayTypeChangeTime,
      moon_phase_pct:          moonPhasePct,
      moon_phase_name:         moonPhase.name,
      moon_phase_name_he:      moonPhase.nameHe,
      planting_score:          plantingScore,
      score_colour:            scoreColour,
      moonrise_time:           formatTime(moonriseMin),
      moonset_time:            formatTime(moonsetMin),
      mon_daily_summary:     chupChuDailySummary,
    });
  }

  // Insert in batches of 30
  const BATCH = 30;
  for (let b = 0; b < rows.length; b += BATCH) {
    const batch = rows.slice(b, b + BATCH);
    const { error } = await db
      .from('biodynamic_calendar')
      .insert(batch);
    if (error) {
      console.error('Insert error at batch', b, error);
      process.exit(1);
    }
    console.log(`  ✓ Days ${b + 1}–${Math.min(b + BATCH, rows.length)}`);
  }

  console.log(`\n✅ Done — ${TOTAL_DAYS} days seeded from ${START_DATE}.`);
  console.log(`   Fruit:         ${rows.filter(r => r.day_type === 'fruit').length} days`);
  console.log(`   Root:          ${rows.filter(r => r.day_type === 'root').length} days`);
  console.log(`   Flower:        ${rows.filter(r => r.day_type === 'flower').length} days`);
  console.log(`   Leaf:          ${rows.filter(r => r.day_type === 'leaf').length} days`);
  console.log(`   Node blackout: ${rows.filter(r => r.node_active).length} days`);
  console.log(`   Perigee:       ${rows.filter(r => r.perigee_active).length} days`);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
