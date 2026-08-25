/**
 * Unit tests for the garden_timeline feature:
 *   1. execute-tool log_bd_prep handler logic
 *   2. Block 3 volatile context: gardenTimelineSection builder
 *
 * Self-contained — no DB or server required. Uses in-process mock clients.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/gardenTimeline.test.ts
 */

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  assert(actual === expected, `${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

// ── log_bd_prep handler (extracted logic, no Express dependency) ──────────────

interface HandlerDeps {
  db: any;
  userId: string;
  params: { prep_name: string; date: string };
  gardenId?: string | null;
}

async function runLogBdPrepHandler(
  deps: HandlerDeps,
): Promise<{ status: number; body: Record<string, any> }> {
  const { db, userId, params, gardenId } = deps;
  let resStatus = 200;
  let resBody: Record<string, any> = {};

  let bdGardenId: string | null = gardenId ?? null;
  if (!bdGardenId) {
    const { data: userRow } = await db
      .from('users')
      .select('active_garden_id')
      .eq('id', userId)
      .single();
    bdGardenId = userRow?.active_garden_id ?? null;
  }
  if (!bdGardenId) {
    return { status: 400, body: { error: 'no_garden' } };
  }

  const { error: bdInsertError } = await db.from('garden_timeline').insert({
    garden_id:  bdGardenId,
    user_id:    userId,
    event_type: 'bd_prep',
    event_date: params.date,
    prep_name:  params.prep_name,
    created_at: new Date().toISOString(),
  });
  if (bdInsertError) {
    return { status: 500, body: { error: 'insert_failed' } };
  }

  return { status: 200, body: { success: true } };
}

// ── gardenTimelineSection builder (extracted from chupchu.ts §8c) ─────────────

interface TimelineRow {
  event_type:  string;
  prep_name:   string | null;
  event_date:  string;
  time_of_day: string | null;
}

function buildGardenTimelineSection(
  rows:  TimelineRow[] | null,
  error: any,
  lang:  'he' | 'en',
  today: Date,
): string {
  if (error) return '';
  if (!rows || rows.length === 0) return '';

  const seen = new Set<string>();
  const deduped: TimelineRow[] = [];
  for (const row of rows) {
    const key = `${row.event_type}:${row.prep_name ?? ''}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(row); }
  }

  const todayBase = new Date(today);
  todayBase.setHours(0, 0, 0, 0);

  const formatRow = (row: TimelineRow): string => {
    const daysAgo = Math.round(
      (todayBase.getTime() - new Date(row.event_date).getTime()) / 86_400_000,
    );
    const daysStr = daysAgo === 0
      ? (lang === 'he' ? 'היום'   : 'today')
      : daysAgo === 1
        ? (lang === 'he' ? 'אתמול' : 'yesterday')
        : (lang === 'he' ? `לפני ${daysAgo} ימים` : `${daysAgo} days ago`);

    const timeStr  = row.time_of_day ? ` (${row.time_of_day})` : '';
    const label    = ({
      bd_prep:        { he: 'פרפרט',           en: 'BD prep'         },
      compost_turn:   { he: 'הפיכת קומפוסט',   en: 'compost turned'  },
      bed_prep:       { he: 'הכנת ערוגה',       en: 'bed prepared'    },
      cover_crop:     { he: 'זבל ירוק',         en: 'cover crop sown' },
      mulching:       { he: 'חיפוי קרקע',       en: 'mulching'        },
      pest_treatment: { he: 'טיפול בהדברה',     en: 'pest treatment'  },
    } as Record<string, { he: string; en: string }>)[row.event_type]?.[lang] ?? row.event_type;

    const prepPart = row.prep_name ? ` ${row.prep_name}` : '';
    return `${label}${prepPart}: ${row.event_date} (${daysStr})${timeStr}`;
  };

  const lines = deduped.slice(0, 6).map(formatRow);
  return lang === 'he'
    ? `## אירועי גינה אחרונים\n${lines.join('\n')}`
    : `## Recent Garden Events\n${lines.join('\n')}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// [1] Successful write with explicit gardenId
console.log('\n[1] log_bd_prep — successful write with explicit gardenId');
(async () => {
  let insertedRow: any = null;
  const db = {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq:     () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
        insert: (row: any) => {
          if (table === 'garden_timeline') insertedRow = row;
          return chain;
        },
        then: (resolve: (v: any) => any) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return chain;
    },
  };
  const result = await runLogBdPrepHandler({
    db, userId: 'user-1', gardenId: 'garden-1',
    params: { prep_name: '500', date: '2026-08-25' },
  });
  assertEqual(result.status,            200,       '[1] returns 200');
  assert(result.body.success === true,             '[1] body.success is true');
  assertEqual(insertedRow?.garden_id,  'garden-1', '[1] garden_id written');
  assertEqual(insertedRow?.event_type, 'bd_prep',  '[1] event_type = bd_prep');
  assertEqual(insertedRow?.prep_name,  '500',       '[1] prep_name written');
  assertEqual(insertedRow?.event_date, '2026-08-25','[1] event_date written');
})();

// [2] Falls back to users.active_garden_id when gardenId absent
console.log('\n[2] log_bd_prep — falls back to active_garden_id');
(async () => {
  let insertedGardenId: string | null = null;
  const db = {
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: { active_garden_id: 'garden-from-user' }, error: null,
              }),
            }),
          }),
        };
      }
      const chain: any = {
        insert: (row: any) => { insertedGardenId = row.garden_id; return chain; },
        then:   (resolve: (v: any) => any) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return chain;
    },
  };
  const result = await runLogBdPrepHandler({
    db, userId: 'user-2', gardenId: null,
    params: { prep_name: '501', date: '2026-08-25' },
  });
  assertEqual(result.status,   200,              '[2] returns 200');
  assertEqual(insertedGardenId,'garden-from-user','[2] used active_garden_id');
})();

// [3] No garden resolved → 400
console.log('\n[3] log_bd_prep — no garden → 400');
(async () => {
  const db = {
    from: (_: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { active_garden_id: null }, error: null }),
        }),
      }),
    }),
  };
  const result = await runLogBdPrepHandler({
    db, userId: 'user-3', gardenId: null,
    params: { prep_name: '500', date: '2026-08-25' },
  });
  assertEqual(result.status, 400, '[3] returns 400 when no garden resolved');
})();

// [4] DB insert error → 500
console.log('\n[4] log_bd_prep — DB insert error → 500');
(async () => {
  const db = {
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { active_garden_id: 'garden-1' }, error: null }),
            }),
          }),
        };
      }
      // garden_timeline — simulate PGRST204 (table absent) or any insert failure
      const chain: any = {
        insert: () => chain,
        then: (resolve: (v: any) => any) =>
          Promise.resolve({
            data: null,
            error: { message: 'relation "garden_timeline" does not exist', code: 'PGRST204' },
          }).then(resolve),
      };
      return chain;
    },
  };
  const result = await runLogBdPrepHandler({
    db, userId: 'user-4', gardenId: 'garden-1',
    params: { prep_name: '500', date: '2026-08-25' },
  });
  assertEqual(result.status, 500,         '[4] returns 500 on insert error');
  assert('error' in result.body,          '[4] body has error field');
})();

// [5] Block 3 — table absent (error from DB) → empty string
console.log('\n[5] Block 3 — table absent error → empty string');
{
  const section = buildGardenTimelineSection(
    null,
    { code: 'PGRST204', message: 'relation "garden_timeline" does not exist' },
    'he',
    new Date('2026-08-25'),
  );
  assertEqual(section, '', '[5] empty string when error present');
}

// [6] Block 3 — empty rows → empty string
console.log('\n[6] Block 3 — empty rows → empty string');
{
  const section = buildGardenTimelineSection([], null, 'en', new Date('2026-08-25'));
  assertEqual(section, '', '[6] empty string when no rows');
}

// [7] Block 3 — correct English format, days-ago, dedup
console.log('\n[7] Block 3 — English format, days-ago, dedup');
{
  const today = new Date('2026-08-25');
  const rows: TimelineRow[] = [
    { event_type: 'bd_prep',     prep_name: '500', event_date: '2026-08-10', time_of_day: 'dusk' },
    { event_type: 'bd_prep',     prep_name: '500', event_date: '2026-07-01', time_of_day: null  }, // dup
    { event_type: 'bd_prep',     prep_name: '501', event_date: '2026-08-01', time_of_day: 'dawn' },
    { event_type: 'mulching',    prep_name: null,  event_date: '2026-08-20', time_of_day: null  },
    { event_type: 'compost_turn',prep_name: null,  event_date: '2026-08-25', time_of_day: null  },
  ];
  const section = buildGardenTimelineSection(rows, null, 'en', today);
  assert(section.startsWith('## Recent Garden Events'),     '[7] English header');
  assert(section.includes('BD prep 500: 2026-08-10 (15 days ago) (dusk)'), '[7] 500 with days+time');
  assert(section.includes('BD prep 501: 2026-08-01 (24 days ago) (dawn)'), '[7] 501 with time');
  assert(section.includes('mulching: 2026-08-20 (5 days ago)'),            '[7] mulching no time');
  assert(section.includes('compost turned: 2026-08-25 (today)'),           '[7] today label');
  assert(!section.includes('2026-07-01'),                                  '[7] dup 500 dropped');
  const fiveHundredLines = section.split('\n').filter(l => l.includes('BD prep 500'));
  assertEqual(fiveHundredLines.length, 1, '[7] 500 appears exactly once');
}

// [8] Block 3 — Hebrew format
console.log('\n[8] Block 3 — Hebrew format');
{
  const today = new Date('2026-08-25');
  const rows: TimelineRow[] = [
    { event_type: 'bd_prep',  prep_name: '500', event_date: '2026-08-24', time_of_day: 'dusk' },
    { event_type: 'mulching', prep_name: null,  event_date: '2026-08-25', time_of_day: null  },
  ];
  const section = buildGardenTimelineSection(rows, null, 'he', today);
  assert(section.startsWith('## אירועי גינה אחרונים'), '[8] Hebrew header');
  assert(section.includes('פרפרט 500:'),               '[8] Hebrew prep label');
  assert(section.includes('אתמול'),                    '[8] yesterday in Hebrew');
  assert(section.includes('חיפוי קרקע:'),              '[8] Hebrew mulching label');
  assert(section.includes('היום'),                     '[8] today in Hebrew');
}

// [9] Block 3 — caps at 6 lines
console.log('\n[9] Block 3 — caps at 6 lines');
{
  const today = new Date('2026-08-25');
  const rows: TimelineRow[] = [
    { event_type: 'bd_prep',       prep_name: '500',          event_date: '2026-08-20', time_of_day: null },
    { event_type: 'bd_prep',       prep_name: '501',          event_date: '2026-08-19', time_of_day: null },
    { event_type: 'bd_prep',       prep_name: '508',          event_date: '2026-08-18', time_of_day: null },
    { event_type: 'bd_prep',       prep_name: 'compost',      event_date: '2026-08-17', time_of_day: null },
    { event_type: 'bd_prep',       prep_name: 'green_manure', event_date: '2026-08-16', time_of_day: null },
    { event_type: 'compost_turn',  prep_name: null,           event_date: '2026-08-15', time_of_day: null },
    { event_type: 'mulching',      prep_name: null,           event_date: '2026-08-14', time_of_day: null }, // 7th
  ];
  const section = buildGardenTimelineSection(rows, null, 'en', today);
  const lines = section.split('\n').slice(1); // skip header
  assertEqual(lines.length, 6, '[9] exactly 6 lines');
  assert(!section.includes('mulching'), '[9] 7th entry excluded');
}

// ── Summary ───────────────────────────────────────────────────────────────────

setTimeout(() => {
  console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) {
    console.error('SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('All tests passed.');
  }
}, 200);
