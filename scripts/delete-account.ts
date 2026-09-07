/**
 * Account deletion tool — storage-first, verified, dry-run by default.
 *
 * Usage:
 *   pnpm exec tsx scripts/delete-account.ts <email-or-uuid>            # dry run, deletes nothing
 *   pnpm exec tsx scripts/delete-account.ts <email-or-uuid> --confirm  # performs the deletion
 *
 * Order of operations:
 *   1. Resolve the user (email or UUID → id, email, created_at)
 *   2. Preflight: verify migration 038 is applied via pg_constraint + information_schema
 *   3. Coverage assertion: verify every known user-data table is in the inventory
 *   4. Existence check: every table in the inventory must be reachable — hard error if not
 *   5. Inventory: count rows in every user-owned table and storage objects per bucket
 *   6. Enumerate storage objects under {userId}/ in both buckets (recursive, paginated)
 *   7. Remove storage objects in batches of ≤1000, verify each batch
 *   8. Verify storage is empty — abort before DB step if anything remains
 *   9. Hard-delete the auth.users row via admin.deleteUser (cascades to public.users → …)
 *  10. Post-verify: re-count all tables, assert user_subscriptions.user_id is NULL not the old id
 *  11. Print final verdict and copy-pasteable deletion record
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// Load env from packages/api/.env — same pattern as seed-new-plants.ts
dotenv.config({ path: path.resolve(__dirname, '../packages/api/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'ERROR: Missing env vars. Check packages/api/.env\n' +
    `  SUPABASE_URL: ${SUPABASE_URL ? '✓' : '✗ MISSING'}\n` +
    `  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗ MISSING'}`
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// pg pool for raw SQL (preflight, coverage assertion).
// DATABASE_URL may be absent or contain unfilled placeholders — test before constructing.
function makePool(): Pool | null {
  if (!DATABASE_URL) return null;
  if (DATABASE_URL.includes('[') || DATABASE_URL.includes('<')) return null;
  try { new URL(DATABASE_URL); } catch { return null; }
  return new Pool({ connectionString: DATABASE_URL, max: 1 });
}
const pool = makePool();

const BUCKETS = ['tracker-photos', 'journal-photos'] as const;
const BATCH_SIZE = 1000;

// ── Table inventory ────────────────────────────────────────────────────────────
//
// Each entry describes ONE table that may hold data belonging to the deleted user.
//
// 'after':
//   cascade  = should be 0 rows for this user after auth.users is deleted
//   set_null = rows survive but user_id is nulled (intentional — listed separately below)
//   orphaned = no FK, rows survive with old user_id (intentional — listed separately below)
//
// 'count':
//   direct         = table has a user_id column; count with .eq('user_id', userId)
//   via_gardens    = no user_id; count via garden_id IN (gardens where user_id = ?)
//   via_checkins   = no user_id; count via tracker_id IN (plant_trackers where user_id = ?)
//   via_journal    = no user_id; count via entry_id IN (journal_entries where user_id = ?)
//                    journal_entries is not in PostgREST schema — falls back to total count
//
// Tables below that are NOT listed here are accounted for in INTENTIONALLY_RETAINED or noted
// in KNOWN_USER_COLUMN_TABLES (for coverage assertion).

const TABLE_INVENTORY: ReadonlyArray<{
  table:   string;
  after:   'cascade' | 'set_null' | 'orphaned';
  count:   'direct' | 'via_gardens' | 'via_checkins' | 'via_journal';
  note?:   string;
}> = [
  // ── Direct user_id — cascade ──────────────────────────────────────────────
  { table: 'gardens',               after: 'cascade',  count: 'direct'       },
  { table: 'plant_trackers',        after: 'cascade',  count: 'direct'       },
  { table: 'plant_tracker_checkins',after: 'cascade',  count: 'direct'       },
  { table: 'plant_timeline',        after: 'cascade',  count: 'direct'       },
  { table: 'chupchu_conversations', after: 'cascade',  count: 'direct'       },
  { table: 'chupchu_memory',        after: 'cascade',  count: 'direct'       },
  { table: 'vision_uses',           after: 'cascade',  count: 'direct'       },
  { table: 'chat_uses',             after: 'cascade',  count: 'direct'       },
  { table: 'recognition_history',   after: 'cascade',  count: 'direct'       },
  { table: 'user_credits',          after: 'cascade',  count: 'direct'       },
  { table: 'user_purchases',        after: 'cascade',  count: 'direct'       },
  { table: 'garden_tasks',          after: 'cascade',  count: 'direct'       },
  { table: 'push_subscriptions',    after: 'cascade',  count: 'direct'       },
  { table: 'notification_settings', after: 'cascade',  count: 'direct'       },
  { table: 'garden_maps',           after: 'cascade',  count: 'direct'       },
  // ── Parent-linked — cascade ───────────────────────────────────────────────
  { table: 'garden_plants',         after: 'cascade',  count: 'via_gardens',
    note: 'no user_id; linked via gardens.user_id → garden_plants.garden_id' },
  { table: 'journal_photos',        after: 'cascade',  count: 'via_journal',
    note: 'no user_id; linked via journal_entries → journal_photos.entry_id (journal_entries not in PostgREST schema — total count used)' },
  // ── SET NULL (rows survive, user_id nulled) ───────────────────────────────
  { table: 'user_subscriptions',    after: 'set_null', count: 'direct'       },
  { table: 'api_usage',             after: 'set_null', count: 'direct'       },
  { table: 'garden_timeline',       after: 'set_null', count: 'direct'       },
  // ── Orphaned (no FK, rows survive with old user_id) ───────────────────────
  { table: 'deletion_audit_log',    after: 'orphaned', count: 'direct'       },
] as const;

// Tables deliberately NOT in TABLE_INVENTORY, with reason.
// These appear in the INTENTIONALLY RETAINED section of the report.
const INTENTIONALLY_RETAINED: Record<string, string> = {
  // Subscription history is retained for accounting; user_id is SET NULL by migration 038.
  // Already covered by the user_subscriptions row above (after: set_null).
  // Listed here so the coverage assertion knows to skip duplicates.
  'api_usage':
    'SET NULL — cost-audit log, billing reconciliation requires retention without user link',
  'garden_timeline':
    'SET NULL — biodynamic history retained for aggregate analytics; user_id nulled',
  'user_subscriptions':
    'SET NULL — subscription/payment history retained for accounting; user_id nulled',
  'deletion_audit_log':
    'no FK — admin audit trail; stale user_id expected and harmless (currently 0 rows)',
};

// All public tables known from code audit to have a direct user_id column (or equivalent).
// Used for the coverage assertion in dry-run mode.
// Maintained manually — if DATABASE_URL is available, this is cross-checked against
// information_schema.columns live; otherwise a static check is performed.
const KNOWN_USER_COLUMN_TABLES = new Set([
  'gardens', 'plant_trackers', 'plant_tracker_checkins', 'plant_timeline',
  'chupchu_conversations', 'chupchu_memory', 'vision_uses', 'chat_uses',
  'recognition_history', 'user_credits', 'user_purchases', 'garden_tasks',
  'push_subscriptions', 'notification_settings', 'garden_maps',
  'user_subscriptions', 'api_usage', 'garden_timeline', 'deletion_audit_log',
  // parent-linked (no direct user_id but user data lives here)
  'garden_plants', 'journal_photos',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function supabaseErrorMsg(error: any): string {
  if (!error) return '(no error)';
  return error.message || error.details || error.hint || JSON.stringify(error);
}

/**
 * Safely join a storage prefix and an item name, never producing a leading slash.
 * Supabase .list('', ...) at the root level returns item names with no prefix to prepend.
 */
