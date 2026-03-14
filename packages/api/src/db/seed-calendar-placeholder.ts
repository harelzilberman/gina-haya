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

const START_DATE = '2026-03-14';
const TOTAL_DAYS = 60;

// 12 zodiac signs × 2 days each = 24-day cycle
// Distribution per cycle: fruit×6, root×6, flower×6, leaf×6
const ZODIAC_CYCLE = [
  { sign: 'Aries',       signHe: 'טלה',     dayType: 'fruit',  dayTypeHe: 'פרי' },
  { sign: 'Taurus',      signHe: 'שור',      dayType: 'root',   dayTypeHe: 'שורש' },
  { sign: 'Gemini',      signHe: 'תאומים',   dayType: 'flower', dayTypeHe: 'פרח' },
  { sign: 'Cancer',      signHe: 'סרטן',     dayType: 'leaf',   dayTypeHe: 'עלה' },
  { sign: 'Leo',         signHe: 'אריה',     dayType: 'fruit',  dayTypeHe: 'פרי' },
  { sign: 'Virgo',       signHe: 'בתולה',    dayType: 'root',   dayTypeHe: 'שורש' },
  { sign: 'Libra',       signHe: 'מאזניים',  dayType: 'flower', dayTypeHe: 'פרח' },
  { sign: 'Scorpio',     signHe: 'עקרב',     dayType: 'leaf',   dayTypeHe: 'עלה' },
  { sign: 'Sagittarius', signHe: 'קשת',      dayType: 'fruit',  dayTypeHe: 'פרי' },
  { sign: 'Capricorn',   signHe: 'גדי',      dayType: 'root',   dayTypeHe: 'שורש' },
  { sign: 'Aquarius',    signHe: 'דלי',      dayType: 'flower', dayTypeHe: 'פרח' },
  { sign: 'Pisces',      signHe: 'דגים',     dayType: 'leaf',   dayTypeHe: 'עלה' },
] as const;

