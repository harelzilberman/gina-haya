/**
 * Orphan photo cleanup — removes storage objects whose owning auth.users row is gone.
 *
 * Usage:
 *   pnpm exec tsx scripts/cleanup-orphan-photos.ts            # dry run, prints orphans only
 *   pnpm exec tsx scripts/cleanup-orphan-photos.ts --confirm  # removes orphaned objects
 *
 * An object is orphaned if its first path segment (the owner prefix) either:
 *   (a) is not a valid UUID, OR
 *   (b) has no matching auth.users.id in the database.
 *
 * Segments are compared as TEXT — casting to uuid would throw on non-UUID segments
 * like "197609" and prevent those objects from being classified at all.
 *
 * History: 4 orphaned segments (1387abd1, 197609, 32f5619c, cdd3d54f — 29 objects)
 * were removed by running this script with --confirm on 2026-09-07.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../packages/api/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const BUCKETS = ['tracker-photos', 'journal-photos'] as const;
const BATCH_SIZE = 1000;

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

interface StorageObject {
  segment: string;  // first path component (owner id / legacy id)
  bucket:  string;
  path:    string;  // full object path
  size:    number;
}

/**
 * Safely join a storage prefix and an item name, never producing a leading slash.
 * Supabase .list('', ...) at the root level returns item names with no prefix;
 * concatenating '' + '/' + name would yield '/name' — a path that cannot be removed.
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
 * Uses joinPath() so an empty prefix at root level does not produce leading slashes.
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
          // Folder entry — recurse
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
 * List all top-level segments (first path component) in a bucket.
 * These are the "owner prefixes" that we use to group objects.
 */
