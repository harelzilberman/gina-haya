/**
 * Backfill: redact PII from user_subscriptions.raw_notification on rows where
 * user_id IS NULL (rows that survived an account deletion before the deletion
 * script was updated to strip PII before removing the auth row).
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-subscription-pii.ts           # dry run — prints what would change
 *   pnpm exec tsx scripts/backfill-subscription-pii.ts --apply   # execute the redaction
 *
 * Requires DATABASE_URL in packages/api/.env (Postgres connection string).
 *
 * Known platforms and what survives:
 *   grow        → accounting fields only (transactionId, sum, paymentDate,
 *                 asmachta, processId, productData, statusCode, cField2/cField3)
 *   google_play → full payload minus externalAccountIdentifiers
 *
 * Refuses to run if any row has a platform outside these two values.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../packages/api/.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    'ERROR: DATABASE_URL not set in packages/api/.env\n' +
    'Find it at: Supabase dashboard → Settings → Database → Connection string (URI mode).'
  );
  process.exit(1);
}

try { new URL(DATABASE_URL); } catch {
  console.error('ERROR: DATABASE_URL is not a valid URL. Check for unfilled placeholders.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });

const KNOWN_PLATFORMS = new Set(['grow', 'google_play']);

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function maskPii(value: string | null | undefined): string {
  if (value === null || value === undefined) return '(null)';
  const s = String(value);
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '*'.repeat(Math.max(0, s.length - 4)) + s.slice(-2);
}

async function main() {
  const apply = process.argv.includes('--apply');

  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  backfill-subscription-pii.ts  ${apply ? '⚠️  APPLY RUN' : '(dry run)'}`);
  console.log('══════════════════════════════════════════════════════════');

  const client = await pool.connect();
  try {
    // ── 1. Count and classify orphaned rows ───────────────────────────────────
    const countResult = await client.query<{ platform: string; cnt: string }>(`
      SELECT platform, count(*) AS cnt
      FROM public.user_subscriptions
      WHERE user_id IS NULL
      GROUP BY platform
      ORDER BY platform
    `);

    const totalRows = countResult.rows.reduce((s, r) => s + Number(r.cnt), 0);
    console.log(`\nOrphaned rows (user_id IS NULL): ${totalRows}`);

    if (totalRows === 0) {
      console.log('  Nothing to do — no orphaned rows found.');
      await pool.end();
      return;
    }

    for (const { platform, cnt } of countResult.rows) {
      console.log(`  ${pad(platform, 20)} ${cnt} row(s)`);
    }

    // ── 2. Refuse if any unknown platform ─────────────────────────────────────
    const unknownPlatforms = countResult.rows
      .map(r => r.platform)
      .filter(p => !KNOWN_PLATFORMS.has(p));

    if (unknownPlatforms.length > 0) {
      console.error(
        `\nREFUSING: Found rows with unrecognised platform(s): ${unknownPlatforms.join(', ')}\n` +
        '  Add handling for these platforms in the strip SQL before running the backfill.'
      );
      await pool.end();
      process.exit(1);
    }

    // ── 3. Sample one row for before/after display ────────────────────────────
    const sampleResult = await client.query<{ id: string; platform: string; raw_notification: any }>(`
      SELECT id, platform, raw_notification
      FROM public.user_subscriptions
      WHERE user_id IS NULL AND raw_notification IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0];
      const rn = sample.raw_notification;
      console.log(`\nSample row (${sample.id}) — platform: ${sample.platform}`);

      if (sample.platform === 'grow') {
        const d = rn?.data ?? {};
        const cf = d?.customFields ?? {};
        console.log('  Before (PII masked):');
        console.log(`    data.transactionId:        ${d.transactionId ?? '(null)'}`);
        console.log(`    data.asmachta:             ${d.asmachta ?? '(null)'}`);
        console.log(`    data.sum:                  ${d.sum ?? '(null)'}`);
        console.log(`    data.payerEmail:           ${maskPii(d.payerEmail)}`);
        console.log(`    data.payerPhone:           ${maskPii(d.payerPhone)}`);
        console.log(`    data.fullName:             ${maskPii(d.fullName ?? d.payerName)}`);
        console.log(`    data.cardSuffix:           ${maskPii(d.cardSuffix)}`);
        console.log(`    data.cardExp:              ${maskPii(d.cardExp)}`);
        console.log(`    data.customFields.cField1: ${maskPii(cf.cField1)}`);
        console.log('  After: payerEmail, payerPhone, fullName, cardSuffix, cardExp, cField1 removed');
      } else if (sample.platform === 'google_play') {
        const extIds = rn?.externalAccountIdentifiers;
        console.log('  Before (PII masked):');
        console.log(`    subscriptionState:          ${rn?.subscriptionState ?? '(null)'}`);
        console.log(`    latestOrderId:              ${rn?.latestOrderId ? maskPii(String(rn.latestOrderId)) : '(not present)'}`);
        console.log(`    externalAccountIdentifiers: ${extIds ? maskPii(JSON.stringify(extIds)) : '(not present)'}`);
        console.log('  After: allow-list rebuild — keeps startTime, regionCode, subscriptionState,');
        console.log('         acknowledgementState, lineItems[productId/expiryTime/offerDetails] only');
      }
    }

    if (!apply) {
      console.log('\n  Dry run: no changes made. Re-run with --apply to execute.');
      await pool.end();
      return;
    }

    // ── 4. Apply the redaction ─────────────────────────────────────────────────
    console.log('\n── Applying redaction ────────────────────────────────────');

    const updateResult = await client.query<{ id: string; platform: string }>(`
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
                 COALESCE(raw_notification->'lineItems', '[]'::jsonb)
               ) AS elem),
              '[]'::jsonb
            )
          )
          ELSE NULL
        END
      ),
      updated_at = now()
      WHERE user_id IS NULL
      RETURNING id, platform
    `);

    for (const r of updateResult.rows) {
      console.log(`  stripped ${r.platform} ${r.id}`);
    }
    console.log(`  ${updateResult.rows.length} row(s) updated`);

    // ── 5. PII verification ───────────────────────────────────────────────────
    console.log('\n── PII verification ──────────────────────────────────────');

    const verifyResult = await client.query<{
      payer_email: string; payer_phone: string; full_name: string; payer_name: string;
      card_suffix: string; card_exp: string; grow_uuid: string; play_uuid: string;
      play_latest_order_id: string; play_gpa_token: string; total: string;
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
        count(*)                                                                      AS total
      FROM public.user_subscriptions
      WHERE user_id IS NULL
    `);

    const v = verifyResult.rows[0];
    const checks: [string, string][] = [
      ['payer_email',          v.payer_email],
      ['payer_phone',          v.payer_phone],
      ['full_name',            v.full_name],
      ['payer_name',           v.payer_name],
      ['card_suffix',          v.card_suffix],
      ['card_exp',             v.card_exp],
      ['grow_uuid',            v.grow_uuid],
      ['play_uuid',            v.play_uuid],
      ['play_latest_order_id', v.play_latest_order_id],
      ['play_gpa_token',       v.play_gpa_token],
    ];

    for (const [key, val] of checks) {
      const n = Number(val);
      console.log(`  ${pad(key, 22)} ${n === 0 ? '✓ 0' : `✗ ${n} — STILL PRESENT`}`);
    }
    console.log(`  ${pad('total rows', 22)} ${v.total}`);

    const anyFail = checks.some(([, val]) => Number(val) > 0);
    if (anyFail) {
      console.error('\nVerification FAILED — PII remains. Investigate.');
      process.exitCode = 1;
    } else {
      console.log('\nBackfill complete ✓');
    }

  } finally {
    client.release();
  }

  await pool.end();
}

main().catch(async err => {
  console.error('\nUNHANDLED ERROR:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