function joinPath(prefix: string, name: string): string {
  const p = prefix === '' ? name : `${prefix}/${name}`;
  if (p.startsWith('/') || p.includes('//')) {
    throw new Error(`[storage] Invalid path constructed: "${p}" (prefix="${prefix}", name="${name}")`);
  }
  return p;
}

/**
 * Recursively list all objects under a storage prefix.
 * .list() is NOT recursive — folder entries have id === null.
 * Paginates with limit=1000 until a short page confirms we have everything.
 *
 * Uses joinPath() to prevent leading-slash paths when prefix is empty.
 */
async function listAllObjects(
  bucket: string,
  prefix: string
): Promise<Array<{ fullPath: string; size: number }>> {
  const results: Array<{ fullPath: string; size: number }> = [];
  const queue: string[] = [prefix];

  while (queue.length > 0) {
    const currentPrefix = queue.shift()!;
    let offset = 0;

    while (true) {
      const { data, error } = await db.storage
        .from(bucket)
        .list(currentPrefix, { limit: 1000, offset });

      if (error) {
        throw new Error(
          `[storage] list("${bucket}", "${currentPrefix}" offset=${offset}) failed: ${supabaseErrorMsg(error)}`
        );
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const fullPath = joinPath(currentPrefix, item.name);
        if (item.id === null) {
          // Folder entry — recurse into it
          queue.push(fullPath);
        } else {
          results.push({ fullPath, size: (item.metadata as any)?.size ?? 0 });
        }
      }

      if (data.length < 1000) break; // last page
      offset += 1000;
    }
  }

  return results;
}