async function listTopLevelSegments(bucket: string): Promise<string[]> {
  const segments: string[] = [];
  let offset = 0;

  while (true) {
    // List at root (empty prefix)
    const { data, error } = await db.storage
      .from(bucket)
      .list('', { limit: 1000, offset });

    if (error) {
      throw new Error(`[storage] list("${bucket}", root offset=${offset}) failed: ${supabaseErrorMsg(error)}`);
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      // At root level, both folder entries (id===null) and any root-level files appear
      segments.push(item.name);
    }

    if (data.length < 1000) break;
    offset += 1000;
  }

  return segments;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const confirm = process.argv.includes('--confirm');
  const runAt   = new Date().toISOString();

  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  cleanup-orphan-photos.ts  ${confirm ? '⚠️  LIVE RUN' : '(dry run)'}`);
  console.log(`  Started: ${runAt}`);
  console.log('══════════════════════════════════════════════════════════');

  // ── Enumerate all objects across both buckets ──────────────────────────────
  console.log('');
  console.log('── Enumerating storage ───────────────────────────────────');

  const allObjects: StorageObject[] = [];

  for (const bucket of BUCKETS) {
    console.log(`  Listing segments in ${bucket}...`);
    const segments = await listTopLevelSegments(bucket);
    console.log(`  Found ${segments.length} top-level segment(s)`);

    for (const segment of segments) {
      const objects = await listAllObjects(bucket, segment);
      for (const obj of objects) {
        allObjects.push({ segment, bucket, path: obj.fullPath, size: obj.size });
      }
    }
  }

  const totalObjects = allObjects.length;
  console.log(`  Total objects enumerated: ${totalObjects}`);

  // ── Group by (segment, bucket) ────────────────────────────────────────────
  const groups = new Map<string, StorageObject[]>();
  for (const obj of allObjects) {
    const key = `${obj.bucket}::${obj.segment}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(obj);
  }

  // ── Collect unique UUID segments to check against auth.users ──────────────
  console.log('');
  console.log('── Checking ownership ────────────────────────────────────');

  const uniqueSegments = [...new Set(allObjects.map(o => o.segment))];
  const uuidSegments   = uniqueSegments.filter(isUuid);
  const nonUuidSegments = uniqueSegments.filter(s => !isUuid(s));

  console.log(`  ${uniqueSegments.length} unique segment(s): ${uuidSegments.length} UUID, ${nonUuidSegments.length} non-UUID`);
  if (nonUuidSegments.length > 0) {
    console.log(`  Non-UUID segments (orphaned by definition): ${nonUuidSegments.join(', ')}`);
  }

  // Batch-check UUID segments against auth.users via admin.listUsers.
  // We load all users and build a Set — fine for the size of this app.
  const liveUserIds = new Set<string>();
  if (uuidSegments.length > 0) {
    console.log(`  Fetching all live auth.users to check ${uuidSegments.length} UUID segment(s)...`);

    // Paginate through all users (admin API returns max 1000 per page)
    let page = 1;
    while (true) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        throw new Error(`listUsers(page=${page}) failed: ${supabaseErrorMsg(error)}`);
      }
      const users = data?.users ?? [];
      for (const u of users) liveUserIds.add(u.id);
      if (users.length < 1000) break;
      page++;
    }

    console.log(`  Live users found: ${liveUserIds.size}`);
  }

  // ── Classify each group as live or orphaned ────────────────────────────────
  const orphanedGroups: Array<{
    segment: string;
    bucket:  string;
    objects: StorageObject[];
    reason:  string;
  }> = [];

  for (const [key, objects] of groups) {
    const { segment, bucket } = objects[0];
    let reason: string | null = null;

    if (!isUuid(segment)) {
      reason = 'not a valid UUID';
    } else if (!liveUserIds.has(segment)) {
      reason = 'no matching auth.users row';
    }

    if (reason) {
      orphanedGroups.push({ segment, bucket, objects, reason });
    }
  }

  const totalOrphanObjects = orphanedGroups.reduce((sum, g) => sum + g.objects.length, 0);
  const totalOrphanSize    = orphanedGroups.reduce((sum, g) => g.objects.reduce((s, o) => s + o.size, sum), 0);

  // ── Print orphan table ─────────────────────────────────────────────────────
  console.log('');
  console.log('── Orphaned groups ───────────────────────────────────────');

  if (orphanedGroups.length === 0) {
    console.log('  No orphaned objects found.');
  } else {
    console.log('');
    console.log(pad('Segment', 40) + pad('Bucket', 22) + pad('Objects', 10) + pad('Size (kB)', 12) + 'Reason');
    console.log('-'.repeat(105));
    for (const g of orphanedGroups) {
      const sizeKb = Math.round(g.objects.reduce((s, o) => s + o.size, 0) / 1024);
      console.log(
        pad(g.segment, 40) +
        pad(g.bucket, 22) +
        pad(String(g.objects.length), 10) +
        pad(String(sizeKb), 12) +
        g.reason
      );
    }
    console.log('');
    const totalSizeKb = Math.round(totalOrphanSize / 1024);
    console.log(`  Total orphaned: ${totalOrphanObjects} objects across ${orphanedGroups.length} segment(s), ~${totalSizeKb} kB`);
  }

  if (!confirm) {
    console.log('');
    console.log('Dry run complete. Re-run with --confirm to remove orphaned objects.');
    process.exit(0);
  }

  if (orphanedGroups.length === 0) {
    console.log('');
    console.log('No orphaned objects to remove. Exiting.');
    process.exit(0);
  }

  // ── Remove orphaned objects ────────────────────────────────────────────────
  console.log('');
  console.log('── Removing orphaned objects ─────────────────────────────');

  let totalRemoved = 0;
  let totalFailed  = 0;

  // Group paths by bucket for batch removal
  const byBucket: Record<string, string[]> = {};
  for (const g of orphanedGroups) {
    if (!byBucket[g.bucket]) byBucket[g.bucket] = [];
    byBucket[g.bucket].push(...g.objects.map(o => o.path));
  }

  for (const [bucket, paths] of Object.entries(byBucket)) {
    for (let i = 0; i < paths.length; i += BATCH_SIZE) {
      const batch = paths.slice(i, i + BATCH_SIZE);
      console.log(`  ${bucket}: removing batch [${i + 1}–${i + batch.length}] of ${paths.length}...`);

      const { data: removedList, error: removeError } = await db.storage
        .from(bucket)
        .remove(batch);

      if (removeError) {
        console.error(
          `\nERROR: storage.remove failed for bucket "${bucket}" (batch ${i + 1}–${i + batch.length}):\n` +
          `  ${supabaseErrorMsg(removeError)}`
        );
        process.exit(1);
      }

      const removedSet = new Set((removedList ?? []).map((o: any) => o.name));
      const missing    = batch.filter(p => !removedSet.has(p));

      if (missing.length > 0) {
        console.warn(`  WARNING: ${missing.length} path(s) not confirmed in response:`);
        for (const p of missing) console.warn(`    ${p}`);
        totalFailed += missing.length;
      }

      totalRemoved += (removedList ?? []).length;
    }
  }

  console.log(`  Removed: ${totalRemoved} confirmed, ${totalFailed} unconfirmed`);

  if (totalFailed > 0) {
    console.error(
      `\nERROR: ${totalFailed} object(s) were not confirmed removed. Investigate manually.`
    );
    process.exit(1);
  }

  // ── Post-removal verification ─────────────────────────────────────────────
  console.log('');
  console.log('── Post-removal verification ─────────────────────────────');

  let remainingOrphans = 0;

  for (const g of orphanedGroups) {
    const remaining = await listAllObjects(g.bucket, g.segment);
    if (remaining.length > 0) {
      console.error(`  ✗ ${g.bucket}/${g.segment}: ${remaining.length} object(s) remain`);
      remainingOrphans += remaining.length;
    } else {
      console.log(`  ✓ ${g.bucket}/${g.segment}: empty`);
    }
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════════');

  if (remainingOrphans > 0) {
    console.log(`FAILED — ${remainingOrphans} orphaned object(s) remain after removal`);
    process.exit(1);
  }

  console.log(
    `CLEANED ${totalOrphanObjects} orphaned object(s) across ` +
    `${orphanedGroups.length} segment(s), ~${Math.round(totalOrphanSize / 1024)} kB freed`
  );
  console.log('══════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\nUNHANDLED ERROR:', err);
  process.exit(1);
});
