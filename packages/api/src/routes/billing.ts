import 'dotenv/config';
import { Router, type IRouter, type Request } from 'express';
import Stripe from 'stripe';
import { OAuth2Client } from 'google-auth-library';
import { TIER_PRICING } from '@gina-haya/shared';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { getAndroidPublisherClient } from '../services/googlePlay';
import {
  PLAY_PRODUCT_TO_TIER,
  PLAY_PACKAGE_NAME,
  TIER_LABEL_HE,
  mapSubscriptionState,
  isActiveState,
} from '../config/playProducts';

export const billingRouter: IRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

const PRICE_IDS: Record<string, string> = {
  gardener_pro: process.env.STRIPE_PRICE_GARDENER_PRO!,
  advanced:     process.env.STRIPE_PRICE_ADVANCED!,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
};

const TIER_ORDER = ['free', 'gardener_pro', 'advanced', 'professional'];

const oidcClient = new OAuth2Client();

// ── POST /api/billing/create-checkout ────────────────────────────────────────
billingRouter.post('/create-checkout', verifyToken, async (req: any, res) => {
  try {
    const { tier } = req.body as { tier: string };
    const priceId = PRICE_IDS[tier];

    if (!priceId) {
      res.status(400).json({ error: 'Invalid tier' });
      return;
    }

    const origin = req.headers.origin ?? 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email,
      metadata: { userId: req.user.id, tier },
      success_url: `${origin}/billing?status=success`,
      cancel_url:  `${origin}/billing?status=cancelled`,
    });

    res.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error('[POST /api/billing/create-checkout]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/webhook ─────────────────────────────────────────────────
// Raw body is required for Stripe signature verification — mounted before
// express.json() in index.ts via the /api/billing/webhook path exception.
billingRouter.post('/webhook', async (req: Request, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err: any) {
    console.error('[webhook] signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId  = session.metadata?.userId;
      const tier    = session.metadata?.tier;
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

      if (userId && tier && TIER_ORDER.includes(tier)) {
        await db.from('users').update({
          subscription_tier: tier,
          stripe_customer_id: customerId ?? null,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      await db.from('users').update({
        subscription_tier: 'free',
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', customerId);
    }
  } catch (err: any) {
    console.error('[webhook] handler error:', err);
  }

  res.json({ received: true });
});

// ── GET /api/billing/status ───────────────────────────────────────────────────
billingRouter.get('/status', verifyToken, async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('users')
      .select('subscription_tier, stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error || !data) throw new Error('User not found');

    const tier: string = data.subscription_tier ?? 'free';
    const monthlyPrice = TIER_PRICING[tier]?.monthly ?? null;

    // Check if there's an active subscription in Stripe
    let isActive = tier !== 'free';
    if (data.stripe_customer_id && tier !== 'free') {
      try {
        const subs = await stripe.subscriptions.list({
          customer: data.stripe_customer_id,
          status: 'active',
          limit: 1,
        });
        isActive = subs.data.length > 0;
      } catch {
        // If Stripe call fails, trust the DB tier
      }
    }

    res.json({ tier, monthlyPrice, isActive });
  } catch (err: any) {
    console.error('[GET /api/billing/status]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/cancel ──────────────────────────────────────────────────
billingRouter.post('/cancel', verifyToken, async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error || !data?.stripe_customer_id) {
      res.status(400).json({ error: 'No active subscription found' });
      return;
    }

    const subs = await stripe.subscriptions.list({
      customer: data.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subs.data.length === 0) {
      res.status(400).json({ error: 'No active subscription found' });
      return;
    }

    const cancelled = await stripe.subscriptions.update(subs.data[0].id, {
      cancel_at_period_end: true,
    });

    res.json({
      success: true,
      cancelAt: new Date((cancelled.cancel_at ?? 0) * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error('[POST /api/billing/cancel]', err);
    res.status(500).json({ error: err.message });
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

    if (!isActiveState(sub.subscriptionState)) {
      res.status(402).json({
        error: 'Subscription is not active',
        state: sub.subscriptionState,
      });
      return;
    }

    const userId: string = req.user.id;
    const lineItem = sub.lineItems?.[0] ?? {};
    const expiresAt: string | null = lineItem.expiryTime ?? null;
    const status = mapSubscriptionState(sub.subscriptionState);

    // Security: reject token already claimed by a different user
    const { data: existing } = await db
      .from('user_subscriptions')
      .select('user_id')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (existing && existing.user_id !== userId) {
      res.status(409).json({ error: 'Purchase token already associated with another account' });
      return;
    }

    // Upsert subscription record (idempotent — safe to call twice with same token)
    await db.from('user_subscriptions').upsert(
      {
        user_id:          userId,
        platform:         'google_play',
        purchase_token:   purchaseToken,
        product_id:       productId,
        base_plan_id:     null,
        expires_at:       expiresAt,
        status,
        acknowledged:     false,
        raw_notification: sub,
        updated_at:       new Date().toISOString(),
      },
      { onConflict: 'purchase_token' }
    );

    // Update user's tier
    await db.from('users').update({
      subscription_tier: tier,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    // Acknowledge the purchase (unacknowledged purchases auto-refund after 3 days)
    const alreadyAcked =
      sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
    if (!alreadyAcked) {
      try {
        await publisher.purchases.subscriptions.acknowledge({
          packageName:    PLAY_PACKAGE_NAME,
          subscriptionId: productId,
          token:          purchaseToken,
          requestBody:    {},
        });
        await db.from('user_subscriptions')
          .update({ acknowledged: true, updated_at: new Date().toISOString() })
          .eq('purchase_token', purchaseToken);
      } catch (ackErr: any) {
        // Non-fatal: Google may already have it acknowledged
        console.warn('[play/verify] acknowledge failed (non-fatal):', ackErr.message);
      }
    }

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

    // 4. Fetch current state from Google (source of truth; don't trust notificationType alone)
    let sub: any;
    try {
      const publisher = getAndroidPublisherClient();
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

    // Determine tier to apply
    const productTier = PLAY_PRODUCT_TO_TIER[subscriptionId];
    let newTier: string;
    if (active && productTier) {
      // Active or in grace period — keep / restore tier
      newTier = productTier;
    } else if (status === 'cancelled') {
      // Cancelled but not yet expired — keep access until period end
      const { data: userData } = await db
        .from('users')
        .select('subscription_tier')
        .eq('id', subRecord.user_id)
        .single();
      newTier = userData?.subscription_tier ?? 'free';
    } else {
      // expired / paused / on-hold / revoked → downgrade immediately
      newTier = 'free';
    }

    // 5. Update user_subscriptions and users tables
    await db.from('user_subscriptions').update({
      status,
      expires_at:       expiresAt,
      raw_notification: sub,
      updated_at:       new Date().toISOString(),
    }).eq('purchase_token', purchaseToken);

    await db.from('users').update({
      subscription_tier: newTier,
      updated_at:        new Date().toISOString(),
    }).eq('id', subRecord.user_id);

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

// ═══════════════════════════════════════════════════════════════════════════════
// GROW PAYMENTS (formerly Meshulam) — Israeli payment gateway
// ═══════════════════════════════════════════════════════════════════════════════
//
// One-time payment flow (active):
//   1. Frontend calls POST /api/billing/grow/create-payment
//   2. Backend POSTs to the Make.com webhook (GROW_MAKE_WEBHOOK_URL)
//      Make runs: Custom Webhook → Grow "Create Payment Link" → Webhook Response
//   3. Make returns { paymentUrl } — a sandbox.grow.link / grow.link URL
//   4. Backend relays paymentUrl to the frontend; frontend redirects the user
//   5. After the user pays, Grow POSTs a completion event to /api/billing/grow/webhook
//   6. Webhook handler calls approveTransaction (direct Grow API) to finalise
//
// Recurring/subscription flow: not yet active — a second Make scenario will be
// built for "הוראת קבע" (standing orders) with its own webhook URL.
// ═══════════════════════════════════════════════════════════════════════════════

// ── POST /api/billing/grow/create-payment ─────────────────────────────────────
// Creates a Grow payment link via Make.com and returns it to the frontend.
// The browser never touches Grow directly — Grow blocks cross-origin requests.
const ISRAELI_MOBILE_RE = /^05\d{8}$/;

billingRouter.post('/grow/create-payment', verifyToken, async (req: any, res) => {
  try {
    const { tier, recurring = false, fullName, phone } = req.body as {
      tier: string;
      recurring?: boolean;
      fullName?: string;
      phone?: string;
    };

    const makeWebhookUrl = recurring
      ? process.env.GROW_MAKE_WEBHOOK_URL_RECURRING
      : process.env.GROW_MAKE_WEBHOOK_URL;

    if (!makeWebhookUrl) {
      res.status(503).json({ error: 'Grow payments not configured for this mode' });
      return;
    }

    const amount = TIER_PRICING[tier]?.monthly ?? null;
    if (!amount) {
      res.status(400).json({ error: 'Invalid tier or tier has no price' });
      return;
    }

    // Validate fullName — Grow requires first + last name, each at least 2 characters.
    const nameParts = (fullName ?? '').trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts.some(w => w.length < 2)) {
      res.status(400).json({ error: 'Full name required (first and last name, each at least 2 characters)' });
      return;
    }
    const validatedName = nameParts.join(' ');

    // Validate phone — Grow requires a valid Israeli mobile number (05XXXXXXXX).
    if (!phone || !ISRAELI_MOBILE_RE.test(phone)) {
      res.status(400).json({ error: 'Valid Israeli mobile phone number required (e.g. 0501234567)' });
      return;
    }

    const origin = req.headers.origin ?? 'https://gina-haya.com';

    const makeRes = await fetch(makeWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: validatedName,
        phone,
        email:      req.user.email,
        sum:        amount,
        userId:     req.user.id,
        tier,
        successUrl: `${origin}/billing?status=success`,
        cancelUrl:  `${origin}/billing?status=cancelled`,
      }),
    });

    const rawBody = await makeRes.text();

    if (!makeRes.ok) {
      console.error('[grow/create-payment] Make webhook error:', makeRes.status, rawBody);
      res.status(502).json({ error: 'Payment creation failed' });
      return;
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      console.error('[grow/create-payment] Make returned non-JSON:', rawBody);
      res.status(502).json({ error: 'Payment creation failed' });
      return;
    }

    const paymentUrl: string | undefined = data?.paymentUrl;
    if (!paymentUrl) {
      console.error('[grow/create-payment] No paymentUrl in Make response:', data);
      res.status(502).json({ error: 'Payment creation failed' });
      return;
    }

    res.json({ paymentUrl });
  } catch (err: any) {
    console.error('[POST /api/billing/grow/create-payment]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/grow/webhook ────────────────────────────────────────────
// PUBLIC route — no Bearer token.  Authenticated via static webhookKey field
// that Grow includes in every payload (configured in the Grow dashboard).
//
// Three payload shapes to handle:
//   1. Successful one-time   paymentType="רגיל"
//   2. Successful recurring  paymentType="הוראת קבע" + paymentSource="ריצת הוראת קבע"
//   3. Failed recurring      snake_case payload with error_message / charges_attempts
billingRouter.post('/grow/webhook', async (req: Request, res) => {
  const payload = req.body as Record<string, any>;

  // ── Authenticate ───────────────────────────────────────────────────────────
  // Failed-recurring events use snake_case "webhook_key"; all others use camelCase.
  // Two separate Grow webhooks exist (one-time vs recurring), each with its own key.
  const receivedKey = payload.webhookKey ?? payload.webhook_key;
  const validKeys = [
    process.env.GROW_WEBHOOK_KEY_ONETIME,
    process.env.GROW_WEBHOOK_KEY_RECURRING,
  ].filter(Boolean);
  if (!receivedKey || !validKeys.includes(receivedKey)) {
    console.warn('[grow/webhook] Invalid or missing webhookKey');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // ── Failed recurring charge (snake_case shape) ─────────────────────────
    if (payload.error_message != null || payload.charges_attempts != null) {
      const directDebitId   = payload.regular_payment_id as string | undefined;
      const chargesAttempts = Number(payload.charges_attempts ?? 0);
      // Grow retries up to a configurable number of times; downgrade after final attempt.
      // 3 is a common default — confirm the configured retry count in your Grow dashboard.
      const MAX_ATTEMPTS = 3;

      console.warn(
        `[grow/webhook] Failed recurring charge directDebitId=${directDebitId} ` +
        `attempts=${chargesAttempts} error=${payload.error_message}`
      );

      if (directDebitId) {
        const newStatus = chargesAttempts >= MAX_ATTEMPTS ? 'expired' : 'grace_period';

        await db.from('user_subscriptions').update({
          status:           newStatus,
          raw_notification: payload,
          updated_at:       new Date().toISOString(),
        }).eq('purchase_token', directDebitId).eq('platform', 'grow');

        if (chargesAttempts >= MAX_ATTEMPTS) {
          const { data: subRecord } = await db
            .from('user_subscriptions')
            .select('user_id')
            .eq('purchase_token', directDebitId)
            .eq('platform', 'grow')
            .maybeSingle();

          if (subRecord) {
            await db.from('users').update({
              subscription_tier: 'free',
              updated_at:        new Date().toISOString(),
            }).eq('id', subRecord.user_id);

            console.log(
              `[grow/webhook] Downgraded user=${subRecord.user_id} ` +
              `after ${chargesAttempts} failed recurring attempts`
            );
          }
        }
      }

      res.json({ received: true });
      return;
    }

    // ── Successful payment (one-time or recurring cycle) ───────────────────
    const paymentType   = payload.paymentType   as string | undefined;
    const paymentSource = payload.paymentSource as string | undefined;
    const transactionCode = payload.transactionCode as string | undefined;
    const directDebitId   = payload.directDebitId   as string | undefined;
    const payerEmail      = payload.payerEmail       as string | undefined;

    // cField1/cField2 echoed back if Grow supports it — verify field names
    // against Grow's Postman collection before relying on them.
    const internalUserId   = payload.cField1 as string | undefined;
    const tierFromPayload  = payload.cField2 as string | undefined;

    const isRecurringCycle =
      paymentType === 'הוראת קבע' && paymentSource === 'ריצת הוראת קבע';

    // For recurring: use directDebitId (stable across cycles) as the canonical token.
    // For one-time:  use transactionCode (unique per charge).
    const token = isRecurringCycle
      ? (directDebitId ?? transactionCode)
      : transactionCode;

    // ── Resolve user ─────────────────────────────────────────────────────────
    // Priority: cField1 echo-back → email lookup → existing subscription record
    let userId: string | null = internalUserId ?? null;

    if (!userId && payerEmail) {
      const { data: userRow } = await db
        .from('users')
        .select('id')
        .eq('email', payerEmail)
        .maybeSingle();
      userId = userRow?.id ?? null;
    }

    if (!userId && token) {
      // Recurring cycle 2+: the subscription record already exists from the first charge
      const { data: subRow } = await db
        .from('user_subscriptions')
        .select('user_id')
        .eq('purchase_token', token)
        .eq('platform', 'grow')
        .maybeSingle();
      userId = subRow?.user_id ?? null;
    }

    if (!userId) {
      console.warn(
        '[grow/webhook] Could not resolve user from payload ' +
        `payerEmail=${payerEmail} token=${token} — acking without action`
      );
      res.json({ received: true });
      return;
    }

    // ── Resolve tier ──────────────────────────────────────────────────────────
    // cField2 is the most reliable if Grow echoes it; falls back to gardener_pro.
    // TODO: once confirmed that Grow echoes custom fields, remove the fallback.
    const tier = tierFromPayload && TIER_ORDER.includes(tierFromPayload)
      ? tierFromPayload
      : 'gardener_pro';

    // ── approveTransaction (required for one-time; verify for first recurring charge) ──
    // Grow requires an explicit server-to-server approval after a one-time payment
    // webhook fires, otherwise the transaction is not finalised on Grow's side.
    // TODO: confirm endpoint path + request body against Grow's Postman collection.
    // TODO: confirm with Grow/sandbox whether the first recurring charge also needs this call.
    if (!isRecurringCycle && transactionCode) {
      try {
        const approveRes = await fetch(
          `https://${process.env.GROW_API_HOST}/api/v1/Transaction/approve`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId:          process.env.GROW_USER_ID,
              pageCode:        process.env.GROW_PAGE_CODE_ONETIME,
              transactionCode,
            }),
          }
        );
        if (!approveRes.ok) {
          // Non-fatal — log for manual review but continue with subscription update
          console.error(
            '[grow/webhook] approveTransaction failed:',
            approveRes.status,
            await approveRes.text()
          );
        }
      } catch (approveErr: any) {
        console.error('[grow/webhook] approveTransaction threw:', approveErr.message);
      }
    }

    // ── Upsert subscription record ────────────────────────────────────────────
    // purchase_token is UNIQUE — upsert is idempotent: recurring cycles update
    // the existing row rather than inserting a duplicate.
    if (token) {
      await db.from('user_subscriptions').upsert(
        {
          user_id:          userId,
          platform:         'grow',
          purchase_token:   token,
          product_id:       tier,
          expires_at:       null, // Grow manages the recurring schedule; no explicit expiry
          status:           'active',
          acknowledged:     true, // Grow does not require purchase acknowledgement
          raw_notification: payload,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: 'purchase_token' }
      );
    }

    // ── Update user tier ──────────────────────────────────────────────────────
    await db.from('users').update({
      subscription_tier: tier,
      updated_at:        new Date().toISOString(),
    }).eq('id', userId);

    console.log(
      `[grow/webhook] user=${userId} tier=${tier} ` +
      `isRecurring=${isRecurringCycle} token=${token}`
    );
  } catch (err: any) {
    console.error('[grow/webhook] handler error:', err);
    // Return 200 so Grow does not keep retrying on internal errors
  }

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
