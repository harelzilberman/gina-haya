/**
 * reconcilePlaySubs.ts
 *
 * Core reconcile logic for Google Play subscriptions, extracted from the CLI
 * script so it can be called in-process by the scheduled cron job.
 *
 * Design constraints:
 *  - No process.exit() anywhere in this file. Fatal conditions throw; the caller
 *    handles them. A thrown error must never kill the API server.
 *  - No process.argv. Dry-run is a parameter; apply must be opted into explicitly.
 *  - Returns a structured result. This function does not print tables.
 *  - Decision logic is identical to the original CLI script — every skip condition
 *    survives verbatim. Do not improve it here; changes belong in their own commit.
 */

import { db } from '../db/client';
import { getAndroidPublisherClient } from './googlePlay';
import {
  mapSubscriptionState,
  PLAY_PACKAGE_NAME,
} from '../config/playProducts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SubRow {
  id:               string;
  user_id:          string | null;
  purchase_token:   string;
  product_id:       string | null;
  status:           string | null;
  expires_at:       string | null;
  raw_notification: Record<string, unknown> | null;
}

export interface RowResult {
  row:          SubRow;
  googleStatus: string;
  googleExpiry: string | null;
  wouldChange:  boolean;
  skipReason?:  string;
  needsReview?: string;
}

