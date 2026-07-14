/**
 * Integration test: tracker deletion does not error with 23502 and leaves
 * no orphaned child rows.
 *
 * Run with:
 *   cd packages/api && npx tsx src/tests/tracker_delete.test.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in packages/api/.env
 */
import 'dotenv/config';
import { db } from '../db/client';

// ── helpers ──────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function cleanup(ids: {
  timelineId?: string;
  checkinId?: string;
  trackerId?: string;
  plantId?: string;
  gardenId?: string;
  userId?: string;
}): Promise<void> {
  if (ids.timelineId) await db.from('plant_timeline').delete().eq('id', ids.timelineId);
  if (ids.checkinId)  await db.from('plant_tracker_checkins').delete().eq('id', ids.checkinId);
  if (ids.trackerId)  await db.from('plant_trackers').delete().eq('id', ids.trackerId);
  if (ids.plantId)    await db.from('garden_plants').delete().eq('id', ids.plantId);
  if (ids.gardenId)   await db.from('gardens').delete().eq('id', ids.gardenId);
  // Users table is managed by auth; skip cleanup of the test user row.
}

// ── main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  console.log('tracker_delete.test — start\n');

  // ── 1. Seed: create a minimal user row (using an unlikely fixed UUID) ──────
  const TEST_USER_ID = '00000000-test-0001-0000-000000000000';

  // Upsert into users (may already exist from a previous partial run)
  await db.from('users').upsert({
    id:    TEST_USER_ID,
    email: 'test-tracker-delete@example.invalid',
  }, { onConflict: 'id' });

  // ── 2. Garden ──────────────────────────────────────────────────────────────
  const { data: garden, error: gardenErr } = await db
    .from('gardens')
    .insert({ name: '__test_garden__', user_id: TEST_USER_ID })
    .select('id')
    .single();
  if (gardenErr) throw gardenErr;
  const gardenId = garden.id as string;

  // ── 3. Plant ───────────────────────────────────────────────────────────────
  const { data: plant, error: plantErr } = await db
    .from('garden_plants')
    .insert({ garden_id: gardenId, plant_name: '__test_plant__' })
    .select('id')
    .single();
  if (plantErr) { await cleanup({ gardenId }); throw plantErr; }
  const plantId = plant.id as string;

  // ── 4. Tracker ─────────────────────────────────────────────────────────────
  const { data: tracker, error: trackerErr } = await db
    .from('plant_trackers')
    .insert({
      user_id:         TEST_USER_ID,
      garden_id:       gardenId,
      garden_plants_id: plantId,
      plant_name:      '__test_plant__',
    })
    .select('id')
    .single();
  if (trackerErr) { await cleanup({ plantId, gardenId }); throw trackerErr; }
  const trackerId = tracker.id as string;

  // ── 5. Check-in ────────────────────────────────────────────────────────────
  const { data: checkin, error: checkinErr } = await db
    .from('plant_tracker_checkins')
    .insert({
      tracker_id:   trackerId,
      user_id:      TEST_USER_ID,
      checkin_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();
  if (checkinErr) { await cleanup({ trackerId, plantId, gardenId }); throw checkinErr; }
  const checkinId = checkin.id as string;

  // ── 6. Timeline entry ──────────────────────────────────────────────────────
  const { data: timeline, error: timelineErr } = await db
    .from('plant_timeline')
    .insert({
      tracker_id:  trackerId,
      user_id:     TEST_USER_ID,
      entry_type:  'note',
      note:        '__test_entry__',
    })
    .select('id')
    .single();
  if (timelineErr) { await cleanup({ checkinId, trackerId, plantId, gardenId }); throw timelineErr; }
  const timelineId = timeline.id as string;

  console.log('Seed complete:', { trackerId, checkinId, timelineId });

  // ── 7. Delete via delete_tracker() RPC — must not throw 23502 ─────────────
  const { error: rpcErr } = await (db as any).rpc('delete_tracker', {
    p_tracker_id: trackerId,
    p_user_id:    TEST_USER_ID,
  });

  if (rpcErr) {
    // Best-effort cleanup before failing
    await cleanup({ timelineId, checkinId, trackerId, plantId, gardenId });
    throw new Error(`delete_tracker RPC failed: ${rpcErr.message} (code ${rpcErr.code})`);
  }

  console.log('delete_tracker RPC succeeded (no 23502)');

  // ── 8. Assert: tracker is soft-deleted ────────────────────────────────────
  const { data: trackerRow } = await db
    .from('plant_trackers')
    .select('deleted_at')
    .eq('id', trackerId)
    .single();

  assert(trackerRow?.deleted_at !== null, 'tracker.deleted_at must be set after deletion');

  // ── 9. Assert: checkin is soft-deleted ────────────────────────────────────
  const { data: checkinRow } = await db
    .from('plant_tracker_checkins')
    .select('deleted_at')
    .eq('id', checkinId)
    .single();

  assert(checkinRow?.deleted_at !== null, 'checkin.deleted_at must be set after deletion');

  // ── 10. Assert: timeline row is soft-deleted ──────────────────────────────
  const { data: timelineRow } = await db
    .from('plant_timeline')
    .select('deleted_at')
    .eq('id', timelineId)
    .single();

  assert(timelineRow?.deleted_at !== null, 'timeline.deleted_at must be set after deletion');

  // ── 11. Assert: no live (non-deleted) checkins remain for tracker ─────────
  const { data: liveCheckins } = await db
    .from('plant_tracker_checkins')
    .select('id')
    .eq('tracker_id', trackerId)
    .is('deleted_at', null);

  assert((liveCheckins ?? []).length === 0, 'no live checkins should remain after tracker deletion');

  console.log('All assertions passed');

  // ── 12. Also test hard-delete via garden_plants cascade ───────────────────
  // Create a second tracker + checkin + timeline, then hard-delete the plant.
  // This exercises the ON DELETE CASCADE path (migration 027 fix).

  const { data: tracker2, error: t2Err } = await db
    .from('plant_trackers')
    .insert({
      user_id:         TEST_USER_ID,
      garden_id:       gardenId,
      garden_plants_id: plantId,
      plant_name:      '__test_plant_2__',
    })
    .select('id')
    .single();
  if (t2Err) { await cleanup({ plantId, gardenId }); throw t2Err; }
  const tracker2Id = tracker2.id as string;

  const { data: checkin2, error: c2Err } = await db
    .from('plant_tracker_checkins')
    .insert({
      tracker_id:   tracker2Id,
      user_id:      TEST_USER_ID,
      checkin_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();
  if (c2Err) { await cleanup({ trackerId: tracker2Id, plantId, gardenId }); throw c2Err; }
  const checkin2Id = checkin2.id as string;

  const { data: timeline2, error: tl2Err } = await db
    .from('plant_timeline')
    .insert({
      tracker_id:  tracker2Id,
      user_id:     TEST_USER_ID,
      entry_type:  'note',
      note:        '__test_cascade__',
    })
    .select('id')
    .single();
  if (tl2Err) { await cleanup({ checkinId: checkin2Id, trackerId: tracker2Id, plantId, gardenId }); throw tl2Err; }
  const timeline2Id = timeline2.id as string;

  console.log('\nCascade seed:', { tracker2Id, checkin2Id, timeline2Id });

  // Hard-delete the plant — this triggers the DB cascade chain
  const { error: cascadeErr } = await db
    .from('garden_plants')
    .delete()
    .eq('id', plantId);

  if (cascadeErr) {
    // Cleanup what might remain
    await cleanup({ plantId, gardenId });
    throw new Error(`cascade hard-delete failed: ${cascadeErr.message} (code ${cascadeErr.code})`);
  }

  console.log('Hard-delete via garden_plants cascade succeeded (no 23502)');

  // After cascade, checkin2 and timeline2 must no longer exist (hard-deleted)
  const { data: orphanCheckin } = await db
    .from('plant_tracker_checkins')
    .select('id')
    .eq('id', checkin2Id);
  assert((orphanCheckin ?? []).length === 0, 'checkin2 must be gone after plant cascade-delete');

  const { data: orphanTimeline } = await db
    .from('plant_timeline')
    .select('id')
    .eq('id', timeline2Id);
  assert((orphanTimeline ?? []).length === 0, 'timeline2 must be gone after plant cascade-delete');

  console.log('Cascade assertions passed — no orphaned rows');

  // ── 13. Cleanup ───────────────────────────────────────────────────────────
  // plantId is already deleted by the cascade above.
  await cleanup({ gardenId });
  await db.from('users').delete().eq('id', TEST_USER_ID);

  console.log('\n✓ tracker_delete.test — all tests passed');
}

run().catch((err) => {
  console.error('\n✗ tracker_delete.test — FAILED:', err.message);
  process.exit(1);
});
