/**
 * reconcile-play-subs.ts  — CLI wrapper
 *
 * Thin wrapper around reconcilePlaySubs() from src/services/reconcilePlaySubs.ts.
 * Parses argv, runs the reconcile, and prints the human-readable table that
 * Chopchu already relies on. Command-line interface is unchanged from before extraction.
 *
 * Usage:
 *   npx tsx scripts/reconcile-play-subs.ts              # dry-run, full sweep
 *   npx tsx scripts/reconcile-play-subs.ts --apply      # write changes
 *   npx tsx scripts/reconcile-play-subs.ts --token <t>  # single row
 *   npx tsx scripts/reconcile-play-subs.ts --token <t> --apply
 *
 * Safety rules (enforced inside reconcilePlaySubs):
 *  - Dry-run by default — --apply is required to write anything.
 *  - Skips rows with null user_id (deleted accounts).
 *  - Skips rows on any API error, 404, or unmappable response.
 *  - Never writes externalAccountIdentifiers back to a null-user_id row.
 *  - Sequential calls with 200 ms delay (quota safety).
 */

import 'dotenv/config';
import { reconcilePlaySubs } from '../src/services/reconcilePlaySubs';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args  = process.argv.slice(2);
const APPLY = args.includes('--apply');
const TOKEN = (() => {
  const idx = args.indexOf('--token');
  return idx !== -1 ? args[idx + 1] ?? null : null;
})();

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

  let result;
  try {
    result = await reconcilePlaySubs({ apply: APPLY, token: TOKEN });
  } catch (err: any) {
    console.error('Fatal:', err.message ?? String(err));
    process.exit(1);
  }

  const { rows, orphans, changed, needsReview } = result;
  const totalFound = rows.length + orphans.length + needsReview.filter(r => r.row.user_id !== null).length;

  if (totalFound === 0 && orphans.length === 0) {
    console.log(TOKEN ? 'No row found for that token.' : 'No google_play rows found.');
    process.exit(0);
  }

  console.log(`Found ${totalFound + orphans.length} google_play row(s).`);
  console.log('');

  // Orphan summary (individual rows, matching original output)
  if (orphans.length > 0) {
    console.log(`Skipping ${orphans.length} orphaned row(s) (user_id is null — deleted accounts):`);
    for (const o of orphans) {
      console.log(`  id=${o.id}  token=${o.purchase_token.slice(0, 20)}…`);
    }
    console.log('');
  }

  if (rows.length === 0 && needsReview.length === 0) {
    console.log('No rows left to process after filtering orphans.');
    process.exit(0);
  }

  // Results table
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

  for (const r of rows) {
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

  // Changes summary and apply output
  const changes = rows.filter(r => r.wouldChange);
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
    // Reconstruct per-row apply log from the result
    for (const r of changes) {
      const failed = needsReview.find(nr => nr.row.id === r.row.id && nr.needsReview);
      console.log(
        `  [apply] id=${r.row.id}` +
        `  status: ${r.row.status ?? 'null'} → ${r.googleStatus}` +
        `  expires_at: ${r.row.expires_at ?? 'null'} → ${r.googleExpiry ?? 'null'}`
      );
      if (failed) {
        console.error(`  [error] id=${r.row.id}  ${failed.needsReview}`);
      } else {
        console.log(`  [done]  id=${r.row.id}`);
      }
    }
  }

  // Needs-review summary
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
