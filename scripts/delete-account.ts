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
 *   3. Inventory: count rows in every user-owned table and storage objects per bucket
 *   4. Enumerate storage objects under {userId}/ in both buckets (recursive, paginated)
 *   5. Remove storage objects in batches of ≤1000, verify each batch
 *   6. Verify storage is empty — abort before DB step if anything remains
 *   7. Hard-delete the auth.users row via admin.deleteUser (cascades to public.users → …)
 *   8. Post-verify: re-count all tables, assert user_subscriptions.user_id is NULL not the old id
 *   9. Print final verdict and copy-pasteable deletion record
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
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

// pg pool for raw SQL (preflight, pg_constraint).
// DATABASE_URL may be absent or contain unfilled placeholders — test before constructing.
function makePool(): Pool | null {
  if (!DATABASE_URL) return null;
  if (DATABASE_URL.includes('[') || DATABASE_URL.includes('<')) return null; // unfilled placeholder
  try {
    new URL(DATABASE_URL); // throws if not a valid URL
  } catch {
    return null;
  }
  return new Pool({ connectionString: DATABASE_URL, max: 1 });
}
const pool = makePool();

const BUCKETS = ['tracker-photos', 'journal-photos'] as const;
const BATCH_SIZE = 1000;

// Tables with a direct user_id column and their expected post-deletion behaviour.
// 'cascade'  = should be 0 rows for this user_id after deletion
// 'set_null' = rows survive but user_id must be NULL (not the old id)
// 'orphaned' = no FK on user_id — rows survive with old user_id (expected)
//
// Tables that are user-linked only through a parent (garden_plants → gardens,
// plant_tracker_checkins → plant_trackers) are NOT included here because they
// have no direct user_id column; their fate is verified via the parent count.
const TABLE_INVENTORY: Array<{
  table: string;
  after: 'cascade' | 'set_null' | 'orphaned';
}> = [
  { table: 'gardens',               after: 'cascade'  },
  { table: 'plant_trackers',        after: 'cascade'  },
  { table: 'plant_timeline',        after: 'cascade'  },
  { table: 'chupchu_conversations', after: 'cascade'  },
  { table: 'chupchu_memory',        after: 'cascade'  },
  { table: 'vision_uses',           after: 'cascade'  },
  { table: 'chat_uses',             after: 'cascade'  },
  { table: 'recognition_history',   after: 'cascade'  },
  { table: 'user_credits',          after: 'cascade'  },
  { table: 'user_purchases',        after: 'cascade'  },
  { table: 'moosh_conversations',   after: 'cascade'  },
  { table: 'garden_tasks',          after: 'cascade'  },
  { table: 'push_subscriptions',    after: 'cascade'  },
  { table: 'notification_settings', after: 'cascade'  },
  { table: 'garden_maps',           after: 'cascade'  },
  { table: 'user_subscriptions',    after: 'set_null' },
  { table: 'api_usage',             after: 'set_null' },
  { table: 'garden_timeline',       after: 'set_null' },
  { table: 'deletion_audit_log',    after: 'orphaned' },
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
        const fullPath = `${currentPrefix}/${item.name}`;
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

/**
 * Count rows in a table where user_id = value.
 * Returns -1 if the table does not exist in this DB.
 */
async function countRows(table: string, userId: string): Promise<number> {
  const { count, error } = await db
    .from(table as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    const msg = supabaseErrorMsg(error);
    // 42P01 = relation does not exist; PGRST116 = table not found
    if (
      msg.includes('does not exist') ||
      (error as any).code === '42P01' ||
      (error as any).code === 'PGRST116'
    ) {
      return -1;
    }
    throw new Error(`[db] count(${table}.user_id=${userId}) failed: ${msg}`);
  }
  return count ?? 0;
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

  // Email lookup via listUsers
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${supabaseErrorMsg(error)}`);

  const matches = (data?.users ?? []).filter(u => u.email === arg);
  if (matches.length === 0) throw new Error(`No auth.users row with email="${arg}"`);
  if (matches.length > 1)   throw new Error(`Multiple auth.users rows with email="${arg}" — use UUID instead`);

  const u = matches[0];
  return { id: u.id, email: u.email ?? '(no email)', created_at: u.created_at };
}

// ── Step 2: preflight FK check ────────────────────────────────────────────────

async function preflightFK(): Promise<void> {
  if (!pool) {
    console.warn(
      '[preflight] DATABASE_URL not set — cannot query pg_constraint directly.\n' +
      '            Proceeding, but if migration 038 is not applied, deletion will fail\n' +
      '            at the auth.deleteUser step with a foreign-key violation.'
    );
    return;
  }

  const client = await pool.connect();
  try {
    // Check FK confdeltype
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
        'Migration 038 may have renamed it. Run the verification query manually:\n' +
        '  select conname, confdeltype from pg_constraint\n' +
        '  where conrelid = \'public.user_subscriptions\'::regclass and contype = \'f\';'
      );
    }

    const { conname, confdeltype } = fkResult.rows[0];
    if (confdeltype !== 'n') {
      const typeNames: Record<string, string> = {
        a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT',
      };
      throw new Error(
        `PREFLIGHT FAILED: ${conname} has confdeltype='${confdeltype}' (${typeNames[confdeltype] ?? confdeltype}).\n` +
        'Expected SET NULL (n). Migration 038 (038_user_subscriptions_set_null.sql) has not been applied.\n' +
        'Apply it in the Supabase SQL Editor before running this script.\n' +
        'Without it, ON DELETE SET NULL cannot fire and auth.deleteUser will throw a FK violation.'
      );
    }
    console.log(`[preflight] ${conname}: confdeltype='n' (SET NULL) ✓`);

    // Check that user_id is nullable (SET NULL cannot fire against NOT NULL column)
    const colResult = await client.query<{ is_nullable: string }>(`
      select is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_subscriptions'
        and column_name = 'user_id'
    `);

    if (colResult.rows.length === 0) {
      throw new Error('PREFLIGHT FAILED: user_subscriptions.user_id column not found in information_schema.');
    }

    if (colResult.rows[0].is_nullable !== 'YES') {
      throw new Error(
        'PREFLIGHT FAILED: user_subscriptions.user_id is still NOT NULL.\n' +
        'The FK confdeltype is SET NULL but the column is NOT NULL — Postgres accepted the\n' +
        'constraint at creation time but will fail at deletion time. Apply migration 038 fully.'
      );
    }
    console.log('[preflight] user_subscriptions.user_id is nullable ✓');

  } finally {
    client.release();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: pnpm exec tsx scripts/delete-account.ts <email-or-uuid> [--confirm]\n' +
      '  Without --confirm: dry run, prints inventory only.\n' +
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

  // ── 3. Inventory ──────────────────────────────────────────────────────────
  console.log('');
  console.log('── Inventory ─────────────────────────────────────────────');

  const beforeCounts: Record<string, number> = {};

  for (const { table } of TABLE_INVENTORY) {
    beforeCounts[table] = await countRows(table, user.id);
  }

  // Storage inventory
  const beforeStorage: Record<string, number> = {};
  for (const bucket of BUCKETS) {
    const objects = await listAllObjects(bucket, user.id);
    beforeStorage[bucket] = objects.length;
  }

  // Print inventory table
  console.log('');
  console.log(pad('Table', 28) + pad('Rows', 8) + 'After deletion');
  console.log('-'.repeat(75));
  for (const { table, after } of TABLE_INVENTORY) {
    const n = beforeCounts[table];
    const label = n === -1 ? '(table missing)' : String(n);
    const afterLabel =
      after === 'cascade'  ? 'expect 0' :
      after === 'set_null' ? 'rows survive with null user_id' :
                             'orphaned (no FK — rows survive with old user_id)';
    console.log(pad(table, 28) + pad(label, 8) + afterLabel);
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

  // ── 4. Enumerate storage ──────────────────────────────────────────────────
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
        `\nERROR: storage enumeration count (${objects.length}) does not match ` +
        `inventory count (${beforeStorage[bucket]}) for bucket "${bucket}".\n` +
        'Data changed between steps, or enumeration is wrong. Aborting before any deletion.'
      );
      if (pool) await pool.end();
      process.exit(1);
    }
  }

  // ── 5. Remove storage (batched ≤1000) ─────────────────────────────────────
  console.log('');
  console.log('── Storage removal ───────────────────────────────────────');

  for (const bucket of BUCKETS) {
    const paths = storageObjects[bucket];
    if (paths.length === 0) {
      console.log(`  ${bucket}: no objects, skipping`);
      continue;
    }

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
          `\nERROR: storage.remove failed for bucket "${bucket}" (batch ${i + 1}–${i + batch.length}):\n` +
          `  ${supabaseErrorMsg(removeError)}\n` +
          'Aborting — DB has not been touched.'
        );
        if (pool) await pool.end();
        process.exit(1);
      }

      // Verify: every requested path must appear in the response
      const removedSet = new Set((removedList ?? []).map((o: any) => o.name));
      const missing = batch.filter(p => !removedSet.has(p));

      if (missing.length > 0) {
        console.warn(`  WARNING: ${missing.length} paths requested but not in remove response:`);
        for (const p of missing) console.warn(`    ${p}`);
        totalFailed += missing.length;
      }

      totalRemoved += (removedList ?? []).length;
    }

    console.log(`  ${bucket}: removed ${totalRemoved} confirmed, ${totalFailed} unconfirmed`);

    if (totalFailed > 0) {
      console.error(
        `\nERROR: ${totalFailed} object(s) in "${bucket}" were requested for removal but not ` +
        'returned in the response. Aborting before DB step to avoid orphaned files.\n' +
        'Investigate manually and re-run.'
      );
      if (pool) await pool.end();
      process.exit(1);
    }
  }

  // ── 6. Verify storage is empty ────────────────────────────────────────────
  console.log('');
  console.log('── Storage verification ──────────────────────────────────');

  for (const bucket of BUCKETS) {
    const remaining = await listAllObjects(bucket, user.id);
    if (remaining.length > 0) {
      console.error(
        `\nERROR: ${remaining.length} object(s) remain in "${bucket}" after removal:\n` +
        remaining.slice(0, 10).map(o => `  ${o.fullPath}`).join('\n') +
        (remaining.length > 10 ? `\n  ... and ${remaining.length - 10} more` : '') + '\n' +
        'Aborting before DB step. Re-run with --confirm after investigating.'
      );
      if (pool) await pool.end();
      process.exit(1);
    }
    console.log(`  ${bucket}: verified empty ✓`);
  }

  // ── 7. Delete auth user (hard delete, soft=false) ─────────────────────────
  console.log('');
  console.log('── Deleting auth.users row ───────────────────────────────');
  console.log(`  admin.deleteUser(${user.id}, softDelete=false)...`);

  // soft=false is the second parameter: https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
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

  // ── 8. Post-verify ────────────────────────────────────────────────────────
  console.log('');
  console.log('── Post-deletion verification ────────────────────────────');
  console.log('');
  console.log(pad('Table', 28) + pad('Before', 8) + pad('After', 8) + 'Result');
  console.log('-'.repeat(78));

  let anyFailure = false;

  for (const { table, after } of TABLE_INVENTORY) {
    const before = beforeCounts[table];
    if (before === -1) {
      console.log(pad(table, 28) + pad('—', 8) + pad('—', 8) + '(table missing — skipped)');
      continue;
    }

    // Count rows still carrying the old user_id
    const afterCount = await countRows(table, user.id);

    let result: string;
    if (after === 'cascade') {
      if (afterCount === 0) {
        result = '✓ cleared';
      } else {
        result = `✗ FAIL: ${afterCount} row(s) still carry old user_id`;
        anyFailure = true;
      }
    } else if (after === 'set_null') {
      if (afterCount === 0) {
        result = '✓ SET NULL fired — no rows carry old user_id';
      } else {
        result = `✗ FAIL: ${afterCount} row(s) still carry old user_id — SET NULL did not fire`;
        anyFailure = true;
      }
    } else {
      // orphaned: rows surviving with old user_id are expected (no FK)
      result = afterCount > 0
        ? `⚠  ${afterCount} row(s) retained with old user_id (no FK — expected)`
        : '✓ no rows';
    }

    console.log(pad(table, 28) + pad(String(before), 8) + pad(String(afterCount === -1 ? '—' : afterCount), 8) + result);
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

  // ── 9. Final verdict ──────────────────────────────────────────────────────
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