// Moon phase names
const MOON_PHASES = [
  { max: 3,   name: 'New Moon',         nameHe: 'ירח חדש' },
  { max: 25,  name: 'Waxing Crescent',  nameHe: 'סהר גדל' },
  { max: 32,  name: 'First Quarter',    nameHe: 'רבע ראשון' },
  { max: 50,  name: 'Waxing Gibbous',   nameHe: 'דבשת גדלה' },
  { max: 57,  name: 'Full Moon',        nameHe: 'ירח מלא' },
  { max: 75,  name: 'Waning Gibbous',   nameHe: 'דבשת פוחתת' },
  { max: 82,  name: 'Last Quarter',     nameHe: 'רבע אחרון' },
  { max: 100, name: 'Waning Crescent',  nameHe: 'סהר פוחת' },
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

// Deterministic moosh summaries keyed by dayType + direction
const MOOSH_POOL: Record<string, Record<string, string[]>> = {
  descending: {
    fruit: [
      'הירח היורד מזמין אתכם לשתול עצי פרי ושיחים. הגינה קולטת אנרגיה כלפי מטה — הזמן הטוב ביותר לחזק שורשים.',
      'יום מצוין לשתילת עגבניות, פלפלים ומלפפונים. הירח היורד ממקד את הכוחות בשורשים ובפרי.',
      'שתלו היום ותמצאו שהצמחים קולטים הכול. ירח יורד ביום פרי — שילוב מנצח לגינה חיה.',
    ],
    root: [
      'יום שורש עם ירח יורד — זמן מושלם לשתילת גזר, סלק ותפוח אדמה. הקרקע רעבה לקבל.',
      'הירח יורד ובמזל שורש — מרחו BD 500 הערב לחיזוק מיטבי של הקרקע.',
      'האדמה "נושמת פנימה" היום. שתלו שורשים, הוסיפו קומפוסט, ודאגו לחיידקים הטובים.',
    ],
    flower: [
      'יום פרח עם ירח יורד — שתלו היום פרחים וצמחי תבלין. הם ייקלטו יפה ויפרחו בשפע.',
      'הירח יורד ביום פרח. הגינה שלכם תהנה מנטיעת ורדים, לבנדר וזעתר כיום.',
      'אנרגיית הפרח ממשיכה להתחזק. שתלו ריחניים ופרחי מאכל — הם ייקלטו בצורה יוצאת דופן.',
    ],
    leaf: [
      'הירח יורד ביום עלה — זמן אידיאלי לחסה, תרד ועשבי תיבול. הגינה מוכנה.',
      'שתלו חסה ומנגולד היום — הירח היורד יחזק את העלים ויגדיל את קצב הגדילה.',
      'יום עלה יפה. הגינה מבקשת ירק. ירח יורד — זרעו ישירות לאדמה.',
    ],
  },
  ascending: {
    fruit: [
      'הירח עולה ביום פרי — זמן מצוין לקצור, לקטוף ולהדביק. הפירות בשיאם.',
      'קצרו את הפירות הבשלים היום. האנרגיה עולה לכיוון הפרי — הטעם יהיה בשיאו.',
      'הירח עולה — הגינה "נושמת החוצה". יומיים טובים לקציר ולכריתת ענפים.',
    ],
    root: [
      'ירח עולה ביום שורש — פחות אידיאלי לשתילה, אבל טוב לעריכת קומפוסט ולהכנת קרקע.',
      'הירח עולה — המיצים בצמח עולים. העדיפו לקצור שורשים לאחסון ולא לשתילה חדשה.',
      'יום שורש עם ירח עולה. טוב לעיבוד הקרקע ולהכנת ערוגות לשתילה הבאה.',
    ],
    flower: [
      'הירח עולה ביום פרח — שקעו את הפרחים הפתוחים לתה ולבשמים. האנרגיה בשיאה.',
      'אספו תפרחות ועשבי ריח היום — האנרגיה של הפרח בשיאה עם הירח העולה.',
      'ירח עולה ופרח — זמן טוב לקצירת צמחי מרפא ולייבוש תבלינים.',
    ],
    leaf: [
      'הירח עולה ביום עלה — קצרו חסה ועשבי תיבול בבוקר לשמירת רעננות מרבית.',
      'אספו עלים לסלטים ולשייקים היום. הירח העולה מרכז את האנרגיה בחלקי הצמח האוויריים.',
      'יום עלה מצוין לקציר. הירח עולה — הכוחות בגבעולים ובעלים.',
    ],
  },
};

function getMooshSummary(dayType: string, direction: string, idx: number): string {
  const pool = MOOSH_POOL[direction]?.[dayType] ?? ['יום טוב בגינה. האזינו לצמחים ולאדמה.'];
  return pool[idx % pool.length];
}

// Node blackout periods: (startDay inclusive, endDay inclusive)
const NODE_PERIODS = [
  { start: 8,  end: 9  },
  { start: 36, end: 37 },
];

async function seed() {
  console.log(`🌱 Seeding ${TOTAL_DAYS} days of biodynamic calendar data starting ${START_DATE}...`);

  const rows = [];

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const date = addDays(START_DATE, i);

    // Zodiac: 24-day cycle (2 days per sign × 12 signs)
    const cyclePos = i % 24;
    const signIdx = Math.floor(cyclePos / 2);
    const zodiac = ZODIAC_CYCLE[signIdx];

    // Ascending/descending: flip every 14 days
    const direction = Math.floor(i / 14) % 2 === 0 ? 'descending' : 'ascending';
    const directionHe = direction === 'descending' ? 'ירח יורד' : 'ירח עולה';

    // Node blackout
    const nodePeriod = NODE_PERIODS.find(p => i >= p.start && i <= p.end);
    const nodeActive = !!nodePeriod;
    let nodeBlackoutStart: string | null = null;
    let nodeBlackoutEnd: string | null = null;
    if (nodePeriod) {
      const tz = i < 30 ? '+02:00' : '+03:00'; // Israel winter/summer
      nodeBlackoutStart = addDays(START_DATE, nodePeriod.start) + `T08:00:00${tz}`;
      nodeBlackoutEnd   = addDays(START_DATE, nodePeriod.end + 1) + `T08:00:00${tz}`;
    }

    // Perigee: one 2-day period around day 20
    const perigeeActive = i === 20 || i === 21;

    // Moon phase: 29.5-day cycle; day 0 (2026-03-14) is ~11 days after new moon
    const moonCycleDay = (i + 11) % 30;
    const moonPhasePct = Math.min(100, Math.round((moonCycleDay / 29.5) * 100));
    const moonPhase = getMoonPhase(moonPhasePct);

    // Planting score
    let plantingScore: number;
    let scoreColour: string;
    if (nodeActive) {
      plantingScore = 2;
      scoreColour = 'red';
    } else if (direction === 'descending') {
      plantingScore = i % 2 === 0 ? 9 : 8;
      scoreColour = 'green';
    } else {
      plantingScore = i % 2 === 0 ? 7 : 6;
      scoreColour = 'yellow';
    }

    // BD prep recommendations
    const prep500 = direction === 'descending' && !nodeActive;
    const prep501 = direction === 'ascending' && !nodeActive;

    // Phase transition time (vary by day)
    const tz = i < 30 ? '+02:00' : '+03:00';
    const phaseTransitionHour = 10 + (i % 4);
    const phaseTransitionTime = `${date}T${String(phaseTransitionHour).padStart(2, '0')}:30:00${tz}`;

    // Day type change time: second day of each sign
    const dayTypeChangeTime = cyclePos % 2 === 1
      ? `${date}T14:00:00${tz}`
      : null;

    // Moonrise advances ~50 min per day; base 15:30 on day 0
    const moonriseMin = (15 * 60 + 30 + i * 50) % (24 * 60);
    const moonsetMin  = (moonriseMin + 6 * 60 + 20) % (24 * 60);

    // Moosh summary
    const summaryDirection = nodeActive ? 'ascending' : direction;
    const mooshDailySummary = getMooshSummary(zodiac.dayType, summaryDirection, i);

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
      moosh_daily_summary:     mooshDailySummary,
    });
  }

  // Upsert in batches of 10
  const BATCH = 10;
  for (let b = 0; b < rows.length; b += BATCH) {
    const batch = rows.slice(b, b + BATCH);
    const { error } = await db
      .from('biodynamic_calendar')
      .upsert(batch, { onConflict: 'date' });
    if (error) {
      console.error('Insert error at batch', b, error);
      process.exit(1);
    }
    console.log(`  ✓ Days ${b + 1}–${Math.min(b + BATCH, rows.length)}`);
  }

  console.log(`\n✅ Done — ${TOTAL_DAYS} days seeded.`);
  console.log(`   Fruit: ${rows.filter(r => r.day_type === 'fruit').length} days`);
  console.log(`   Root:  ${rows.filter(r => r.day_type === 'root').length} days`);
  console.log(`   Flower:${rows.filter(r => r.day_type === 'flower').length} days`);
  console.log(`   Leaf:  ${rows.filter(r => r.day_type === 'leaf').length} days`);
  console.log(`   Node blackout: ${rows.filter(r => r.node_active).length} days`);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