// ── Table existence check ─────────────────────────────────────────────────────

/**
 * Check whether a table is accessible via PostgREST.
 *
 * PostgREST has a specific failure mode: when a table is not in its schema cache,
 * a HEAD/count query returns {count: null, error: null} — no error, just a null count.
 * This looks like "0 rows" to naive code but is actually "table not found."
 *
 * Observed behaviour per table type:
 *   Real table in schema    → count = N (integer ≥ 0), error = null  ← OK
 *   Not in schema cache     → count = null,            error = null  ← MUST CATCH
 *   Non-existent relation   → count = null,            error = {...} ← caught by error check
 *
 * We run the probe with .limit(0) (no row data returned) but check both error AND count.
 * A null count with no error is treated as "not in PostgREST schema cache."
 *
 * Returns null on success, or an error string on failure.
 */
async function probeTable(table: string): Promise<string | null> {
  const { count, error } = await db
    .from(table as any)
    .select('*', { count: 'exact', head: true })
    .limit(0);

  if (error) {
    return `${error.code ?? 'ERR'}: ${supabaseErrorMsg(error)}`;
  }
  if (count === null) {
    // PostgREST returns {count: null, error: null} for tables not in its schema cache.
    // This is indistinguishable from a broken table at the API level — treat as unreachable.
    return 'SCHEMA_CACHE_MISS: count=null with no error — table not in PostgREST schema cache';
  }
  return null;
}

// ── Counting helpers ──────────────────────────────────────────────────────────

/**
 * Count rows where user_id = userId. Errors hard if the query fails or returns
 * a null count with no error (PostgREST schema-cache silent failure).
 */
