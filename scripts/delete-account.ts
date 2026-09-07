/**
 * Account deletion tool — storage-first, verified, dry-run by default.
 *
 * Usage:
 *   pnpm exec tsx scripts/delete-account.ts <email-or-uuid>            # dry run, deletes nothing
 *   pnpm exec tsx scripts/delete-account.ts <email-or-uuid> --confirm  # performs the deletion
 *
 * Requires DATABASE_URL in packages/api/.env (Postgres connection string).
 * The script will not start without it — the FK preflight and coverage assertion
 * both require a live database connection and cannot fall back to anything else.
 *
 * Order of operations:
 *   0. Verify DATABASE_URL connects (hard exit if not — before any other work)
 *   1. Resolve the user (email or UUID → id, email, created_at)
 *   2. Preflight: query pg_constraint to assert migration 038 is applied
 *   3. Coverage assertion: query information_schema.columns for uncovered user-data tables
 *   4. Existence check: every inventory table must be reachable via PostgREST
 *   5. Inventory: count rows per table and storage objects per bucket
 *   6. Enumerate storage under {userId}/ in both buckets (recursive, paginated)
 *   7. Remove storage in batches of ≤1000, verify each batch
 *   8. Verify storage is empty — abort before DB step if anything remains
 *   9. Hard-delete auth.users row via admin.deleteUser (cascades to public.users → …)
 *  10. Post-verify: re-count all tables, assert SET NULL fired on user_subscriptions
 *  11. Final verdict and copy-pasteable deletion record
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../packages/api/.env') });

const SUPABASE_URL            = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL            = process.env.DATABASE_URL;

// ── Hard exit if any required env var is missing ──────────────────────────────
// Done at module level so the error fires before any async work.
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error(
    'ERROR: Missing required env vars in packages/api/.env\n' +
    `  SUPABASE_URL:             ${SUPABASE_URL             ? '✓' : '✗ MISSING'}\n` +
    `  SUPABASE_SERVICE_ROLE_KEY:${SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗ MISSING'}\n` +
    `  DATABASE_URL:             ${DATABASE_URL             ? '✓' : '✗ MISSING'}\n` +
    '\n' +
    'DATABASE_URL must be the Postgres connection string from Supabase → Settings → Database.\n' +
    'Add it to packages/api/.env and re-run.'
  );
  process.exit(1);
}

// Validate DATABASE_URL is parseable before constructing the Pool.
// A placeholder value like "postgresql://postgres:[PASSWORD]@..." fails here.
try { new URL(DATABASE_URL); } catch {
  console.error(
    'ERROR: DATABASE_URL is not a valid URL. Check for unfilled placeholders.\n' +
    `  Value: ${DATABASE_URL}`
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });

const BUCKETS = ['tracker-photos', 'journal-photos'] as const;
const BATCH_SIZE = 1000;

// ── Table inventory ────────────────────────────────────────────────────────────
//
// Tables listed here must either:
//   (a) have a direct user_id column (count: 'direct'), OR
//   (b) be countable through a parent table (count: 'via_gardens')
//
// Tables that CANNOT be scoped to a user at all go in NOT_USER_SCOPABLE below.
// Tables intentionally retained after deletion go in INTENTIONALLY_RETAINED below.
// Both are reported separately, not mixed into this inventory.
//
// after:
//   cascade  = should be 0 rows for this user_id after auth.users deletion
//   set_null = rows survive but user_id must be NULL (not the old id)
//   orphaned = no FK on user_id — rows survive with old user_id (expected)

const TABLE_INVENTORY: ReadonlyArray<{
  table:  string;
  after:  'cascade' | 'set_null' | 'orphaned';
  count:  'direct' | 'via_gardens';
  note?:  string;
}> = [
  // ── Direct user_id — cascade ──────────────────────────────────────────────
  { table: 'gardens',               after: 'cascade',  count: 'direct' },
  { table: 'plant_trackers',        after: 'cascade',  count: 'direct' },
  { table: 'plant_tracker_checkins',after: 'cascade',  count: 'direct' },
  { table: 'plant_timeline',        after: 'cascade',  count: 'direct' },
  { table: 'chupchu_conversations', after: 'cascade',  count: 'direct' },
  { table: 'chupchu_memory',        after: 'cascade',  count: 'direct' },
  { table: 'vision_uses',           after: 'cascade',  count: 'direct' },
  { table: 'chat_uses',             after: 'cascade',  count: 'direct' },
  { table: 'recognition_history',   after: 'cascade',  count: 'direct' },
  { table: 'user_credits',          after: 'cascade',  count: 'direct' },
  { table: 'user_purchases',        after: 'cascade',  count: 'direct' },
  { table: 'garden_tasks',          after: 'cascade',  count: 'direct' },
  { table: 'push_subscriptions',    after: 'cascade',  count: 'direct' },
  { table: 'notification_settings', after: 'cascade',  count: 'direct' },
  { table: 'garden_maps',           after: 'cascade',  count: 'direct' },
  // ── Via parent — cascade ──────────────────────────────────────────────────
  { table: 'garden_plants',         after: 'cascade',  count: 'via_gardens',
    note: 'no user_id; counted via garden_id IN (gardens where user_id = ?)' },
  // ── SET NULL (rows survive, user_id nulled) ───────────────────────────────
  { table: 'user_subscriptions',    after: 'set_null', count: 'direct' },
  { table: 'api_usage',             after: 'set_null', count: 'direct' },
  { table: 'garden_timeline',       after: 'set_null', count: 'direct' },
  // ── Orphaned (no FK, rows survive with old user_id) ───────────────────────
  { table: 'deletion_audit_log',    after: 'orphaned', count: 'direct' },
] as const;

// Tables with user_id that are intentionally NOT deleted with the account.
// Reported in their own section. These must be known to the coverage assertion
// so it does not report them as UNCOVERED.
// Format: tableName → one-line reason
const INTENTIONALLY_RETAINED: Record<string, string> = {
  'api_usage':
    'SET NULL — cost-audit log; user_id nulled on deletion, rows kept for billing reconciliation',
  'garden_timeline':
    'SET NULL — biodynamic event history; user_id nulled, rows kept for aggregate analytics',
  'user_subscriptions':
    'SET NULL — payment/subscription history kept for accounting; user_id nulled by migration 038',
  'deletion_audit_log':
    'no FK — admin audit trail; stale user_id is expected and harmless',
  'chupchu_conversations_backup_20260827':
    'point-in-time backup snapshot (2026-08-27); not a live table, not maintained per-user',
};

// Tables that hold data but CANNOT be scoped to a specific user via any DB query.
// Reported separately. NOT included in TABLE_INVENTORY.
// journal_photos has no user_id column; journal_entries (which would provide the link)
// does not exist in this database. Storage photos are still deleted correctly because
// storage deletion walks the {userId}/ prefix — independent of this DB table.
const NOT_USER_SCOPABLE: ReadonlyArray<{
  table: string;
  reason: string;
}> = [
  {
    table:  'journal_photos',
    reason: 'has no user_id; would link via journal_entries.user_id, but journal_entries ' +
            'does not exist in this database. Cannot verify per user. ' +
            'Storage objects ARE deleted correctly via the {userId}/ prefix walk.',
  },
];

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
 * Safely join a storage prefix and an item name.
 * Supabase .list('', ...) at root returns item names with no prefix.
 * An empty prefix must not produce '/name' (a path that cannot be removed).
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
          queue.push(fullPath); // folder entry — recurse
        } else {
          results.push({ fullPath, size: (item.metadata as any)?.size ?? 0 });
        }
      }

      if (data.length < 1000) break;
      offset += 1000;
    }
  }

  return results;
}

// ── Table existence check (PostgREST) ─────────────────────────────────────────

/**
 * Verify a table is reachable via PostgREST.
 *
 * PostgREST failure mode: tables not in its schema cache return
 * {count: null, error: null} on a HEAD/count query — no error, just null count.
 * This is treated as unreachable (same as a real error).
 *
 * Returns null if reachable, error string if not.
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
    return 'SCHEMA_CACHE_MISS: count=null with no error — not in PostgREST schema cache';
  }
  return null;
}

// ── Counting helpers ──────────────────────────────────────────────────────────

async function countDirect(table: string, userId: string): Promise<number> {
  const { count, error } = await db
    .from(table as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[db] count(${table}.user_id=${userId}) failed: ${supabaseErrorMsg(error)}`);
  }
  if (count === null) {
    throw new Error(
      `[db] count(${table}) returned null with no error — ` +
      'table is not in PostgREST schema cache. This is a failure, not zero rows.'
    );
  }
  return count;
}

async function countViaGardens(userId: string): Promise<number> {
  const { data: gardenRows, error: gardenErr } = await db
    .from('gardens' as any)
    .select('id')
    .eq('user_id', userId);

  if (gardenErr) {
    throw new Error(`[db] garden_plants count — gardens lookup failed: ${supabaseErrorMsg(gardenErr)}`);
  }

  const gardenIds = (gardenRows ?? []).map((g: any) => g.id as string);
  if (gardenIds.length === 0) return 0;

  const { count, error } = await db
    .from('garden_plants' as any)
    .select('*', { count: 'exact', head: true })
    .in('garden_id', gardenIds);

  if (error) {
    throw new Error(`[db] garden_plants count via garden_ids failed: ${supabaseErrorMsg(error)}`);
  }
  if (count === null) {
    throw new Error('[db] garden_plants count returned null — table not in PostgREST schema cache');
  }
  return count;
}

async function countForEntry(
  entry: typeof TABLE_INVENTORY[number],
  userId: string
): Promise<number> {
  if (entry.count === 'direct')      return countDirect(entry.table, userId);
  if (entry.count === 'via_gardens') return countViaGardens(userId);
  throw new Error(`Unknown count strategy: ${(entry as any).count}`);
}

// ── Step 0: verify DB connection ──────────────────────────────────────────────

async function verifyDbConnection(): Promise<void> {
  let client;
  try {
    client = await pool.connect();
    await client.query('select 1');
  } catch (err: any) {
    console.error(
      `ERROR: Cannot connect to Postgres via DATABASE_URL:\n  ${err.message}\n\n` +
      'Check that DATABASE_URL in packages/api/.env is the correct Supabase connection string.\n' +
      'Find it at: Supabase dashboard → Settings → Database → Connection string (URI mode).'
    );
    await pool.end();
    process.exit(1);
  } finally {
    if (client) client.release();
  }
  console.log('[startup] Database connection verified ✓');
}

// ── Step 1: resolve user ──────────────────────────────────────────────────────

async function resolveUser(arg: string): Promise<{ id: string; email: string; created_at: string }> {
  if (isUuid(arg)) {
    const { data, error } = await db.auth.admin.getUserById(arg);
    if (error) throw new Error(`getUserById failed: ${supabaseErrorMsg(error)}`);
    if (!data?.user) throw new Error(`No auth.users row for id=${arg}`);
    return { id: data.user.id, email: data.user.email ?? '(no email)', created_at: data.user.created_at };
  }

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${supabaseErrorMsg(error)}`);

  const matches = (data?.users ?? []).filter(u => u.email === arg);
  if (matches.length === 0) throw new Error(`No auth.users row with email="${arg}"`);
  if (matches.length > 1)   throw new Error(`Multiple auth.users rows for email="${arg}" — use UUID`);

  const u = matches[0];
  return { id: u.id, email: u.email ?? '(no email)', created_at: u.created_at };
}

// ── Step 2: FK preflight ──────────────────────────────────────────────────────

async function preflightFK(): Promise<void> {
  // pool is guaranteed non-null and connected at this point (verified in step 0)
  const client = await pool.connect();
  try {
    // Assert confdeltype = 'n' (SET NULL)
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
        'Check constraint name: select conname from pg_constraint\n' +
        '  where conrelid = \'public.user_subscriptions\'::regclass and contype = \'f\';'
      );
    }

    const { conname, confdeltype } = fkResult.rows[0];
    const typeNames: Record<string, string> = {
      a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT',
    };

    if (confdeltype !== 'n') {
      throw new Error(
        `PREFLIGHT FAILED: ${conname} has ON DELETE ${typeNames[confdeltype] ?? confdeltype} (confdeltype='${confdeltype}').\n` +
        'Expected ON DELETE SET NULL (confdeltype=\'n\').\n' +
        'Migration 038_user_subscriptions_set_null.sql has not been applied.\n' +
        'Apply it in the Supabase SQL Editor before running this script.\n\n' +
        'Without it:\n' +
        '  1. Storage removal succeeds — photos deleted permanently\n' +
        '  2. auth.admin.deleteUser fails on this FK violation\n' +
        '  3. User\'s account is intact; their storage is gone'
      );
    }
    console.log(`  ${conname}: ON DELETE SET NULL ✓`);

    // Assert user_id is nullable (SET NULL cannot fire against a NOT NULL column)
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
        'The FK is SET NULL but the column is NOT NULL — Postgres accepted the constraint\n' +
        'at ALTER TABLE time but will raise a NOT NULL violation at deletion time.\n' +
        'Apply migration 038 fully (includes ALTER COLUMN user_id DROP NOT NULL).'
      );
    }
    console.log('  user_subscriptions.user_id is nullable ✓');
  } finally {
    client.release();
  }
}

// ── Step 3: coverage assertion ────────────────────────────────────────────────

async function coverageAssertion(): Promise<boolean> {
  const client = await pool.connect();
  try {
    // Query every public table that has a user-identifying column.
    // This is the live truth — not a hardcoded list.
    const result = await client.query<{ table_name: string }>(`
      select distinct table_name
      from information_schema.columns
      where table_schema = 'public'
        and column_name in ('user_id', 'owner_id', 'created_by', 'user_uuid')
      order by table_name
    `);

    const liveUserTables = result.rows.map(r => r.table_name);
    console.log(`  Live tables with user columns (${liveUserTables.length}): ${liveUserTables.join(', ')}`);

    const inventoryTables  = new Set(TABLE_INVENTORY.map(e => e.table));
    const retainedTables   = new Set(Object.keys(INTENTIONALLY_RETAINED));
    const unscopableTables = new Set(NOT_USER_SCOPABLE.map(e => e.table));

    const uncovered: string[] = [];
    for (const t of liveUserTables) {
      if (!inventoryTables.has(t) && !retainedTables.has(t) && !unscopableTables.has(t)) {
        uncovered.push(t);
      }
    }

    if (uncovered.length > 0) {
      console.log('');
      console.log('  ✗ UNCOVERED TABLES — hold user data but absent from the inventory:');
      for (const t of uncovered) {
        console.log(`      ${t}`);
      }
      console.log('');
      console.log(
        '  Add each to TABLE_INVENTORY with the correct count strategy and after-deletion\n' +
        '  expectation, OR to INTENTIONALLY_RETAINED with a one-line reason.'
      );
      return false;
    }

    console.log('');
    console.log('  Intentionally retained (not deleted with account):');
    for (const [t, reason] of Object.entries(INTENTIONALLY_RETAINED)) {
      console.log(`    ${pad(t, 44)} ${reason}`);
    }
    console.log('');
    console.log('  Not user-scopable (cannot be verified per user):');
    for (const e of NOT_USER_SCOPABLE) {
      console.log(`    ${e.table}`);
    }
    console.log('');
    console.log('  Coverage ✓ — no uncovered tables');
    return true;
  } finally {
    client.release();
  }
}

// ── Step 4: table existence check ─────────────────────────────────────────────

async function checkTableExistence(): Promise<boolean> {
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
      'A missing table must be a hard error — it cannot be rendered as "0 rows".\n' +
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

  // ── 0. Verify DB connection (must be first) ───────────────────────────────
  console.log('');
  await verifyDbConnection();

  // ── 1. Resolve user ───────────────────────────────────────────────────────
  let user: { id: string; email: string; created_at: string };
  try {
    user = await resolveUser(target);
  } catch (err: any) {
    console.error(`ERROR resolving user: ${err.message}`);
    await pool.end();
    process.exit(1);
  }

  console.log('');
  console.log('User resolved:');
  console.log(`  id:         ${user.id}`);
  console.log(`  email:      ${user.email}`);
  console.log(`  created_at: ${user.created_at}`);

  // ── 2. FK preflight ───────────────────────────────────────────────────────
  console.log('');
  console.log('── Preflight (migration 038) ──────────────────────────────');
  try {
    await preflightFK();
  } catch (err: any) {
    console.error(`\n${err.message}`);
    await pool.end();
    process.exit(1);
  }

  // ── 3. Coverage assertion ─────────────────────────────────────────────────
  console.log('');
  console.log('── Coverage assertion ────────────────────────────────────');
  const coverageOk = await coverageAssertion();
  if (!coverageOk) {
    console.error('\nAborting: fix UNCOVERED TABLES before proceeding.');
    await pool.end();
    process.exit(1);
  }

  // ── 4. Table existence check ──────────────────────────────────────────────
  console.log('');
  console.log('── Table existence ───────────────────────────────────────');
  const existenceOk = await checkTableExistence();
  if (!existenceOk) {
    await pool.end();
    process.exit(1);
  }

  // ── 5. Inventory ──────────────────────────────────────────────────────────
  console.log('');
  console.log('── Inventory ─────────────────────────────────────────────');

  const beforeCounts: Record<string, number> = {};
  for (const entry of TABLE_INVENTORY) {
    beforeCounts[entry.table] = await countForEntry(entry, user.id);
  }

  // Store garden IDs now — needed for garden_plants post-verify after cascade
  const { data: gardenRowsBefore } = await db
    .from('gardens' as any).select('id').eq('user_id', user.id);
  const gardenIdsBefore = (gardenRowsBefore ?? []).map((g: any) => g.id as string);

  // Storage inventory
  const beforeStorage: Record<string, number> = {};
  for (const bucket of BUCKETS) {
    const objects = await listAllObjects(bucket, user.id);
    beforeStorage[bucket] = objects.length;
  }

  // Print inventory
  console.log('');
  console.log(pad('Table', 30) + pad('Rows', 10) + 'After deletion');
  console.log('-'.repeat(80));
  for (const entry of TABLE_INVENTORY) {
    const n = beforeCounts[entry.table];
    const afterLabel =
      entry.after === 'cascade'  ? 'expect 0' :
      entry.after === 'set_null' ? 'rows survive with null user_id' :
                                   'orphaned (rows survive with old user_id — no FK)';
    const noteStr = entry.note ? `\n    ${' '.repeat(40)}${entry.note}` : '';
    console.log(pad(entry.table, 30) + pad(String(n), 10) + afterLabel + noteStr);
  }

  console.log('');
  console.log('── Not user-scopable ─────────────────────────────────────');
  for (const e of NOT_USER_SCOPABLE) {
    console.log(`  ${e.table}`);
    console.log(`    ${e.reason}`);
  }

  console.log('');
  for (const bucket of BUCKETS) {
    console.log(`  storage/${bucket}: ${beforeStorage[bucket]} objects`);
  }

  if (!confirm) {
    console.log('');
    console.log('Dry run complete. Re-run with --confirm to perform deletion.');
    await pool.end();
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
      await pool.end();
      process.exit(1);
    }
  }

  // ── 7. Remove storage ─────────────────────────────────────────────────────
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
        .from(bucket).remove(batch);

      if (removeError) {
        console.error(
          `\nERROR: storage.remove failed for "${bucket}":\n  ${supabaseErrorMsg(removeError)}\n` +
          'Aborting — DB has not been touched.'
        );
        await pool.end();
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

    console.log(`  ${bucket}: ${totalRemoved} confirmed removed, ${totalFailed} unconfirmed`);

    if (totalFailed > 0) {
      console.error(
        `\nERROR: ${totalFailed} object(s) in "${bucket}" not confirmed removed.\n` +
        'Aborting before DB step to prevent orphaned files.'
      );
      await pool.end();
      process.exit(1);
    }
  }

  // ── 8. Verify storage empty ───────────────────────────────────────────────
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
      await pool.end();
      process.exit(1);
    }
    console.log(`  ${bucket}: verified empty ✓`);
  }

  // ── 9. Delete auth user (hard delete) ─────────────────────────────────────
  console.log('');
  console.log('── Deleting auth.users row ───────────────────────────────');
  console.log(`  admin.deleteUser(${user.id}, softDelete=false)...`);

  const { error: deleteError } = await db.auth.admin.deleteUser(user.id, false);

  if (deleteError) {
    console.error(
      `\nERROR: admin.deleteUser failed: ${supabaseErrorMsg(deleteError)}\n` +
      'Storage was already removed. Auth row still exists. Investigate and retry.'
    );
    await pool.end();
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

    if (entry.count === 'via_gardens') {
      // Gardens are gone — use the pre-deletion garden IDs
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
      afterCount = await countDirect(entry.table, user.id);
    }

    let result: string;
    if (entry.after === 'cascade') {
      result = afterCount === 0
        ? '✓ cleared'
        : `✗ FAIL: ${afterCount} row(s) still carry old user_id`;
      if (afterCount !== 0) anyFailure = true;
    } else if (entry.after === 'set_null') {
      result = afterCount === 0
        ? '✓ SET NULL fired — old user_id gone'
        : `✗ FAIL: ${afterCount} row(s) still carry old user_id (SET NULL did not fire)`;
      if (afterCount !== 0) anyFailure = true;
    } else {
      result = afterCount > 0
        ? `⚠  ${afterCount} row(s) retained with old user_id (no FK — expected)`
        : '✓ no rows';
    }

    console.log(pad(entry.table, 30) + pad(String(before), 10) + pad(String(afterCount), 10) + result);
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
    await pool.end();
    process.exit(1);
  }

  const verdict =
    `DELETED ${user.id} — ` +
    `${totalStorageRemoved} storage objects removed, ` +
    `${tablesCleared} table(s) cascade-cleared`;

  console.log(verdict);
  console.log('══════════════════════════════════════════════════════════');

  console.log('');
  console.log('── Deletion record ───────────────────────────────────────');
  console.log(`Date:    ${runAt}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Email:   ${user.email}`);
  console.log(`Result:  ${verdict}`);
  console.log(`Storage: tracker-photos=${beforeStorage['tracker-photos']}, journal-photos=${beforeStorage['journal-photos']}`);
  console.log('──────────────────────────────────────────────────────────');

  await pool.end();
}

main().catch(async (err) => {
  console.error('\nUNHANDLED ERROR:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