export interface ReconcileResult {
  /** All rows that went through the Google API (orphans excluded). */
  rows:        RowResult[];
  /** Rows skipped because user_id is null (deleted accounts). */
  orphans:     SubRow[];
  /** Number of rows actually written to DB. Non-zero only when apply=true. */
  changed:     number;
  /** Rows that need manual attention: API errors, unmapped states, DB failures. */
  needsReview: RowResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Redact-aware safety check: must never write externalAccountIdentifiers back
 *  to a row whose user_id is null (deletion-orphaned rows). */
function assertNoEAIOnOrphan(userId: string | null, payload: Record<string, unknown>): void {
  if (userId === null && 'externalAccountIdentifiers' in payload) {
    throw new Error(
      'SAFETY: attempted to write externalAccountIdentifiers to a null-user_id row. Aborting this row.'
    );
  }
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------
export async function reconcilePlaySubs(opts: {
  /**
   * When false (default), no DB writes are made — safe to call for inspection.
   * Set to true only when writes are intentional.
   */
  apply:      boolean;
  /**
   * Scope the sweep to a single purchase token. Null (default) = full sweep
   * of all google_play rows (or the staleOnly subset if staleOnly is true).
   */
  token?:     string | null;
  /**
   * When true, query only rows where status is 'active' or 'grace_period'
   * AND expires_at is more than 25 hours in the past. Used by the scheduled
   * job to avoid a full table sweep on every daily run.
   * Default: false (full sweep).
   */
  staleOnly?: boolean;
}): Promise<ReconcileResult> {

  // ------------------------------------------------------------------
  // 1. Fetch rows from DB
  // ------------------------------------------------------------------
  let query = db
    .from('user_subscriptions')
    .select('id, user_id, purchase_token, product_id, status, expires_at, raw_notification')
    .eq('platform', 'google_play');

  if (opts.token) {
    query = query.eq('purchase_token', opts.token);
  }

  if (opts.staleOnly) {
    // 25 hours: one full renewal cycle plus an hour of grace time. Any active/
    // grace row that has not been refreshed by RTDN within this window is a
    // candidate for drift correction. Today this returns zero rows.
    const staleThreshold = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    query = query
      .in('status', ['active', 'grace_period'])
      .lt('expires_at', staleThreshold);
  }

  const { data: rows, error: fetchError } = await query;

  if (fetchError) {
    // Throw so the cron job can record this as an error heartbeat.
    throw new Error(`DB fetch failed: ${fetchError.message}`);
  }

  if (!rows || rows.length === 0) {
    return { rows: [], orphans: [], changed: 0, needsReview: [] };
  }

  // ------------------------------------------------------------------
  // 2. Separate null-user_id (orphaned) rows immediately
  // ------------------------------------------------------------------
  const orphans   = (rows as SubRow[]).filter(r => r.user_id === null);
  const toProcess = (rows as SubRow[]).filter(r => r.user_id !== null);

  if (toProcess.length === 0) {
    return { rows: [], orphans, changed: 0, needsReview: [] };
  }

  // ------------------------------------------------------------------
  // 3. Instantiate Google Play client
  //    Throw if credentials are missing — the cron job records this as
  //    an error heartbeat and alerts; it does not crash the API server.
  // ------------------------------------------------------------------
  let publisher: ReturnType<typeof getAndroidPublisherClient>;
  try {
    publisher = getAndroidPublisherClient();
  } catch (err: any) {
    throw new Error(
      `Cannot create Google Play client: ${err.message}. ` +
      `Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in the environment.`
    );
  }

  const results:     RowResult[] = [];
  const needsReview: RowResult[] = [];

  // ------------------------------------------------------------------
  // 4. Call Google for each row
  // ------------------------------------------------------------------
  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    if (i > 0) await sleep(200); // rate-limit: 200 ms between calls

    let googleSub: Record<string, unknown>;
    try {
      const resp = await publisher.purchases.subscriptionsv2.get({
        packageName: PLAY_PACKAGE_NAME,
        token:       row.purchase_token,
      });
      googleSub = resp.data as Record<string, unknown>;
    } catch (err: any) {
      const isNotFound =
        err?.response?.status === 404 ||
        err?.status === 404 ||
        err?.code === 404 ||
        String(err?.message ?? '').toLowerCase().includes('not found');

      const reason = isNotFound
        ? 'Google 404 — token not found (may be purged after expiry)'
        : `API error: ${err?.message ?? String(err)}`;

      needsReview.push({
        row,
        googleStatus: '(unknown)',
        googleExpiry: null,
        wouldChange:  false,
        needsReview:  reason,
      });
      continue;
    }

    // Validate the response shape
    const googleState = googleSub.subscriptionState;
    if (typeof googleState !== 'string') {
      const reason = `Unmappable response — subscriptionState is ${JSON.stringify(googleState)}`;
      needsReview.push({
        row,
        googleStatus: '(unmappable)',
        googleExpiry: null,
        wouldChange:  false,
        needsReview:  reason,
      });
      continue;
    }

    const googleStatus = mapSubscriptionState(googleState);

    // Skip rows whose state maps to 'unknown' — this means Google returned a state
    // string not in mapSubscriptionState's switch. Writing 'unknown' to the DB would
    // overwrite a good status. Log the unmapped value so a new Google state is
    // discoverable rather than silently absorbed.
    if (googleStatus === 'unknown') {
      const reason = `Unmapped subscriptionState '${googleState}' — skipping to avoid writing unknown status`;
      needsReview.push({
        row,
        googleStatus: '(unmapped)',
        googleExpiry: null,
        wouldChange:  false,
        needsReview:  reason,
      });
      continue;
    }

    const lineItem     = (googleSub.lineItems as any[])?.[0] ?? {};
    const googleExpiry = (lineItem.expiryTime as string) ?? null;

    const statusChanged = googleStatus !== (row.status ?? 'unknown');
    // Normalise to seconds-precision ISO to avoid false positives from ms rounding
    const normalize     = (ts: string | null) => ts ? ts.replace(/\.\d+Z$/, 'Z') : null;
    const expiryChanged = normalize(googleExpiry) !== normalize(row.expires_at);
    const wouldChange   = statusChanged || expiryChanged;

    results.push({ row, googleStatus, googleExpiry, wouldChange });
  }

  // ------------------------------------------------------------------
  // 5. Apply changes (if opts.apply)
  // ------------------------------------------------------------------
  let changedCount = 0;
  if (opts.apply) {
    const toChange = results.filter(r => r.wouldChange);
    for (const r of toChange) {
      // Re-fetch live Google data so raw_notification is accurate at write time.
      let freshSub: Record<string, unknown>;
      try {
        await sleep(200);
        const resp = await publisher!.purchases.subscriptionsv2.get({
          packageName: PLAY_PACKAGE_NAME,
          token:       r.row.purchase_token,
        });
        freshSub = resp.data as Record<string, unknown>;
      } catch (err: any) {
        needsReview.push({ ...r, needsReview: `Re-fetch for apply failed: ${err?.message}` });
        continue;
      }

      // Safety: never write externalAccountIdentifiers to an orphaned row.
      // user_id is non-null for all rows in toChange (orphans were filtered out above),
      // but assert explicitly as a belt-and-suspenders guard.
      try {
        assertNoEAIOnOrphan(r.row.user_id, freshSub);
      } catch (safetyErr: any) {
        needsReview.push({ ...r, needsReview: safetyErr.message });
        continue;
      }

      const { error: updateError } = await db
        .from('user_subscriptions')
        .update({
          status:           r.googleStatus,
          expires_at:       r.googleExpiry,
          raw_notification: freshSub,
          updated_at:       new Date().toISOString(),
        })
        .eq('id', r.row.id);

      if (updateError) {
        needsReview.push({ ...r, needsReview: `DB update failed: ${updateError.message}` });
      } else {
        changedCount++;
      }
    }
  }

  return {
    rows:        results,
    orphans,
    changed:     changedCount,
    needsReview,
  };
}