async function countDirect(table: string, userId: string): Promise<number> {
  const { count, error } = await db
    .from(table as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[db] count(${table}.user_id=${userId}) failed: ${supabaseErrorMsg(error)}`);
  }
  if (count === null) {
    // PostgREST returns {count: null, error: null} for tables not in schema cache.
    // This is the failure-that-reports-success: it looks like "0 rows" but is actually
    // "table not queryable." We treat it as a hard error.
    throw new Error(
      `[db] count(${table}) returned null count with no error — ` +
      'table is likely not in PostgREST schema cache (PGRST205). ' +
      'Verify the table name and check for schema cache staleness.'
    );
  }
  return count;
}

/**
 * Count garden_plants for a user, routed through gardens.
 * garden_plants has no user_id column; ownership is via garden_id → gardens.user_id.
 */
async function countViaGardens(userId: string): Promise<number> {
  const { data: gardenRows, error: gardenErr } = await db
    .from('gardens' as any)
    .select('id')
    .eq('user_id', userId);

  if (gardenErr) {
    throw new Error(`[db] count(garden_plants) gardens lookup failed: ${supabaseErrorMsg(gardenErr)}`);
  }

  const gardenIds = (gardenRows ?? []).map((g: any) => g.id as string);
  if (gardenIds.length === 0) return 0;

  const { count, error } = await db
    .from('garden_plants' as any)
    .select('*', { count: 'exact', head: true })
    .in('garden_id', gardenIds);

  if (error) {
    throw new Error(`[db] count(garden_plants via garden_ids) failed: ${supabaseErrorMsg(error)}`);
  }
  if (count === null) {
    throw new Error('[db] count(garden_plants) returned null count — table may not be in PostgREST schema cache');
  }
  return count;
}

/**
 * Count journal_photos for a user.
 * journal_photos has no user_id; it links via entry_id → journal_entries.
 * journal_entries is NOT in the PostgREST schema cache (PGRST205), so we cannot
 * filter by user. Falls back to a total count of all journal_photos and notes the
 * limitation. Post-verify: compare total before/after rather than user-specific count.
 */
async function countJournalPhotos(): Promise<{ count: number; isTotal: boolean }> {
  const { count, error } = await db
    .from('journal_photos' as any)
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`[db] count(journal_photos) failed: ${supabaseErrorMsg(error)}`);
  }
  if (count === null) {
    throw new Error('[db] count(journal_photos) returned null — table not in PostgREST schema cache');
  }
  return { count, isTotal: true };
}

// ── Dispatch counting by strategy ─────────────────────────────────────────────

async function countForInventory(
  entry: typeof TABLE_INVENTORY[number],
  userId: string
): Promise<{ count: number; isTotal: boolean }> {
  if (entry.count === 'direct') {
    return { count: await countDirect(entry.table, userId), isTotal: false };
  }
  if (entry.count === 'via_gardens') {
    return { count: await countViaGardens(userId), isTotal: false };
  }
  if (entry.count === 'via_journal') {
    return countJournalPhotos();
  }
  throw new Error(`Unknown count strategy: ${(entry as any).count}`);
}

// ── Step 1: resolve user ──────────────────────────────────────────────────────

async function resolveUser(arg: string): Promise<{ id: string; email: string; created_at: string }> {
  if (isUuid(arg)) {
    const { data, error } = await db.auth.admin.getUserById(arg);
    if (error) throw new Error(`getUserById failed: ${supabaseErrorMsg(error)}`);
    if (!data?.user) throw new Error(`No auth.users row for id=${arg}`);
    return {
      id:         data.user.id,
      email:      data.user.email ?? '(no email)',
      created_at: data.user.created_at,
    };
  }

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${supabaseErrorMsg(error)}`);

  const matches = (data?.users ?? []).filter(u => u.email === arg);
  if (matches.length === 0) throw new Error(`No auth.users row with email="${arg}"`);
  if (matches.length > 1)   throw new Error(`Multiple auth.users rows with email="${arg}" — use UUID`);

  const u = matches[0];
  return { id: u.id, email: u.email ?? '(no email)', created_at: u.created_at };
}

// ── Step 2: preflight FK check ────────────────────────────────────────────────

async function preflightFK(): Promise<void> {
  if (!pool) {
    console.warn(
      '[preflight] DATABASE_URL not usable — cannot query pg_constraint directly.\n' +
      '            If migration 038 is not applied, deletion will fail at auth.deleteUser\n' +
      '            with a foreign-key violation on user_subscriptions.'
    );
    return;
  }

  const client = await pool.connect();
  try {
    const fkResult = await client.query<{ conname: string; confdeltype: string }>(`
      select conname, confdeltype
      from pg_constraint
      where conrelid = 'public.user_subscriptions'::regclass
        and contype = 'f'
        and conname = 'user_subscriptions_user_id_fkey'
    `);

    if (fkResult.rows.length === 0) {
      throw new Error(
        'PREFLIGHT FAILED: FK user_subscriptions_user_id_fkey not found.\n' +
        'Run: select conname, confdeltype from pg_constraint\n' +
        '     where conrelid = \'public.user_subscriptions\'::regclass and contype = \'f\';'
      );
    }

    const { conname, confdeltype } = fkResult.rows[0];
    if (confdeltype !== 'n') {
      const typeNames: Record<string, string> = {
        a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT',
      };
      throw new Error(
        `PREFLIGHT FAILED: ${conname} has confdeltype='${confdeltype}' (${typeNames[confdeltype] ?? confdeltype}).\n` +
        'Expected n (SET NULL). Apply migration 038_user_subscriptions_set_null.sql.'
      );
    }
    console.log(`[preflight] ${conname}: confdeltype='n' (SET NULL) ✓`);

    const colResult = await client.query<{ is_nullable: string }>(`
      select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'user_subscriptions' and column_name = 'user_id'
    `);

    if (colResult.rows.length === 0) {
      throw new Error('PREFLIGHT FAILED: user_subscriptions.user_id not found in information_schema.');
    }
    if (colResult.rows[0].is_nullable !== 'YES') {
      throw new Error(
        'PREFLIGHT FAILED: user_subscriptions.user_id is still NOT NULL.\n' +
        'SET NULL cannot fire against a NOT NULL column. Apply migration 038 fully.'
      );
    }
    console.log('[preflight] user_subscriptions.user_id is nullable ✓');
  } finally {
    client.release();
  }
}

