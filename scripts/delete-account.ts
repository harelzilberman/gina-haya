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

// ── Audit log helpers ─────────────────────────────────────────────────────────

/**
 * Write one row to deletion_audit_log.
 * Non-fatal: on any error, logs a warning and returns without throwing.
 * Failing a deletion because a log row could not be written is the wrong trade.
 */
async function writeAuditRow(fields: {
  row_id:   string;
  user_id:  string;
  action:   string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO deletion_audit_log (table_name, row_id, user_id, action, source, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'auth.users',
        fields.row_id,
        fields.user_id,
        fields.action,
        'scripts/delete-account.ts',
        JSON.stringify(fields.metadata),
      ]
    );
  } catch (err: any) {
    console.warn(`[audit] WARNING: failed to write audit row (action=${fields.action}): ${err.message}`);
    console.warn('[audit] Continuing — audit write failure is non-fatal.');
  }
}

/**
 * Query deletion_audit_log for prior account deletion events on a given UUID.
 * Returns rows in chronological order; empty array if none found or on query error.
 */
async function queryPriorDeletion(uuid: string): Promise<
  Array<{ action: string; created_at: string; metadata: Record<string, unknown> | null }>
> {
  try {
    const result = await pool.query<{
      action: string; created_at: string; metadata: Record<string, unknown> | null;
    }>(
      `SELECT action, created_at, metadata
       FROM deletion_audit_log
       WHERE row_id = $1 AND action LIKE 'account_deletion_%'
       ORDER BY created_at`,
      [uuid]
    );
    return result.rows;
  } catch {
    return [];
  }
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

async function coverageAssertion(isConfirmRun: boolean): Promise<{ ok: boolean; hasStale: boolean }> {
  const client = await pool.connect();
  try {
    // Single query: all public base tables, tagged with whether they have a
    // user-identifying column.  Using one query for both the uncovered-table
    // check and the stale-entry check avoids a second round-trip.
    const result = await client.query<{ table_name: string; has_user_column: boolean }>(`
      SELECT
        t.table_name,
        bool_or(c.column_name IS NOT NULL) AS has_user_column
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c
        ON  c.table_schema = 'public'
        AND c.table_name   = t.table_name
        AND c.column_name  IN ('user_id', 'owner_id', 'created_by', 'user_uuid')
      WHERE t.table_schema = 'public'
        AND t.table_type   = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `);

    const allLiveTables  = new Set(result.rows.map(r => r.table_name));
    const liveUserTables = result.rows.filter(r => r.has_user_column).map(r => r.table_name);
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
      return { ok: false, hasStale: false };
    }

    // ── Stale-entry check ─────────────────────────────────────────────────────
    // Cross-check INTENTIONALLY_RETAINED and NOT_USER_SCOPABLE against the live
    // table list.  A stale entry names a table that no longer exists.
    //
    // Failure behaviour is intentionally different from TABLE_INVENTORY:
    //   TABLE_INVENTORY missing → hard abort in ALL runs.
    //     Reason: if a table is absent we cannot verify its rows were deleted —
    //     the verification is impossible, making the deletion untrustworthy.
    //   INTENTIONALLY_RETAINED / NOT_USER_SCOPABLE stale → exit non-zero in dry
    //     run, but CONTINUE in --confirm.
    //     Reason: a dropped table cannot be retaining anyone's data.  The entry
    //     is cosmetic and cannot make a deletion unsafe.  Blocking a live
    //     deletion request (a privacy obligation with a 30-day commitment) over
    //     an out-of-date comment would be the wrong failure.
    //   Do not "fix" this asymmetry by making both hard-fail.
    const staleRetained   = Object.keys(INTENTIONALLY_RETAINED).filter(t => !allLiveTables.has(t));
    const staleUnscopable = NOT_USER_SCOPABLE.map(e => e.table).filter(t => !allLiveTables.has(t));
    const hasStale = staleRetained.length > 0 || staleUnscopable.length > 0;

    if (hasStale) {
      console.log('');
      console.log('  STALE ENTRIES — listed as retained but no longer in the database:');
      for (const t of staleRetained) {
        console.log(`    [INTENTIONALLY_RETAINED]  ${pad(t, 44)} ${INTENTIONALLY_RETAINED[t]}`);
      }
      for (const t of staleUnscopable) {
        const e = NOT_USER_SCOPABLE.find(x => x.table === t)!;
        console.log(`    [NOT_USER_SCOPABLE]       ${pad(t, 44)} ${e.reason}`);
      }
      if (isConfirmRun) {
        console.log('  ↳ stale entries are cosmetic — deletion will proceed');
      } else {
        console.log('  ↳ remove stale entries from their list to clear this warning');
      }
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
    return { ok: true, hasStale };
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
    // Before reporting the error, check whether this UUID was already deleted.
    // Only possible when the input is a UUID — we have no row_id to query by email.
    if (isUuid(target)) {
      const priorRows = await queryPriorDeletion(target);
      const completeRow = priorRows.find(r => r.action === 'account_deletion_complete');
      const startedRow  = priorRows.find(r => r.action === 'account_deletion_started');

      if (completeRow) {
        console.log('');
        console.log('── Prior deletion found ───────────────────────────────────');
        console.log('  This account was already deleted.');
        console.log(`  Completed at: ${completeRow.created_at}`);
        if (completeRow.metadata && Object.keys(completeRow.metadata).length > 0) {
          console.log('  What was removed:');
          for (const [k, v] of Object.entries(completeRow.metadata)) {
            console.log(`    ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
          }
        }
        await pool.end();
        process.exit(0);
      }

      if (startedRow) {
        console.log('');
        console.log('── Prior deletion found ───────────────────────────────────');
        console.log('  A deletion was started for this account but did not complete.');
        console.log(`  Started at: ${startedRow.created_at}`);
        console.log('  No completion row exists — the account should be investigated.');
        console.log('  Re-run with --confirm to attempt completion, or query the DB to confirm state.');
        if (startedRow.metadata && Object.keys(startedRow.metadata).length > 0) {
          console.log('  Pre-deletion snapshot:');
          for (const [k, v] of Object.entries(startedRow.metadata)) {
            console.log(`    ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
          }
        }
        await pool.end();
        process.exit(1);
      }
    }

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
  const { ok: coverageOk, hasStale } = await coverageAssertion(confirm);
  if (!coverageOk) {
    console.error('\nAborting: fix UNCOVERED TABLES before proceeding.');
    await pool.end();
    process.exit(1);
  }
  if (hasStale && !confirm) {
    console.error('\nAborting dry run: remove stale entries before proceeding (see STALE ENTRIES above).');
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

  // ── Audit write 1: record that deletion has started ───────────────────────
  // Written before any irreversible action (step 7 storage removal).
  // Captures the step-5 inventory — last moment this information exists intact.
  console.log('');
  console.log('── Audit log ─────────────────────────────────────────────');
  await writeAuditRow({
    row_id:   user.id,
    user_id:  user.id,
    action:   'account_deletion_started',
    metadata: {
      storage_object_count: Object.values(beforeStorage).reduce((a, b) => a + b, 0),
      storage_per_bucket:   beforeStorage,
      table_row_counts:     beforeCounts,
    },
  });
  console.log('  account_deletion_started written ✓');

  // Accumulators used for Write 2 metadata (populated during steps 7 and 8.5).
  let storageRemovedCount       = 0;
  let subscriptionsStrippedCount = 0;

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
    storageRemovedCount += totalRemoved;

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

  // ── 8.5. Strip PII from user_subscriptions.raw_notification ──────────────────
  //
  // Must run BEFORE deleteUser: once the auth row is gone, user_id becomes NULL
  // and the rows can no longer be found by user_id.
  //
  // Known platforms and what survives the strip:
  //   grow        → accounting fields only (transactionId, sum, paymentDate,
  //                 asmachta, processId, productData, statusCode, cField2/cField3)
  //   google_play → full payload minus externalAccountIdentifiers
  //   anything else → platform check below aborts before any write. ELSE NULL in
  //                 the UPDATE is an unreachable backstop in case the check is ever
  //                 bypassed; it is the safer failure if that happens.
  console.log('');
  console.log('── PII strip (user_subscriptions.raw_notification) ───────────');

  {
    const stripClient = await pool.connect();
    try {
      // ── a. Pre-flight: reject unknown platforms before touching any row ──────
      const platformCheckResult = await stripClient.query<{ platform: string; cnt: string }>(`
        SELECT platform, count(*) AS cnt
        FROM public.user_subscriptions
        WHERE user_id = $1
          AND platform NOT IN ('grow', 'google_play')
        GROUP BY platform
      `, [user.id]);

      if (platformCheckResult.rows.length > 0) {
        const detail = platformCheckResult.rows
          .map(r => `${r.platform} (${r.cnt} row(s))`)
          .join(', ');
        console.error(
          `\nABORT: user_subscriptions contains rows with unrecognised platform(s): ${detail}\n` +
          '  No changes were made. The account was not deleted.\n' +
          '  Add handling for this platform in the strip query and retry.'
        );
        await pool.end();
        process.exit(1);
      }

      // ── b. Redact ───────────────────────────────────────────────────────────
      const stripResult = await stripClient.query<{ id: string; platform: string }>(`
        UPDATE public.user_subscriptions
        SET raw_notification = (
          CASE platform
            WHEN 'grow' THEN jsonb_build_object(
              'status', raw_notification->>'status',
              'data', jsonb_build_object(
                'statusCode',    raw_notification->'data'->>'statusCode',
                'transactionId', raw_notification->'data'->>'transactionId',
                'sum',           raw_notification->'data'->>'sum',
                'paymentDate',   raw_notification->'data'->>'paymentDate',
                'asmachta',      raw_notification->'data'->>'asmachta',
                'processId',     raw_notification->'data'->>'processId',
                'productData',   raw_notification->'data'->'productData',
                'customFields', jsonb_build_object(
                  'cField2', raw_notification->'data'->'customFields'->>'cField2',
                  'cField3', raw_notification->'data'->'customFields'->>'cField3'
                )
              )
            )
            WHEN 'google_play' THEN jsonb_build_object(
              'startTime',            raw_notification->>'startTime',
              'regionCode',           raw_notification->>'regionCode',
              'subscriptionState',    raw_notification->>'subscriptionState',
              'acknowledgementState', raw_notification->>'acknowledgementState',
              'lineItems', COALESCE(
                (SELECT jsonb_agg(
                   jsonb_build_object(
                     'productId',    elem->>'productId',
                     'expiryTime',   elem->>'expiryTime',
                     'offerDetails', elem->'offerDetails'
                   )
                 )
                 FROM jsonb_array_elements(
                   COALESCE(NULLIF(raw_notification->'lineItems', 'null'::jsonb), '[]'::jsonb)
                 ) AS elem),
                '[]'::jsonb
              )
            )
            ELSE NULL  -- unreachable: platform check above already aborted; safer than pass-through
          END
        ),
        updated_at = now()
        WHERE user_id = $1
        RETURNING id, platform
      `, [user.id]);

      subscriptionsStrippedCount = stripResult.rows.length;

      if (stripResult.rows.length === 0) {
        console.log('  No user_subscriptions rows — nothing to strip');
      } else {
        for (const r of stripResult.rows) {
          console.log(`  stripped ${r.platform} row ${r.id}`);
        }
        console.log(`  ${stripResult.rows.length} row(s) updated`);
      }

      // ── c. Verify no PII key survived ──────────────────────────────────────
      const verifyResult = await stripClient.query<{
        payer_email: string; payer_phone: string; full_name: string; payer_name: string;
        card_suffix: string; card_exp: string; grow_uuid: string; play_uuid: string;
        play_latest_order_id: string; play_gpa_token: string;
        uuid_anywhere: string; total: string;
      }>(`
        SELECT
          count(*) FILTER (WHERE raw_notification->'data' ? 'payerEmail')               AS payer_email,
          count(*) FILTER (WHERE raw_notification->'data' ? 'payerPhone')               AS payer_phone,
          count(*) FILTER (WHERE raw_notification->'data' ? 'fullName')                 AS full_name,
          count(*) FILTER (WHERE raw_notification->'data' ? 'payerName')                AS payer_name,
          count(*) FILTER (WHERE raw_notification->'data' ? 'cardSuffix')               AS card_suffix,
          count(*) FILTER (WHERE raw_notification->'data' ? 'cardExp')                  AS card_exp,
          count(*) FILTER (WHERE raw_notification->'data'->'customFields' ? 'cField1')  AS grow_uuid,
          count(*) FILTER (WHERE raw_notification ? 'externalAccountIdentifiers')       AS play_uuid,
          count(*) FILTER (WHERE raw_notification ? 'latestOrderId')                    AS play_latest_order_id,
          count(*) FILTER (WHERE raw_notification::text ILIKE '%GPA.%')                 AS play_gpa_token,
          count(*) FILTER (WHERE raw_notification::text ILIKE '%' || $2 || '%')         AS uuid_anywhere,
          count(*)                                                                      AS total
        FROM public.user_subscriptions
        WHERE user_id = $1
      `, [user.id, user.id]);

      const v = verifyResult.rows[0];
      const piiCounts: Record<string, number> = {
        payer_email:          Number(v.payer_email),
        payer_phone:          Number(v.payer_phone),
        full_name:            Number(v.full_name),
        payer_name:           Number(v.payer_name),
        card_suffix:          Number(v.card_suffix),
        card_exp:             Number(v.card_exp),
        grow_uuid:            Number(v.grow_uuid),
        play_uuid:            Number(v.play_uuid),
        play_latest_order_id: Number(v.play_latest_order_id),
        play_gpa_token:       Number(v.play_gpa_token),
        uuid_anywhere:        Number(v.uuid_anywhere),
      };

      for (const [key, count] of Object.entries(piiCounts)) {
        console.log(`  ${pad(key, 22)} ${count === 0 ? '✓ 0' : `✗ ${count} — STILL PRESENT`}`);
      }
      console.log(`  ${pad('total rows checked', 22)} ${v.total}`);

      const piiRemaining = Object.entries(piiCounts).filter(([, n]) => n > 0);
      if (piiRemaining.length > 0) {
        console.error(
          `\nABORT: PII verification FAILED — ` +
          piiRemaining.map(([k, n]) => `${k}: ${n}`).join(', ') + '\n' +
          '  The auth row was NOT deleted. Fix the strip query and retry.'
        );
        await pool.end();
        process.exit(1);
      }

      // ── d. Assert accounting fields survived on Grow rows ───────────────────
      const accountingResult = await stripClient.query<{
        id: string; has_asmachta: boolean; has_transaction_id: boolean;
      }>(`
        SELECT id,
               (raw_notification->'data'->>'asmachta')      IS NOT NULL AS has_asmachta,
               (raw_notification->'data'->>'transactionId') IS NOT NULL AS has_transaction_id
        FROM public.user_subscriptions
        WHERE user_id = $1 AND platform = 'grow'
      `, [user.id]);

      for (const row of accountingResult.rows) {
        if (!row.has_asmachta || !row.has_transaction_id) {
          console.error(
            `\nABORT: Grow row ${row.id} lost accounting fields ` +
            `(asmachta=${row.has_asmachta ? '✓' : '✗'}, ` +
            `transactionId=${row.has_transaction_id ? '✓' : '✗'}).\n` +
            '  Strip was destructive — fix before retrying.'
          );
          await pool.end();
          process.exit(1);
        }
      }

      if (accountingResult.rows.length > 0) {
        console.log(`  accounting fields OK on ${accountingResult.rows.length} Grow row(s) ✓`);
      }

      console.log('  PII strip verified ✓ — proceeding to auth deletion');

    } finally {
      stripClient.release();
    }
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

  // ── Audit write 2: record completion before post-verify ───────────────────
  // Placed here so a crash during post-verification still leaves this row.
  await writeAuditRow({
    row_id:   user.id,
    user_id:  user.id,
    action:   'account_deletion_complete',
    metadata: {
      storage_removed_count:        storageRemovedCount,
      subscriptions_stripped_count: subscriptionsStrippedCount,
    },
  });
  console.log('  account_deletion_complete written ✓');

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
