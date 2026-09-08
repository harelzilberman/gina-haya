/**
 * reconcile-play-subs.ts
 *
 * Resyncs user_subscriptions rows (platform = 'google_play') against Google's
 * purchases.subscriptionsv2 API, using the stored purchase_token.
 *
 * Usage:
 *   npx tsx scripts/reconcile-play-subs.ts              # dry-run, full sweep
 *   npx tsx scripts/reconcile-play-subs.ts --apply      # write changes
 *   npx tsx scripts/reconcile-play-subs.ts --token <t>  # single row
 *   npx tsx scripts/reconcile-play-subs.ts --token <t> --apply
 *
 * Safety rules (enforced below):
 *  - Dry-run by default — --apply is required to write anything.
 *  - Skips rows with null user_id (deleted accounts).
 *  - Skips rows on any API error, 404, or unmappable response.
 *  - Never writes externalAccountIdentifiers back to a null-user_id row.
 *  - Sequential calls with 200 ms delay (quota safety).
 *  - Logs every change before writing it.
 */

import 'dotenv/config';
import { db } from '../src/db/client';
import { getAndroidPublisherClient } from '../src/services/googlePlay';
import {
  mapSubscriptionState,
  isActiveState,
  PLAY_PACKAGE_NAME,
  PLAY_PRODUCT_TO_TIER,
} from '../src/config/playProducts';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const APPLY  = args.includes('--apply');
const TOKEN  = (() => {
  const idx = args.indexOf('--token');
  return idx !== -1 ? args[idx + 1] ?? null : null;
})();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SubRow {
  id:               string;
  user_id:          string | null;
  purchase_token:   string;
  product_id:       string | null;
  status:           string | null;
  expires_at:       string | null;
  raw_notification: Record<string, unknown> | null;
}

interface RowResult {
  row:            SubRow;
  googleStatus:   string;
  googleExpiry:   string | null;
  wouldChange:    boolean;
  skipReason?:    string;
  needsReview?:   string;
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
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('');
  console.log('=== Google Play subscription reconcile ===');
  console.log(`Mode : ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`);
  console.log(`Scope: ${TOKEN ? `single token ${TOKEN}` : 'full google_play sweep'}`);
  console.log('');

  // Note: mapSubscriptionState is imported directly from playProducts.ts —
  // the same module the RTDN handler uses — so there is only one mapping.
  console.log('Status mapping: imported from src/config/playProducts.ts (mapSubscriptionState)');
  console.log('');

  // ------------------------------------------------------------------
  // 1. Fetch rows from DB
  // ------------------------------------------------------------------
  let query = db
    .from('user_subscriptions')
    .select('id, user_id, purchase_token, product_id, status, expires_at, raw_notification')
    .eq('platform', 'google_play');

  if (TOKEN) {
    query = query.eq('purchase_token', TOKEN);
  }

  const { data: rows, error: fetchError } = await query;
  if (fetchError) {
    console.error('DB fetch failed:', fetchError.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log(TOKEN ? 'No row found for that token.' : 'No google_play rows found.');
    process.exit(0);
  }

  console.log(`Found ${rows.length} google_play row(s).`);
  console.log('');

  // ------------------------------------------------------------------
  // 2. Separate null-user_id (orphaned) rows immediately
  // ------------------------------------------------------------------
  const orphans   = (rows as SubRow[]).filter(r => r.user_id === null);
  const toProcess = (rows as SubRow[]).filter(r => r.user_id !== null);

  if (orphans.length > 0) {
    console.log(`Skipping ${orphans.length} orphaned row(s) (user_id is null — deleted accounts):`);
    for (const o of orphans) {
      console.log(`  id=${o.id}  token=${o.purchase_token.slice(0, 20)}…`);
    }
    console.log('');
  }

  if (toProcess.length === 0) {
    console.log('No rows left to process after filtering orphans.');
    process.exit(0);
  }

  // ------------------------------------------------------------------
  // 3. Call Google for each row
  // ------------------------------------------------------------------

  // Instantiate once — if credentials are missing the script cannot proceed.
  let publisher: ReturnType<typeof getAndroidPublisherClient>;
  try {
    publisher = getAndroidPublisherClient();
  } catch (err: any) {
    console.error(`Cannot create Google Play client: ${err.message}`);
    console.error('Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in .env and retry.');
    process.exit(1);
  }

  const results:    RowResult[] = [];
  const needsReview: RowResult[] = [];

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

      console.log(`  [skip] id=${row.id}  ${reason}`);
      const r: RowResult = {
        row,
        googleStatus: '(unknown)',
        googleExpiry: null,
        wouldChange:  false,
        needsReview:  reason,
      };
      needsReview.push(r);
      continue;
    }