// ── Step 3: coverage assertion ────────────────────────────────────────────────

async function coverageAssertion(): Promise<boolean> {
  console.log('');
  console.log('── Coverage assertion ────────────────────────────────────');

  const inventoryTables = new Set(TABLE_INVENTORY.map(e => e.table));
  const retainedTables  = new Set(Object.keys(INTENTIONALLY_RETAINED));

  let liveUserColumnTables: Set<string> | null = null;

  // If we have a direct DB connection, query information_schema for all public tables
  // that have a user_id / owner_id / created_by / user_uuid column.
  if (pool) {
    const client = await pool.connect();
    try {
      const result = await client.query<{ table_name: string }>(`
        select distinct table_name
        from information_schema.columns
        where table_schema = 'public'
          and column_name in ('user_id', 'owner_id', 'created_by', 'user_uuid')
        order by table_name
      `);
      liveUserColumnTables = new Set(result.rows.map(r => r.table_name));
      console.log(`  Queried information_schema: ${liveUserColumnTables.size} tables with user columns`);
    } finally {
      client.release();
    }
  } else {
    console.log('  DATABASE_URL not usable — using hardcoded KNOWN_USER_COLUMN_TABLES for coverage check');
    liveUserColumnTables = KNOWN_USER_COLUMN_TABLES;
  }

  // Any table with user data that is neither in the inventory nor intentionally retained is uncovered.
  const uncovered: string[] = [];
  for (const t of liveUserColumnTables) {
    if (!inventoryTables.has(t) && !retainedTables.has(t)) {
      uncovered.push(t);
    }
  }

  if (uncovered.length > 0) {
    console.log('');
    console.log('  ✗ UNCOVERED TABLES — these hold user data but are absent from the inventory:');
    for (const t of uncovered) console.log(`      ${t}`);
    console.log('');
    console.log(
      '  Add each table to TABLE_INVENTORY with the correct count strategy and after-deletion\n' +
      '  expectation, or to INTENTIONALLY_RETAINED with a one-line explanation.'
    );
    return false; // caller must exit non-zero
  }

  // Report intentionally retained tables
  console.log('  Intentionally retained (not cascade-deleted by design):');
  for (const [t, reason] of Object.entries(INTENTIONALLY_RETAINED)) {
    console.log(`    ${pad(t, 24)} ${reason}`);
  }

  console.log('  Coverage ✓ — no uncovered tables');
  return true;
}

// ── Step 4: table existence check ─────────────────────────────────────────────

