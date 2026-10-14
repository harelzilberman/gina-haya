import 'dotenv/config';
import crypto from 'crypto';
import { Router, type IRouter, type Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { TIER_PRICING } from '@gina-haya/shared';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { sendGrantFailureAlert } from '../services/email';
import { getAndroidPublisherClient } from '../services/googlePlay';
import {
  PLAY_PRODUCT_TO_TIER,
  PLAY_PACKAGE_NAME,
  TIER_LABEL_HE,
  mapSubscriptionState,
  isActiveState,
  extractBasePlanId,
} from '../config/playProducts';
import { acknowledgeIfNeeded } from '../services/playAck';
import { grantCredits } from './shop';

export const billingRouter: IRouter = Router();

const TIER_ORDER = ['free', 'gardener_pro', 'advanced', 'professional'];

const oidcClient = new OAuth2Client();

// ── Lemon Squeezy helpers ─────────────────────────────────────────────────────

const LS_API_BASE = 'https://api.lemonsqueezy.com/v1';

function lsHeaders(): Record<string, string> {
  return {
    'Accept':        'application/vnd.api+json',
    'Content-Type':  'application/vnd.api+json',
    'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
  };
}

function lsConfigured(): boolean {
  return !!(process.env.LEMONSQUEEZY_API_KEY && process.env.LEMONSQUEEZY_STORE_ID);
}

/** Build variant_id → { tier, interval } map from env vars at startup. */
function buildVariantMap(): Record<string, { tier: string; interval: 'monthly' | 'yearly' }> {
  const pairs: Array<[string | undefined, string, 'monthly' | 'yearly']> = [
    [process.env.LEMONSQUEEZY_VARIANT_GARDENER_PRO_MONTHLY, 'gardener_pro', 'monthly'],
    [process.env.LEMONSQUEEZY_VARIANT_GARDENER_PRO_YEARLY,  'gardener_pro', 'yearly'],
    [process.env.LEMONSQUEEZY_VARIANT_ADVANCED_MONTHLY,      'advanced',     'monthly'],
    [process.env.LEMONSQUEEZY_VARIANT_ADVANCED_YEARLY,       'advanced',     'yearly'],
    [process.env.LEMONSQUEEZY_VARIANT_PROFESSIONAL_MONTHLY,  'professional', 'monthly'],
    [process.env.LEMONSQUEEZY_VARIANT_PROFESSIONAL_YEARLY,   'professional', 'yearly'],
  ];
  const map: Record<string, { tier: string; interval: 'monthly' | 'yearly' }> = {};
  for (const [id, tier, interval] of pairs) {
    if (id) map[id] = { tier, interval };
  }
  return map;
}

const VARIANT_MAP = buildVariantMap();

function getVariantId(tier: string, interval: 'monthly' | 'yearly'): string | undefined {
  const key = `LEMONSQUEEZY_VARIANT_${tier.toUpperCase()}_${interval.toUpperCase()}`;
  return process.env[key];
}

/** LS subscription statuses that grant paid tier access. */
export const LS_ACTIVE_STATUSES = new Set(['active', 'on_trial', 'past_due']);

/**
 * Maps a Lemon Squeezy subscription status to the tier action to take.
 * Returns { newTier: string } — the tier to set on users.subscription_tier.
 * Returns { newTier: null } to leave the tier unchanged.
 */
export function lsStatusToTierAction(
  status: string,
  endsAt: string | null,
  tier: string,
): { newTier: string | null } {
  if (LS_ACTIVE_STATUSES.has(status)) {
    return { newTier: tier };
  }
  if (status === 'cancelled') {
    // Keep access until period end
    if (endsAt && new Date(endsAt) > new Date()) {
      return { newTier: tier };
    }
    return { newTier: 'free' };
  }
  if (status === 'expired' || status === 'unpaid') {
    return { newTier: 'free' };
  }
  // Unknown status — leave unchanged
  return { newTier: null };
}

// ── POST /api/billing/checkout ────────────────────────────────────────────────
// Creates a Lemon Squeezy checkout session for a subscription upgrade.
billingRouter.post('/checkout', verifyToken, async (req: any, res) => {
  try {
    if (!lsConfigured()) {
      res.status(503).json({ error: 'payments not configured' });
      return;
    }

    const { tier, interval = 'monthly' } = req.body as {
      tier?: string;
      interval?: 'monthly' | 'yearly';
    };

    if (!tier || !TIER_ORDER.includes(tier) || tier === 'free') {
      res.status(400).json({ error: 'Invalid tier' });
      return;
    }

    const variantId = getVariantId(tier, interval);
    if (!variantId) {
      res.status(503).json({ error: 'payments not configured for this tier/interval' });
      return;
    }

    const origin = req.headers.origin ?? 'https://gina-haya.com';

    const lsRes = await fetch(`${LS_API_BASE}/checkouts`, {
      method:  'POST',
      headers: lsHeaders(),
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          relationships: {
            store:   { data: { type: 'stores',   id: process.env.LEMONSQUEEZY_STORE_ID } },
            variant: { data: { type: 'variants',  id: variantId } },
          },
          attributes: {
            checkout_data: {
              email:  req.user.email,
              custom: {
                user_id:  req.user.id,
                kind:     'subscription',
                tier,
                interval,
              },
            },
            product_options: {
              redirect_url: `${origin}/billing?status=success`,
            },
          },
        },
      }),
    });

    const body = await lsRes.json() as any;
    if (!lsRes.ok) {
      console.error('[POST /api/billing/checkout] LS error:', lsRes.status, JSON.stringify(body));
      res.status(502).json({ error: 'Checkout creation failed' });
      return;
    }

    const checkoutUrl: string | undefined = body?.data?.attributes?.url;
    if (!checkoutUrl) {
      console.error('[POST /api/billing/checkout] No checkout URL in LS response:', body);
      res.status(502).json({ error: 'Checkout creation failed' });
      return;
    }

    res.json({ checkoutUrl });
  } catch (err: any) {
    console.error('[POST /api/billing/checkout]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/billing/status ───────────────────────────────────────────────────
billingRouter.get('/status', verifyToken, async (req: any, res) => {
  try {
    const [userRow, subRow] = await Promise.all([
      db.from('users').select('subscription_tier').eq('id', req.user.id).single(),
      db.from('user_subscriptions')
        .select('platform, status, expires_at, raw_notification')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (userRow.error || !userRow.data) throw new Error('User not found');

    const tier: string = userRow.data.subscription_tier ?? 'free';
    const monthlyPrice = TIER_PRICING[tier]?.monthly ?? null;
    const sub = subRow.data;

    const isActive = tier !== 'free';
    const platform: string | null = sub?.platform ?? null;
    const cancelAt: string | null = sub?.expires_at ?? null;

    let portalUrl: string | null = null;
    if (platform === 'lemonsqueezy' && sub?.raw_notification) {
      try {
        const raw = typeof sub.raw_notification === 'string'
          ? JSON.parse(sub.raw_notification)
          : sub.raw_notification;
        portalUrl = raw?.data?.attributes?.urls?.customer_portal ?? null;
      } catch {
        // non-fatal
      }
    }

    res.json({ tier, monthlyPrice, isActive, platform, cancelAt, portalUrl });
  } catch (err: any) {
    console.error('[GET /api/billing/status]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/cancel ──────────────────────────────────────────────────
// Lemon Squeezy: calls DELETE /v1/subscriptions/:id (cancels at period end).
// Google Play: returns 400 — must be cancelled in the Play Store.
billingRouter.post('/cancel', verifyToken, async (req: any, res) => {
  console.log(`[POST /api/billing/cancel] invoked user=${(req as any).user?.id}`);
  try {
    // Find the most recent active Lemon Squeezy subscription
    const { data: lsSub } = await db
      .from('user_subscriptions')
      .select('purchase_token, expires_at, product_id, status')
      .eq('user_id', req.user.id)
      .eq('platform', 'lemonsqueezy')
      .in('status', ['active', 'on_trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lsSub) {
      if (!lsConfigured()) {
        res.status(503).json({ error: 'payments not configured' });
        return;
      }

      // DELETE /v1/subscriptions/:id cancels at period end
      const lsRes = await fetch(`${LS_API_BASE}/subscriptions/${lsSub.purchase_token}`, {
        method:  'DELETE',
        headers: lsHeaders(),
      });

      if (!lsRes.ok) {
        const errBody = await lsRes.json().catch(() => ({}));
        console.error('[POST /api/billing/cancel] LS DELETE error:', lsRes.status, errBody);
        res.status(502).json({ error: 'Cancellation failed' });
        return;
      }

      const respBody = await lsRes.json().catch(() => ({})) as any;
      const endsAt: string | null =
        respBody?.data?.attributes?.ends_at ?? lsSub.expires_at ?? null;

      await db
        .from('user_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('purchase_token', lsSub.purchase_token);

      console.log(
        `[POST /api/billing/cancel] LS cancelled: user=${req.user.id} ` +
        `subId=${lsSub.purchase_token} endsAt=${endsAt}`
      );

      res.json({ success: true, cancelAt: endsAt });
      return;
    }

    // Google Play — not cancellable via web
    const { data: playSub } = await db
      .from('user_subscriptions')
      .select('platform')
      .eq('user_id', req.user.id)
      .eq('platform', 'google_play')
      .in('status', ['active', 'grace_period'])
      .limit(1)
      .maybeSingle();

    if (playSub) {
      res.status(400).json({ error: 'Google Play subscriptions must be cancelled through the Play Store' });
      return;
    }

    res.status(400).json({ error: 'No active subscription found' });
  } catch (err: any) {
    console.error('[POST /api/billing/cancel]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/lemon/webhook ──────────────────────────────────────────
// PUBLIC route — no Bearer token.
// Mounted with express.raw({ type: '*/*' }) in index.ts BEFORE express.json().
billingRouter.post('/lemon/webhook', async (req: Request, res) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[lemon/webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const rawBody = req.body as Buffer;
  const signatureHeader = req.headers['x-signature'] as string | undefined;

  if (!signatureHeader) {
    console.warn('[lemon/webhook] Missing X-Signature header');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  let sigValid = false;
  try {
    const headerBuf   = Buffer.from(signatureHeader, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (headerBuf.length === expectedBuf.length) {
      sigValid = crypto.timingSafeEqual(headerBuf, expectedBuf);
    }
  } catch {
    sigValid = false;
  }

  if (!sigValid) {
    console.warn('[lemon/webhook] Invalid signature');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Parse payload before sending response so we can log parse errors
  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (parseErr: any) {
    console.error('[lemon/webhook] Failed to parse body:', parseErr.message);
    res.json({ received: true });
    return;
  }

  const eventName: string =
    (req.headers['x-event-name'] as string | undefined) ??
    payload?.meta?.event_name ??
    'unknown';

  console.log(`[lemon/webhook] event=${eventName}`);

  // Always 200 after valid signature — never let handler errors cause retries
  res.json({ received: true });

  try {
    const meta       = payload?.meta ?? {};
    const dataAttr   = payload?.data?.attributes ?? {};
    const customData = meta.custom_data ?? {};

    // ── Resolve user ────────────────────────────────────────────────────────
    let userId: string | null = customData.user_id ?? null;
    const payerEmail: string | undefined =
      dataAttr.user_email ??
      dataAttr.billing_address?.email;

    if (!userId && payerEmail) {
      const { data: userRow } = await db
        .from('users')
        .select('id')
        .eq('email', payerEmail)
        .maybeSingle();
      userId = userRow?.id ?? null;
    }

    if (!userId) {
      console.log(
        `[lemon/webhook] Could not resolve user — ` +
        `custom.user_id=${customData.user_id ?? '(unset)'} ` +
        `email=${payerEmail ?? '(unset)'} — acking`
      );
      return;
    }

    // ── order_created (credit purchase) ────────────────────────────────────
    if (eventName === 'order_created') {
      if (customData.kind !== 'credits' || dataAttr.status !== 'paid') {
        console.log(
          `[lemon/webhook] order_created skipped: ` +
          `kind=${customData.kind} status=${dataAttr.status}`
        );
        return;
      }

      const orderId: string = String(payload?.data?.id);
      const productId: string | undefined = customData.product_id;

      if (!productId) {
        console.error(
          `[lemon/webhook] order_created: missing product_id in custom_data orderId=${orderId}`
        );
        return;
      }

      // Idempotency: skip if already processed
      const { data: existingPurchase } = await db
        .from('user_purchases')
        .select('id')
        .eq('payment_ref', orderId)
        .maybeSingle();

      if (existingPurchase) {
        console.log(`[lemon/webhook] order_created duplicate orderId=${orderId} — skipping`);
        return;
      }

      const pricePaid = (dataAttr.total ?? 0) / 100;
      const currency: string = dataAttr.currency ?? 'USD';

      const { error: purchaseError } = await db.from('user_purchases').insert({
        user_id:          userId,
        product_id:       productId,
        quantity:         1,
        price_paid:       pricePaid,
        currency,
        status:           'completed',
        payment_provider: 'lemonsqueezy',
        payment_ref:      orderId,
        purchase_token:   orderId,
        completed_at:     new Date().toISOString(),
      });

      if (purchaseError) {
        console.error(
          `[lemon/webhook] user_purchases insert FAILED user=${userId} orderId=${orderId}:`,
          purchaseError
        );
      }

      try {
        await grantCredits(userId, productId as any, 1);
        console.log(`[lemon/webhook] credits granted user=${userId} product=${productId}`);
      } catch (creditErr: any) {
        console.error(
          `[lemon/webhook] credit grant FAILED user=${userId} product=${productId}:`,
          creditErr.message
        );
        await sendGrantFailureAlert({
          context:       'credit_grant',
          userId,
          userEmail:     payerEmail,
          productOrTier: productId,
          quantity:      1,
          transactionId: orderId,
          provider:      'lemonsqueezy',
          errorMessage:  creditErr.message,
        });
      }
      return;
    }

    // ── subscription events ─────────────────────────────────────────────────
    const SUBSCRIPTION_EVENTS = new Set([
      'subscription_created',
      'subscription_updated',
      'subscription_resumed',
      'subscription_cancelled',
      'subscription_expired',
      'subscription_payment_success',
    ]);

    if (!SUBSCRIPTION_EVENTS.has(eventName)) {
      console.log(`[lemon/webhook] Unhandled event: ${eventName}`);
      return;
    }

    const subscriptionId: string = String(payload?.data?.id);
    const lsStatus: string = dataAttr.status ?? 'unknown';
    const variantId: string = String(dataAttr.variant_id ?? '');

    // Resolve tier: prefer custom_data.tier, fallback to variant map
    let tier: string | null = customData.tier ?? null;
    if (!tier || !TIER_ORDER.includes(tier)) {
      tier = VARIANT_MAP[variantId]?.tier ?? null;
    }

    const interval: 'monthly' | 'yearly' =
      VARIANT_MAP[variantId]?.interval ??
      (customData.interval === 'yearly' ? 'yearly' : 'monthly');

    const expiresAt: string | null = dataAttr.ends_at ?? dataAttr.renews_at ?? null;

    // Upsert user_subscriptions
    const { error: upsertError } = await db.from('user_subscriptions').upsert(
      {
        user_id:          userId,
        platform:         'lemonsqueezy',
        purchase_token:   subscriptionId,
        product_id:       tier,
        base_plan_id:     interval,
        expires_at:       expiresAt,
        status:           lsStatus,
        acknowledged:     true,
        raw_notification: payload,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'purchase_token' }
    );

    if (upsertError) {
      console.error(
        `[lemon/webhook] user_subscriptions upsert FAILED user=${userId} subId=${subscriptionId}:`,
        upsertError
      );
      // Don't abort — still attempt tier update
    }

    if (!tier) {
      console.warn(
        `[lemon/webhook] Could not resolve tier for subId=${subscriptionId} ` +
        `variantId=${variantId} custom.tier=${customData.tier ?? '(unset)'} — tier not updated`
      );
      return;
    }

    const { newTier } = lsStatusToTierAction(lsStatus, expiresAt, tier);

    if (newTier === null) {
      console.log(`[lemon/webhook] event=${eventName} status=${lsStatus} — tier unchanged`);
      return;
    }

    const { data: tierUpdateRows, error: tierUpdateError } = await db
      .from('users')
      .update({
        subscription_tier: newTier,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id');

    if (tierUpdateError) {
      console.error(
        `[lemon/webhook] users.update FAILED user=${userId} tier=${newTier}:`,
        tierUpdateError
      );
      await sendGrantFailureAlert({
        context:       'tier_grant',
        userId,
        userEmail:     payerEmail,
        productOrTier: tier,
        transactionId: subscriptionId,
        provider:      'lemonsqueezy',
        errorMessage:  tierUpdateError.message,
      });
    } else if (!tierUpdateRows || tierUpdateRows.length === 0) {
      console.error(
        `[lemon/webhook] users.update ZERO ROWS user=${userId} — user not found`
      );
      await sendGrantFailureAlert({
        context:       'tier_grant',
        userId,
        userEmail:     payerEmail,
        productOrTier: tier,
        transactionId: subscriptionId,
        provider:      'lemonsqueezy',
        errorMessage:  'users.update affected 0 rows — user not found',
      });
    } else {
      console.log(
        `[lemon/webhook] user=${userId} subId=${subscriptionId} ` +
        `lsStatus=${lsStatus} → tier=${newTier}`
      );
    }
  } catch (handlerErr: any) {
    console.error('[lemon/webhook] handler error:', handlerErr);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE PLAY BILLING
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /api/billing/play/verify ─────────────────────────────────────────────
// Called by the Flutter app right after a Play purchase completes.
// Verifies the purchase token with Google, updates tier, acknowledges the purchase.
billingRouter.post('/play/verify', verifyToken, async (req: any, res) => {
  try {
    const { purchaseToken, productId } = req.body as {
      purchaseToken?: string;
      productId?: string;
    };

    if (!purchaseToken || !productId) {
      res.status(400).json({ error: 'purchaseToken and productId are required' });
      return;
    }

    const tier = PLAY_PRODUCT_TO_TIER[productId];
    if (!tier) {
      res.status(400).json({ error: `Unknown Play product: ${productId}` });
      return;
    }

    let publisher: ReturnType<typeof getAndroidPublisherClient>;
    try {
      publisher = getAndroidPublisherClient();
    } catch (err: any) {
      res.status(503).json({ error: err.message });
      return;
    }

    // Fetch subscription state from Google (source of truth)
    let sub: any;
    try {
      const resp = await publisher.purchases.subscriptionsv2.get({
        packageName: PLAY_PACKAGE_NAME,
        token: purchaseToken,
      });
      sub = resp.data;
    } catch (err: any) {
      console.error('[play/verify] Google API error:', err.message);
      res.status(502).json({ error: 'Could not verify purchase with Google' });
      return;
    }

    const userId: string = req.user.id;
    const lineItem = sub.lineItems?.[0] ?? {};
    const expiresAt: string | null = lineItem.expiryTime ?? null;
    const status = mapSubscriptionState(sub.subscriptionState);
    const basePlanId = extractBasePlanId(sub);

    // Security: reject token already claimed by a different live user.
    // Three cases — keep them explicit; the distinction is the whole point:
    //   A. existing.user_id === userId     → same user re-registering; fall through (idempotent)
    //   B. existing.user_id !== null/userId → different live user; 409
    //   C. existing.user_id === null        → orphaned row (prior owner deleted their account);
    //                                         adopt it — the upsert below re-associates the row
    //                                         with the new user and repopulates raw_notification.
    const { data: existing } = await db
      .from('user_subscriptions')
      .select('id, user_id')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (existing) {
      if (existing.user_id === null) {
        // Case C — adopt
        const maskedToken = purchaseToken.slice(0, 12) + '…';
        console.log(
          `[play/verify] adopting orphaned subscription row ` +
          `row=${existing.id} user=${userId} token=${maskedToken}`
        );
        // Fall through to upsert; upsert writes user_id so no separate UPDATE is needed.
      } else if (existing.user_id !== userId) {
        // Case B — real conflict
        res.status(409).json({ error: 'Purchase token already associated with another account' });
        return;
      }
      // Case A — same user, fall through
    }

    if (!isActiveState(sub.subscriptionState)) {
      // Pending payment (slow method). Record the token against this user BEFORE
      // returning 402, so that when the payment settles the RTDN handler (or the
      // reconcile cron) can find the owner, grant the tier and acknowledge —
      // without depending on the user reopening the app within Google's 3-day
      // auto-refund window. No tier is granted here.
      if (status === 'pending') {
        const { error: pendingErr } = await db.from('user_subscriptions').upsert(
          {
            user_id:          userId,
            platform:         'google_play',
            purchase_token:   purchaseToken,
            product_id:       productId,
            base_plan_id:     basePlanId,
            expires_at:       expiresAt,
            status:           'pending',
            acknowledged:     false,
            raw_notification: sub,
            updated_at:       new Date().toISOString(),
          },
          { onConflict: 'purchase_token' }
        );
        if (pendingErr) {
          console.error(
            `[play/verify] pending row upsert FAILED user=${userId} productId=${productId} ` +
            `token=${purchaseToken.slice(0, 20)}:`, pendingErr
          );
          await sendGrantFailureAlert({
            context:       'tier_grant',
            userId,
            userEmail:     undefined,
            productOrTier: `${productId} (${tier}, pending)`,
            transactionId: purchaseToken.slice(0, 20),
            provider:      'google_play',
            errorMessage:  `pending row not recorded: ${pendingErr.message}`,
          });
        } else {
          console.log(`[play/verify] recorded pending purchase user=${userId} productId=${productId}`);
        }
      }
      res.status(402).json({
        error: 'Subscription is not active',
        state: sub.subscriptionState,
      });
      return;
    }

    // Upsert subscription record (idempotent — safe to call twice with same token)
    const { error: upsertSubError } = await db.from('user_subscriptions').upsert(
      {
        user_id:          userId,
        platform:         'google_play',
        purchase_token:   purchaseToken,
        product_id:       productId,
        base_plan_id:     basePlanId,
        expires_at:       expiresAt,
        status,
        acknowledged:     false,
        raw_notification: sub,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'purchase_token' }
    );
    if (upsertSubError) {
      const maskedToken = purchaseToken.slice(0, 20);
      console.error(
        `[play/verify] user_subscriptions upsert FAILED user=${userId} productId=${productId} token=${maskedToken}:`,
        upsertSubError
      );
      await sendGrantFailureAlert({
        context:       'tier_grant',
        userId,
        userEmail:     undefined,
        productOrTier: `${productId} (${tier})`,
        transactionId: maskedToken,
        provider:      'google_play',
        errorMessage:  upsertSubError.message,
      });
      res.status(500).json({ error: 'Failed to record subscription' });
      return;
    }

    // Update user's tier
    const { error: tierUpdateError } = await db.from('users').update({
      subscription_tier: tier,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    if (tierUpdateError) {
      const maskedToken = purchaseToken.slice(0, 20);
      console.error(
        `[play/verify] users.update FAILED user=${userId} productId=${productId} token=${maskedToken}:`,
        tierUpdateError
      );
      await sendGrantFailureAlert({
        context:       'tier_grant',
        userId,
        userEmail:     undefined,
        productOrTier: `${productId} (${tier})`,
        transactionId: maskedToken,
        provider:      'google_play',
        errorMessage:  tierUpdateError.message,
      });
      res.status(500).json({ error: 'Failed to grant subscription tier' });
      return;
    }

    // Acknowledge the purchase (unacknowledged purchases auto-refund after 3 days)
    await acknowledgeIfNeeded(publisher, sub, productId, purchaseToken, '[play/verify]');

    res.json({
      ok:            true,
      tier,
      tier_label_he: TIER_LABEL_HE[tier] ?? tier,
      expires_at:    expiresAt,
    });
  } catch (err: any) {
    console.error('[POST /api/billing/play/verify]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/play/rtdn ───────────────────────────────────────────────
// Real-time Developer Notifications from Google Cloud Pub/Sub (push subscription).
// PUBLIC route — no Bearer token. Authenticated via OIDC JWT in Authorization header.
billingRouter.post('/play/rtdn', async (req: Request, res) => {
  // 1. Verify OIDC JWT from Google (signature + issuer mandatory)
  const authHeader = req.headers.authorization ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!bearerToken) {
    console.warn('[play/rtdn] Missing Authorization header');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const ticket = await oidcClient.verifyIdToken({ idToken: bearerToken });
    const payload = ticket.getPayload();
    if (!payload || payload.iss !== 'https://accounts.google.com') {
      console.warn('[play/rtdn] Invalid OIDC issuer:', payload?.iss);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  } catch (err: any) {
    console.warn('[play/rtdn] OIDC verification failed:', err.message);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // 2. Decode Pub/Sub envelope — always return 200 after this point so Pub/Sub doesn't retry
  try {
    const message = req.body?.message;
    if (!message?.data) {
      res.json({ received: true });
      return;
    }

    const decoded = Buffer.from(message.data, 'base64').toString('utf8');
    const envelope = JSON.parse(decoded);
    const notification = envelope.subscriptionNotification;

    if (!notification) {
      // Test notification or voided purchase notification — ack and move on
      console.log('[play/rtdn] Non-subscription notification, acking');
      res.json({ received: true });
      return;
    }

    const { purchaseToken, subscriptionId } = notification as {
      purchaseToken: string;
      subscriptionId: string;
      notificationType: number;
    };

    // 3. Look up token to find user — if unknown, ack and exit (don't error-loop Pub/Sub)
    const { data: subRecord } = await db
      .from('user_subscriptions')
      .select('user_id')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (!subRecord) {
      console.log('[play/rtdn] Unknown purchase token, acking');
      res.json({ received: true });
      return;
    }

    // Guard: if user_id is null the account was deleted and raw_notification was already
    // redacted. Do NOT overwrite it with a fresh Google payload (which would re-introduce
    // latestOrderId, externalAccountIdentifiers, and other PII fields).
    if (subRecord.user_id === null) {
      console.log('[play/rtdn] Deleted account (user_id=null) — skipping raw_notification write');
      res.json({ received: true });
      return;
    }

    // 4. Fetch current state from Google (source of truth; don't trust notificationType alone)
    let sub: any;
    let publisher: ReturnType<typeof getAndroidPublisherClient>;
    try {
      publisher = getAndroidPublisherClient();
      const resp = await publisher.purchases.subscriptionsv2.get({
        packageName: PLAY_PACKAGE_NAME,
        token:       purchaseToken,
      });
      sub = resp.data;
    } catch (err: any) {
      console.error('[play/rtdn] Google API error:', err.message);
      // Still ack — we'll catch it on the next RTDN
      res.json({ received: true });
      return;
    }

    const status = mapSubscriptionState(sub.subscriptionState);
    const lineItem = sub.lineItems?.[0] ?? {};
    const expiresAt: string | null = lineItem.expiryTime ?? null;
    const active = isActiveState(sub.subscriptionState);

    // Determine tier to apply. null = leave users.subscription_tier untouched.
    const productTier = PLAY_PRODUCT_TO_TIER[subscriptionId];
    let newTier: string | null;
    if (active && productTier) {
      // Active or in grace period — keep / restore tier
      newTier = productTier;
    } else if (status === 'pending' || status === 'unknown') {
      // Payment still pending (or a state we do not recognise): this token never
      // granted anything, so it must not take anything away either — the user
      // may hold a tier from another purchase.
      newTier = null;
    } else if (status === 'cancelled') {
      // Cancelled but not yet expired — keep access until period end
      const { data: userData, error: userReadError } = await db
        .from('users')
        .select('subscription_tier')
        .eq('id', subRecord.user_id)
        .single();
      if (userReadError) {
        console.error(
          `[play/rtdn] users.select FAILED (cancelled branch) user=${subRecord.user_id}:`,
          userReadError
        );
      }
      newTier = userData?.subscription_tier ?? 'free';
    } else {
      // expired / paused / on-hold / revoked → downgrade immediately
      newTier = 'free';
    }

    // 5. Update user_subscriptions and users tables
    const { error: subUpdateError } = await db.from('user_subscriptions').update({
      status,
      expires_at:       expiresAt,
      base_plan_id:     extractBasePlanId(sub),
      raw_notification: sub,
      updated_at:       new Date().toISOString(),
    }).eq('purchase_token', purchaseToken);

    if (subUpdateError) {
      console.error(
        `[play/rtdn] user_subscriptions UPDATE FAILED token=${purchaseToken}:`,
        subUpdateError
      );
    }

    if (newTier === null) {
      console.log(
        `[play/rtdn] user=${subRecord.user_id} state=${sub.subscriptionState} status=${status} — tier unchanged`
      );
      res.json({ received: true });
      return;
    }

    const { data: tierUpdateRows, error: tierUpdateError } = await db.from('users').update({
      subscription_tier: newTier,
      updated_at:        new Date().toISOString(),
    }).eq('id', subRecord.user_id).select('id');

    // A payment that settled after the app's verify call got a 402 (pending) is
    // granted here, and nothing else will acknowledge it — so RTDN must, or Google
    // refunds it after 3 days. Only acknowledge once the tier write succeeded.
    if (active && productTier && !tierUpdateError && tierUpdateRows && tierUpdateRows.length > 0) {
      await acknowledgeIfNeeded(publisher!, sub, subscriptionId, purchaseToken, '[play/rtdn]');
    }

    if (tierUpdateError) {
      console.error(
        `[play/rtdn] users.update FAILED user=${subRecord.user_id} tier=${newTier}:`,
        tierUpdateError
      );
      await sendGrantFailureAlert({
        context:       'tier_grant',
        userId:        subRecord.user_id,
        userEmail:     undefined,
        productOrTier: `${subscriptionId} (${newTier})`,
        transactionId: purchaseToken,
        provider:      'google_play',
        errorMessage:  tierUpdateError.message,
      });
    } else if (!tierUpdateRows || tierUpdateRows.length === 0) {
      console.error(
        `[play/rtdn] users.update ZERO ROWS user=${subRecord.user_id} — user record not found`
      );
      await sendGrantFailureAlert({
        context:       'tier_grant',
        userId:        subRecord.user_id,
        userEmail:     undefined,
        productOrTier: `${subscriptionId} (${newTier})`,
        transactionId: purchaseToken,
        provider:      'google_play',
        errorMessage:  'users.update affected 0 rows — user record not found',
      });
    }

    console.log(
      `[play/rtdn] user=${subRecord.user_id} ` +
      `state=${sub.subscriptionState} status=${status} tier=${newTier}`
    );
  } catch (err: any) {
    console.error('[play/rtdn] handler error:', err);
  }

  // Always ack to Pub/Sub — never 4xx/5xx on a structurally valid message
  res.json({ received: true });
});

// ── GET /api/billing/play/status ──────────────────────────────────────────────
billingRouter.get('/play/status', verifyToken, async (req: any, res) => {
  try {
    const userId: string = req.user.id;

    const [userData, subData] = await Promise.all([
      db.from('users').select('subscription_tier').eq('id', userId).single(),
      db
        .from('user_subscriptions')
        .select('status, expires_at, product_id, base_plan_id')
        .eq('user_id', userId)
        .eq('platform', 'google_play')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const tier: string = userData.data?.subscription_tier ?? 'free';
    const sub = subData.data;

    res.json({
      platform:      'google_play',
      tier,
      tier_label_he: TIER_LABEL_HE[tier] ?? tier,
      status:        sub?.status ?? null,
      expires_at:    sub?.expires_at ?? null,
      product_id:    sub?.product_id ?? null,
      base_plan_id:  sub?.base_plan_id ?? null,
    });
  } catch (err: any) {
    console.error('[GET /api/billing/play/status]', err);
    res.status(500).json({ error: err.message });
  }
});
