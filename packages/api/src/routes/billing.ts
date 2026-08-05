import 'dotenv/config';
import { Router, type IRouter, type Request } from 'express';
import Stripe from 'stripe';
import { OAuth2Client } from 'google-auth-library';
import qs from 'qs';
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
// TODO: Grow recurring subscriptions (הוראת קבע) are NOT covered by this endpoint.
// This only cancels Stripe subscriptions. Grow recurring charges will continue on
// Grow's side until manually stopped in Grow's dashboard ("גינה היא" → standing orders).
// Grow's Make.com app has no "Cancel Recurring" action, so automated cancellation
// would require a direct API call to Grow's paid REST API or a manual operator step.
// Do not ship Grow recurring billing to real paying customers without resolving this gap.
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

const VALID_PAYMENT_MODES = ['recurring', 'one_time_monthly', 'one_time_annual'] as const;
type PaymentMode = typeof VALID_PAYMENT_MODES[number];

billingRouter.post('/grow/create-payment', verifyToken, async (req: any, res) => {
  try {
    const {
      tier,
      paymentMode: rawPaymentMode,
      // Keep recurring for backwards compat — ignored when paymentMode is present
      recurring: legacyRecurring = false,
      fullName,
      phone,
    } = req.body as {
      tier: string;
      paymentMode?: string;
      recurring?: boolean;
      fullName?: string;
      phone?: string;
    };

    // Resolve payment mode: prefer explicit paymentMode, fall back to legacy recurring bool
    const paymentMode: PaymentMode =
      VALID_PAYMENT_MODES.includes(rawPaymentMode as PaymentMode)
        ? (rawPaymentMode as PaymentMode)
        : legacyRecurring
        ? 'recurring'
        : 'one_time_monthly';

    const isRecurring = paymentMode === 'recurring';

    const makeWebhookUrl = isRecurring
      ? process.env.GROW_MAKE_WEBHOOK_URL_RECURRING
      : process.env.GROW_MAKE_WEBHOOK_URL;

    if (!makeWebhookUrl) {
      res.status(503).json({ error: 'Grow payments not configured for this mode' });
      return;
    }

    const pricing = TIER_PRICING[tier];
    // Annual one-time charge uses the annual total; everything else uses monthly.
    const amount = paymentMode === 'one_time_annual'
      ? (pricing?.annual ?? null)
      : (pricing?.monthly ?? null);
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

    // NOTE: Make.com scenario must map the `paymentMode` field to cField3 on the
    // Grow "Create Payment Link" module so the webhook handler can read it back.
    const makeRes = await fetch(makeWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName:    validatedName,
        phone,
        email:       req.user.email,
        sum:         amount,
        userId:      req.user.id,
        tier,
        paymentMode,  // → cField3 in Make.com; webhook reads it back from data.customFields.cField3
        successUrl:  `${origin}/billing?status=success`,
        cancelUrl:   `${origin}/billing?status=cancelled`,
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

// ── POST /api/billing/grow/webhook/:secret ────────────────────────────────────
// PUBLIC route — no Bearer token.
//
// Authentication: URL-embedded secret (GROW_WEBHOOK_SECRET env var).
// Grow's PaymentLinks webhook format does not include any per-call signing
// (no webhookKey in the body, no signature header).  The full webhook URL
// including the secret token must be configured in Grow's dashboard, making
// the URL itself the shared secret.  Set in Railway as GROW_WEBHOOK_SECRET.
//
// Two delivery sources, same logical payload shape, different wire serialization:
//
// SOURCE 1 — PaymentLinks "notify Url" (Make.com module config):
//   Sends real JSON with a mislabeled Content-Type: application/x-www-form-urlencoded.
//
// SOURCE 2 — Account-level dashboard webhooks ("gina haya one time", "gina haya recurring"):
//   Sends genuine form-urlencoded with PHP/Rails bracket notation:
//   err=&status=1&data[statusCode]=2&data[customFields][cField1]=<userId>&...
//
// Both decode to the same nested shape and run through the same extraction logic.
// qs.parse() handles bracket notation; JSON.parse() handles the JSON variant.
//
// TODO: Verify recurring-cycle webhook shape when a real recurring PaymentLinks
//   call arrives.  transactionId may differ per cycle; a stable token reference
//   (paymentLinkProcessId?) may be needed to tie cycles to the same subscription row.
billingRouter.post('/grow/webhook/:secret', async (req: Request, res) => {
  // ── Authenticate via URL-embedded secret ──────────────────────────────────
  const webhookSecret = process.env.GROW_WEBHOOK_SECRET;
  if (!webhookSecret || (req.params as any).secret !== webhookSecret) {
    console.warn('[grow/webhook] Invalid or missing secret in URL');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // ── Defensive body parsing ─────────────────────────────────────────────────
  // express.text() in index.ts gives us a raw string regardless of Content-Type.
  // Both sources send the same logical shape; they just serialize differently:
  //   JSON variant:      {"err":"","status":"1","data":{"statusCode":"2",...,"customFields":{"cField1":...}}}
  //   Form-urlencoded:   err=&status=1&data[statusCode]=2&...&data[customFields][cField1]=...
  // qs.parse() handles bracket notation (a[b][c]=v → {a:{b:{c:v}}}) so both
  // paths produce an identical nested object before the extraction logic runs.
  const rawText: string = typeof req.body === 'string'
    ? req.body
    : req.body instanceof Buffer
      ? req.body.toString('utf8')
      : '';

  console.log('[grow/webhook] content-type:', req.headers['content-type']);
  console.log('[grow/webhook] raw body (first 500):', rawText.slice(0, 500));

  if (!rawText) {
    console.warn('[grow/webhook] Empty body received');
    res.json({ received: true });
    return;
  }

  let parsedBody: any;

  try {
    parsedBody = JSON.parse(rawText);
    console.log('[grow/webhook] parsed as JSON');
  } catch {
    // Not JSON — try bracket-notation form-urlencoded (qs handles a[b][c]=v)
    try {
      parsedBody = qs.parse(rawText, { allowDots: false, depth: 10 });
      console.log('[grow/webhook] parsed as form-urlencoded (qs)');
    } catch {
      console.error('[grow/webhook] body is unparseable, raw:', rawText);
      res.status(400).json({ error: 'Unparseable body' });
      return;
    }
  }

  console.log('[grow/webhook] parsed body:', JSON.stringify(parsedBody));

  try {
    // ── Unified extraction (same shape from both wire formats) ─────────────
    // { err, status: "1", data: { statusCode: "2", transactionId, payerEmail,
    //   customFields: { cField1: userId, cField2: tier }, productData: [...], ... } }
    const envelope = parsedBody as { err?: string; status?: string; data?: Record<string, any> };
    const data = envelope?.data;

    if (!data || typeof data !== 'object') {
      console.warn('[grow/webhook] Missing or non-object data field:', JSON.stringify(envelope));
      res.json({ received: true });
      return;
    }

    if (envelope.status !== '1') {
      console.warn('[grow/webhook] Non-success envelope, status:', envelope.status);
      res.json({ received: true });
      return;
    }

    if (data.statusCode !== '2') {
      console.warn('[grow/webhook] Payment not paid, statusCode:', data.statusCode);
      res.json({ received: true });
      return;
    }

    const transactionId    = data.transactionId  as string | undefined;
    const payerEmail       = data.payerEmail     as string | undefined;
    const customFields     = data.customFields   as { cField1?: string; cField2?: string; cField3?: string } | undefined;
    const internalUserId   = customFields?.cField1;
    const tierFromPayload  = customFields?.cField2;
    // cField3 = paymentMode set at payment-link creation time.
    // Absent on payments created before this feature was added → treat as recurring (old behaviour).
    const paymentModeFromWebhook = (customFields?.cField3 ?? 'recurring') as PaymentMode;

    // One-time: transactionId is unique per charge, used as the canonical token.
    // TODO: for recurring cycles, verify whether transactionId changes each cycle
    // or whether paymentLinkProcessId is the stable identifier to use instead.
    const token = transactionId;

    // ── Dedup: skip if already processed ──────────────────────────────────
    if (token) {
      const { data: existingRow } = await db
        .from('user_subscriptions')
        .select('user_id')
        .eq('purchase_token', token)
        .eq('platform', 'grow')
        .maybeSingle();

      if (existingRow) {
        console.log(`[grow/webhook] Duplicate transactionId=${token}, already processed — skipping`);
        res.json({ received: true });
        return;
      }
    }

    // ── Resolve user ───────────────────────────────────────────────────────
    // Priority: cField1 (userId set at payment-link creation) → email lookup
    // Trim to guard against whitespace added by form-urlencoded decoding.
    let userId: string | null = internalUserId?.trim() ?? null;

    if (!userId && payerEmail) {
      const { data: userRow } = await db
        .from('users')
        .select('id')
        .eq('email', payerEmail)
        .maybeSingle();
      userId = userRow?.id ?? null;
    }

    if (!userId) {
      console.warn(
        '[grow/webhook] Could not resolve user ' +
        `cField1=${internalUserId} payerEmail=${payerEmail} — acking without action`
      );
      res.json({ received: true });
      return;
    }

    // ── Resolve tier ───────────────────────────────────────────────────────
    const tier = tierFromPayload && TIER_ORDER.includes(tierFromPayload)
      ? tierFromPayload
      : 'gardener_pro';

    // ── approveTransaction ─────────────────────────────────────────────────
    // Skipped intentionally: we don't have paid Grow REST API access (the
    // Light API that exposes /api/v1/Transaction/approve costs 500 ILS+VAT/month).
    // Per Grow's docs, payment completes regardless — this call is not required.
    // Future option: route through Make.com's "Approve Transaction" action
    // (same pattern as create-payment), but only if Grow support indicates it
    // is ever actually required for our account type.
    console.log(`[grow/webhook] approveTransaction skipped — not required per Grow docs, no paid API access configured (transactionId=${transactionId})`);


    // ── Compute expiry and plan label from paymentMode ────────────────────
    // recurring       → Grow manages renewal cadence; we don't track expiry.
    // one_time_monthly → 30 days access from now.
    // one_time_annual  → 365 days access from now.
    // base_plan_id is used as a queryable label so the renewal cron can
    // target annual purchases without guessing from date math alone.
    const now = Date.now();
    const expiresAt: string | null =
      paymentModeFromWebhook === 'one_time_annual'   ? new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString()
      : paymentModeFromWebhook === 'one_time_monthly' ? new Date(now +  30 * 24 * 60 * 60 * 1000).toISOString()
      : null;  // recurring — no fixed expiry

    const basePlanId: string | null =
      paymentModeFromWebhook === 'one_time_annual'   ? 'annual'
      : paymentModeFromWebhook === 'one_time_monthly' ? 'monthly_trial'
      : null;  // recurring

    // ── Upsert subscription record ─────────────────────────────────────────
    if (token) {
      const { error: upsertError } = await db.from('user_subscriptions').upsert(
        {
          user_id:          userId,
          platform:         'grow',
          purchase_token:   token,
          product_id:       tier,
          base_plan_id:     basePlanId,
          expires_at:       expiresAt,
          status:           'active',
          acknowledged:     true,
          raw_notification: parsedBody,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: 'purchase_token' }
      );
      if (upsertError) {
        console.error(
          `[grow/webhook] user_subscriptions upsert FAILED user=${userId} token=${token}:`,
          upsertError
        );
        // Don't abort — still try to update the users table so the tier change lands
        // even if the subscription audit row fails (e.g. schema mismatch).
      }
    }

    // ── Update user tier ───────────────────────────────────────────────────
    // IMPORTANT: capture the result — Supabase never throws on soft errors,
    // it returns { error } instead.  Chaining .select() forces a non-null
    // response so we can distinguish "0 rows matched" from a genuine update.
    const { data: tierUpdateData, error: tierUpdateError } = await db
      .from('users')
      .update({
        subscription_tier: tier,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, subscription_tier');

    if (tierUpdateError) {
      console.error(
        `[grow/webhook] users.update FAILED user=${userId} tier=${tier}:`,
        tierUpdateError
      );
    } else if (!tierUpdateData || tierUpdateData.length === 0) {
      console.error(
        `[grow/webhook] users.update ZERO ROWS — userId=${userId} not found in users table. ` +
        `Falling back to email lookup.`
      );
      // Fallback: try matching by payer email (covers the case where cField1 UUID
      // was somehow wrong / truncated in the Make.com scenario)
      if (payerEmail) {
        const { data: emailUpdateData, error: emailUpdateError } = await db
          .from('users')
          .update({
            subscription_tier: tier,
            updated_at:        new Date().toISOString(),
          })
          .eq('email', payerEmail)
          .select('id, subscription_tier');

        if (emailUpdateError) {
          console.error(
            `[grow/webhook] users.update (email fallback) FAILED email=${payerEmail}:`,
            emailUpdateError
          );
        } else if (!emailUpdateData || emailUpdateData.length === 0) {
          console.error(
            `[grow/webhook] users.update (email fallback) ZERO ROWS — email=${payerEmail} not found either`
          );
        } else {
          console.log(
            `[grow/webhook] users.update (email fallback) OK ` +
            `user=${emailUpdateData[0].id} new_tier=${emailUpdateData[0].subscription_tier}`
          );
        }
      }
    } else {
      console.log(
        `[grow/webhook] users.update OK ` +
        `user=${tierUpdateData[0].id} new_tier=${tierUpdateData[0].subscription_tier} ` +
        `(${tierUpdateData.length} row(s) affected)`
      );
    }

    console.log(
      `[grow/webhook] ACCEPTED user=${userId} tier=${tier} ` +
      `paymentMode=${paymentModeFromWebhook} expiresAt=${expiresAt ?? 'null'} transactionId=${transactionId}`
    );

  } catch (err: any) {
    console.error('[grow/webhook] handler error:', err);
    // Always 200 so Grow does not retry on internal errors
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