async function checkTableExistence(): Promise<boolean> {
  console.log('');
  console.log('── Table existence ───────────────────────────────────────');

  let allOk = true;
  for (const { table } of TABLE_INVENTORY) {
    const err = await probeTable(table);
    if (err) {
      console.log(`  ✗ ${table}: NOT REACHABLE — ${err}`);
      allOk = false;
    } else {
      console.log(`  ✓ ${table}`);
    }
  }

  if (!allOk) {
    console.log('');
    console.log(
      'ERROR: One or more inventory tables are not reachable via PostgREST.\n' +
      'A missing table must be a hard error — never rendered as "0 rows".\n' +
      'Fix the table list before running a deletion.'
    );
  }
  return allOk;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: pnpm exec tsx scripts/delete-account.ts <email-or-uuid> [--confirm]\n' +
      '  Without --confirm: dry run, prints inventory and exits.\n' +
      '  With    --confirm: performs the deletion.'
    );
    process.exit(1);
  }

  const target  = args[0];
  const confirm = args.includes('--confirm');
  const runAt   = new Date().toISOString();

  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  delete-account.ts  ${confirm ? '⚠️  LIVE RUN' : '(dry run)'}`);
  console.log(`  Started: ${runAt}`);
  console.log('══════════════════════════════════════════════════════════');

  // ── 1. Resolve user ───────────────────────────────────────────────────────
  let user: { id: string; email: string; created_at: string };
  try {
    user = await resolveUser(target);
  } catch (err: any) {
    console.error(`ERROR resolving user: ${err.message}`);
    process.exit(1);
  }

  console.log('');
  console.log('User resolved:');
  console.log(`  id:         ${user.id}`);
  console.log(`  email:      ${user.email}`);
  console.log(`  created_at: ${user.created_at}`);

  // ── 2. Preflight FK ───────────────────────────────────────────────────────
  console.log('');
  console.log('── Preflight ─────────────────────────────────────────────');
  try {
    await preflightFK();
  } catch (err: any) {
    console.error(`\nERROR: ${err.message}`);
    process.exit(1);
  }

  // ── 3. Coverage assertion ─────────────────────────────────────────────────
  const coverageOk = await coverageAssertion();
  if (!coverageOk) {
    console.error('\nAborting: fix UNCOVERED TABLES before proceeding.');
    if (pool) await pool.end();
    process.exit(1);
  }

  // ── 4. Table existence check ──────────────────────────────────────────────
  const existenceOk = await checkTableExistence();
  if (!existenceOk) {
    if (pool) await pool.end();
    process.exit(1);
  }

  // ── 5. Inventory ──────────────────────────────────────────────────────────
  console.log('');
  console.log('── Inventory ─────────────────────────────────────────────');

  const beforeCounts:   Record<string, number>  = {};
  const isTotalCount:   Record<string, boolean> = {};

  for (const entry of TABLE_INVENTORY) {
    const { count, isTotal } = await countForInventory(entry, user.id);
    beforeCounts[entry.table]  = count;
    isTotalCount[entry.table]  = isTotal;
  }

  // Store garden IDs before deletion — needed for garden_plants post-verify
  const { data: gardenRowsBefore } = await db
    .from('gardens' as any).select('id').eq('user_id', user.id);
  const gardenIdsBefore = (gardenRowsBefore ?? []).map((g: any) => g.id as string);

  // Storage inventory
  const beforeStorage: Record<string, number> = {};
  for (const bucket of BUCKETS) {
    const objects = await listAllObjects(bucket, user.id);
    beforeStorage[bucket] = objects.length;
  }

  // Print inventory table
  console.log('');
  console.log(pad('Table', 30) + pad('Rows', 8) + 'After deletion');
  console.log('-'.repeat(80));
  for (const entry of TABLE_INVENTORY) {
    const n    = beforeCounts[entry.table];
    const tot  = isTotalCount[entry.table];
    const label = tot ? `${n} (total)` : String(n);
    const afterLabel =
      entry.after === 'cascade'  ? 'expect 0' :
      entry.after === 'set_null' ? 'rows survive with null user_id' :
                                   'orphaned (no FK — rows survive with old user_id)';
    const noteStr = entry.note ? `  [${entry.note}]` : '';
    console.log(pad(entry.table, 30) + pad(label, 12) + afterLabel + noteStr);
  }
  console.log('');
  for (const bucket of BUCKETS) {
    console.log(`  storage/${bucket}: ${beforeStorage[bucket]} objects`);
  }

  if (!confirm) {
    console.log('');
    console.log('Dry run complete. Re-run with --confirm to perform deletion.');
    if (pool) await pool.end();
    process.exit(0);
  }

  // ── 6. Enumerate storage ──────────────────────────────────────────────────
  console.log('');
  console.log('── Storage enumeration ───────────────────────────────────');

  const storageObjects: Record<string, string[]> = {};

  for (const bucket of BUCKETS) {
    console.log(`  Enumerating ${bucket}/${user.id}/...`);
    const objects = await listAllObjects(bucket, user.id);
    storageObjects[bucket] = objects.map(o => o.fullPath);
    console.log(`  Found ${objects.length} objects (inventory said ${beforeStorage[bucket]})`);

    if (objects.length !== beforeStorage[bucket]) {
      console.error(
        `\nERROR: enumeration count (${objects.length}) ≠ inventory count (${beforeStorage[bucket]}) ` +
        `for "${bucket}". Data changed between steps. Aborting before any deletion.`
      );
      if (pool) await pool.end();
      process.exit(1);
    }
  }

  // ── 7. Remove storage (batched ≤1000) ─────────────────────────────────────
  console.log('');
  console.log('── Storage removal ───────────────────────────────────────');

  for (const bucket of BUCKETS) {
    const paths = storageObjects[bucket];
    if (paths.length === 0) { console.log(`  ${bucket}: no objects, skipping`); continue; }

    let totalRemoved = 0;
    let totalFailed  = 0;

    for (let i = 0; i < paths.length; i += BATCH_SIZE) {
      const batch = paths.slice(i, i + BATCH_SIZE);
      console.log(`  ${bucket}: removing batch [${i + 1}–${i + batch.length}] of ${paths.length}...`);

      const { data: removedList, error: removeError } = await db.storage
        .from(bucket)
        .remove(batch);

      if (removeError) {
        console.error(
          `\nERROR: storage.remove failed for "${bucket}" (batch ${i + 1}–${i + batch.length}):\n` +
          `  ${supabaseErrorMsg(removeError)}\n` +
          'Aborting — DB has not been touched.'
        );
        if (pool) await pool.end();
        process.exit(1);
      }

      const removedSet = new Set((removedList ?? []).map((o: any) => o.name));
      const missing    = batch.filter(p => !removedSet.has(p));
      if (missing.length > 0) {
        console.warn(`  WARNING: ${missing.length} paths not confirmed in response:`);
        for (const p of missing) console.warn(`    ${p}`);
        totalFailed += missing.length;
      }
      totalRemoved += (removedList ?? []).length;
    }

    console.log(`  ${bucket}: ${totalRemoved} confirmed, ${totalFailed} unconfirmed`);

    if (totalFailed > 0) {
      console.error(
        `\nERROR: ${totalFailed} object(s) in "${bucket}" not confirmed removed.\n` +
        'Aborting before DB step to avoid orphaned files.'
      );
      if (pool) await pool.end();
      process.exit(1);
    }
  }

  // ── 8. Verify storage is empty ────────────────────────────────────────────
  console.log('');
  console.log('── Storage verification ──────────────────────────────────');

  for (const bucket of BUCKETS) {
    const remaining = await listAllObjects(bucket, user.id);
    if (remaining.length > 0) {
      console.error(
        `\nERROR: ${remaining.length} object(s) remain in "${bucket}" after removal:\n` +
        remaining.slice(0, 10).map(o => `  ${o.fullPath}`).join('\n') +
        (remaining.length > 10 ? `\n  ...and ${remaining.length - 10} more` : '') + '\n' +
        'Aborting before DB step.'
      );
      if (pool) await pool.end();
      process.exit(1);
    }
    console.log(`  ${bucket}: verified empty ✓`);
  }

  // ── 9. Delete auth user (hard delete, soft=false) ─────────────────────────
  console.log('');
  console.log('── Deleting auth.users row ───────────────────────────────');
  console.log(`  admin.deleteUser(${user.id}, softDelete=false)...`);

  const { error: deleteError } = await db.auth.admin.deleteUser(user.id, false);

  if (deleteError) {
    console.error(
      `\nERROR: admin.deleteUser failed: ${supabaseErrorMsg(deleteError)}\n` +
      'Storage was already removed. The auth row still exists. Investigate and retry.'
    );
    if (pool) await pool.end();
    process.exit(1);
  }

  console.log('  auth.users row deleted ✓ (DB cascades fired)');

  // ── 10. Post-verify ───────────────────────────────────────────────────────
  console.log('');
  console.log('── Post-deletion verification ────────────────────────────');
  console.log('');
  console.log(pad('Table', 30) + pad('Before', 10) + pad('After', 10) + 'Result');
  console.log('-'.repeat(85));

  let anyFailure = false;

  for (const entry of TABLE_INVENTORY) {
    const before = beforeCounts[entry.table];

    let afterCount: number;
    let afterNote = '';

    if (entry.count === 'direct') {
      // For set_null tables: check rows still carrying old user_id (should be 0 after SET NULL)
      afterCount = await countDirect(entry.table, user.id);
    } else if (entry.count === 'via_gardens') {
      // Gardens are gone — count garden_plants for previously-known garden IDs
      if (gardenIdsBefore.length === 0) {
        afterCount = 0;
      } else {
        const { count: gpc, error: gpErr } = await db
          .from('garden_plants' as any)
          .select('*', { count: 'exact', head: true })
          .in('garden_id', gardenIdsBefore);
        if (gpErr) throw new Error(`post-verify garden_plants: ${supabaseErrorMsg(gpErr)}`);
        afterCount = gpc ?? 0;
      }
    } else {
      // via_journal: total count comparison
      const { count: jpAfter } = await countJournalPhotos();
      afterCount = jpAfter;
      afterNote  = '(total — user-specific not verifiable)';
    }

    let result: string;
    if (entry.after === 'cascade') {
      if (afterCount === 0) {
        result = `✓ cleared${afterNote ? ' ' + afterNote : ''}`;
      } else {
        result = `✗ FAIL: ${afterCount} row(s) remain${afterNote ? ' ' + afterNote : ''}`;
        anyFailure = true;
      }
    } else if (entry.after === 'set_null') {
      if (afterCount === 0) {
        result = '✓ SET NULL fired — old user_id gone';
      } else {
        result = `✗ FAIL: ${afterCount} row(s) still carry old user_id`;
        anyFailure = true;
      }
    } else {
      result = afterCount > 0
        ? `⚠  ${afterCount} row(s) retained (no FK — expected)`
        : '✓ no rows';
    }

    const beforeLabel = isTotalCount[entry.table] ? `${before}(T)` : String(before);
    const afterLabel  = entry.count === 'via_journal' ? `${afterCount}(T)` : String(afterCount);
    console.log(pad(entry.table, 30) + pad(beforeLabel, 10) + pad(afterLabel, 10) + result);
  }

  // Storage post-check
  console.log('');
  for (const bucket of BUCKETS) {
    const remaining = await listAllObjects(bucket, user.id);
    if (remaining.length === 0) {
      console.log(`  storage/${bucket}: ✓ empty`);
    } else {
      console.log(`  storage/${bucket}: ✗ FAIL: ${remaining.length} objects remain`);
      anyFailure = true;
    }
  }

  // ── 11. Final verdict ─────────────────────────────────────────────────────
  const totalStorageRemoved = Object.values(beforeStorage).reduce((a, b) => a + b, 0);
  const tablesCleared = TABLE_INVENTORY.filter(
    ({ table, after }) => after === 'cascade' && beforeCounts[table] > 0
  ).length;

  console.log('');
  console.log('══════════════════════════════════════════════════════════');

  if (anyFailure) {
    console.log(`FAILED  ${user.id} — manual follow-up required (see ✗ rows above)`);
    if (pool) await pool.end();
    process.exit(1);
  }

  const verdict =
    `DELETED ${user.id} — ` +
    `${totalStorageRemoved} storage objects removed, ` +
    `${tablesCleared} table(s) cascade-cleared`;

  console.log(verdict);
  console.log('══════════════════════════════════════════════════════════');

  // Copy-pasteable deletion record
  console.log('');
  console.log('── Deletion record ───────────────────────────────────────');
  console.log(`Date:    ${runAt}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Email:   ${user.email}`);
  console.log(`Result:  ${verdict}`);
  console.log(`Storage: tracker-photos=${beforeStorage['tracker-photos']}, journal-photos=${beforeStorage['journal-photos']}`);
  console.log('──────────────────────────────────────────────────────────');

  if (pool) await pool.end();
}

main().catch((err) => {
  console.error('\nUNHANDLED ERROR:', err);
  process.exit(1);
});