    // Validate the response shape
    const googleState = googleSub.subscriptionState;
    if (typeof googleState !== 'string') {
      const reason = `Unmappable response — subscriptionState is ${JSON.stringify(googleState)}`;
      console.log(`  [skip] id=${row.id}  ${reason}`);
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
    const lineItem     = (googleSub.lineItems as any[])?.[0] ?? {};
    const googleExpiry = (lineItem.expiryTime as string) ?? null;

    const statusChanged = googleStatus !== (row.status ?? 'unknown');
    // Normalise to seconds-precision ISO to avoid false positives from ms rounding
    const normalize = (ts: string | null) => ts ? ts.replace(/\.\d+Z$/, 'Z') : null;
    const expiryChanged = normalize(googleExpiry) !== normalize(row.expires_at);
    const wouldChange = statusChanged || expiryChanged;

    results.push({ row, googleStatus, googleExpiry, wouldChange });
  }

  // ------------------------------------------------------------------
  // 4. Print results table
  // ------------------------------------------------------------------
  console.log('--- Reconcile results ---');
  console.log('');

  const colW = {
    id:      36,
    product: 18,
    status:  28,
    expiry:  46,
    change:  7,
  };

  const pad = (s: string, w: number) => s.padEnd(w).slice(0, w);

  const header =
    pad('Row ID', colW.id) + '  ' +
    pad('Product', colW.product) + '  ' +
    pad('Status (stored → Google)', colW.status) + '  ' +
    pad('Expires (stored → Google)', colW.expiry) + '  ' +
    'Change?';
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of results) {
    const statusStr  = `${r.row.status ?? 'null'} → ${r.googleStatus}`;
    const expiryStr  = `${r.row.expires_at ?? 'null'} → ${r.googleExpiry ?? 'null'}`;
    const changeFlag = r.wouldChange ? 'YES' : 'no';
    console.log(
      pad(r.row.id, colW.id) + '  ' +
      pad(r.row.product_id ?? '(none)', colW.product) + '  ' +
      pad(statusStr, colW.status) + '  ' +
      pad(expiryStr, colW.expiry) + '  ' +
      changeFlag
    );
  }

  // ------------------------------------------------------------------
  // 5. Apply changes (if --apply)
  // ------------------------------------------------------------------
  const changes = results.filter(r => r.wouldChange);
  console.log('');
  console.log(`${changes.length} row(s) would change.`);

  if (!APPLY) {
    if (changes.length > 0) {
      console.log('Re-run with --apply to write these changes.');
    }
  } else {
    if (changes.length === 0) {
      console.log('Nothing to update.');
    }
    for (const r of changes) {
      // --- Re-fetch fresh Google data for apply (we already have it; use cached) ---
      // Re-fetch the live sub payload so raw_notification is accurate at write time.
      let freshSub: Record<string, unknown>;
      try {
        await sleep(200);
        const resp = await publisher.purchases.subscriptionsv2.get({
          packageName: PLAY_PACKAGE_NAME,
          token:       r.row.purchase_token,
        });
        freshSub = resp.data as Record<string, unknown>;
      } catch (err: any) {
        console.error(`  [error] id=${r.row.id}  re-fetch failed — skipping write: ${err?.message}`);
        needsReview.push({ ...r, needsReview: `Re-fetch for apply failed: ${err?.message}` });
        continue;
      }

      // Safety: never write externalAccountIdentifiers to an orphaned row.
      // user_id is non-null for all rows in `changes` (orphans were filtered out),
      // but assert explicitly as a belt-and-suspenders guard.
      try {
        assertNoEAIOnOrphan(r.row.user_id, freshSub);
      } catch (safetyErr: any) {
        console.error(`  [SAFETY ABORT] id=${r.row.id}  ${safetyErr.message}`);
        needsReview.push({ ...r, needsReview: safetyErr.message });
        continue;
      }

      console.log(
        `  [apply] id=${r.row.id}` +
        `  status: ${r.row.status ?? 'null'} → ${r.googleStatus}` +
        `  expires_at: ${r.row.expires_at ?? 'null'} → ${r.googleExpiry ?? 'null'}`
      );

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
        console.error(`  [error] id=${r.row.id}  DB update failed: ${updateError.message}`);
        needsReview.push({ ...r, needsReview: `DB update failed: ${updateError.message}` });
      } else {
        console.log(`  [done]  id=${r.row.id}`);
      }
    }
  }

  // ------------------------------------------------------------------
  // 6. Needs-manual-review summary
  // ------------------------------------------------------------------
  if (needsReview.length > 0) {
    console.log('');
    console.log('--- Needs manual review ---');
    for (const r of needsReview) {
      console.log(`  id=${r.row.id}  token=${r.row.purchase_token.slice(0, 24)}…  reason: ${r.needsReview}`);
    }
  }

  console.log('');
  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
