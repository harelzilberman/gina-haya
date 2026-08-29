import { Router, type IRouter, type Request } from 'express';
import qs from 'qs';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { PRODUCTS, type ProductId } from '../config/products';
import { sendGrantFailureAlert } from '../services/email';

export const shopRouter: IRouter = Router();

// ── Shared helpers ────────────────────────────────────────────────────────────

async function fetchCredits(userId: string) {
  const { data } = await db
    .from('user_credits')
    .select('credit_type, total, used')
    .eq('user_id', userId);

  const rows = data ?? [];
  function row(type: string) {
    const r = rows.find((x: any) => x.credit_type === type);
    const total = r?.total ?? 0;
    const used  = r?.used  ?? 0;
    return { total, used, available: Math.max(0, total - used) };
  }
  return {
    analysis: row('analysis'),
    tracker:  row('tracker'),
    garden:   row('garden'),
  };
}

// Grants credits to a user for a given product and quantity multiplier.
// Tries the RPC first; falls back to a manual upsert if the RPC isn't available.
async function grantCredits(userId: string, productId: ProductId, quantity: number): Promise<void> {
  const product = PRODUCTS[productId];
  if (!product) throw new Error(`Unknown productId: ${productId}`);

  const creditsToAdd = product.quantity * quantity;

  const { error: rpcError } = await db.rpc('upsert_user_credits', {
    p_user_id:     userId,
    p_credit_type: product.type,
    p_quantity:    creditsToAdd,
  });

  if (!rpcError) return;

  // Fallback: manual upsert
  const { data: existing } = await db
    .from('user_credits')
    .select('id, total')
    .eq('user_id', userId)
    .eq('credit_type', product.type)
    .single();

  if (existing) {
    const { error: updateError } = await db
      .from('user_credits')
      .update({ total: existing.total + creditsToAdd, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateError) throw new Error(`user_credits UPDATE failed: ${updateError.message}`);
  } else {
    const { error: insertError } = await db
      .from('user_credits')
      .insert({ user_id: userId, credit_type: product.type, total: creditsToAdd, used: 0 });
    if (insertError) throw new Error(`user_credits INSERT failed: ${insertError.message}`);
  }
}

// ── GET /api/shop/products ─────────────────────────────────────────────────────
// Public — no auth needed
shopRouter.get('/products', (_req, res) => {
  res.json({ products: Object.values(PRODUCTS) });
});

// ── POST /api/shop/grow/webhook/:secret ───────────────────────────────────────
// PUBLIC route — no Bearer token.
//
// Grow fires this after a successful shop payment. Same defensive parsing as
// the billing Grow webhook (JSON first, qs fallback for bracket-notation form data).
// express.text() middleware must be applied in index.ts BEFORE the router.
//
// Custom fields set by Make.com from the create-payment request body:
//   cField1 → userId
//   cField2 → compact cart JSON  [{p: productId, q: quantity}, ...]
//   cField3 → 'shop'  (purchaseType — safety check so billing webhooks can't cross-fire)
const SHOP_PURCHASE_TYPE = 'shop';

shopRouter.post('/grow/webhook/:secret', async (req: Request, res) => {
  console.log('[shop/webhook] build=20260808a handler invoked');

  const webhookSecret = process.env.GROW_WEBHOOK_SECRET_SHOP;
  if (!webhookSecret || (req.params as any).secret !== webhookSecret) {
    console.warn('[shop/webhook] Invalid or missing secret');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // ── Body parsing (same pattern as billing webhook) ─────────────────────────
  const rawText: string = typeof req.body === 'string'
    ? req.body
    : req.body instanceof Buffer
    ? req.body.toString('utf8')
    : '';

  console.log('[shop/webhook] content-type:', req.headers['content-type']);
  console.log('[shop/webhook] raw body (first 500):', rawText.slice(0, 500));

  if (!rawText) {
    console.warn('[shop/webhook] Empty body');
    res.json({ received: true });
    return;
  }

  let parsedBody: any;
  try {
    parsedBody = JSON.parse(rawText);
    console.log('[shop/webhook] parsed as JSON');
  } catch {
    try {
      parsedBody = qs.parse(rawText, { allowDots: false, depth: 10 });
      console.log('[shop/webhook] parsed as form-urlencoded (qs)');
    } catch {
      console.error('[shop/webhook] body unparseable, raw:', rawText);
      res.status(400).json({ error: 'Unparseable body' });
      return;
    }
  }

  console.log('[shop/webhook] parsed body:', JSON.stringify(parsedBody));

  try {
    const envelope = parsedBody as { err?: string; status?: string; data?: Record<string, any> };
    const data = envelope?.data;

    if (!data || typeof data !== 'object') {
      console.warn('[shop/webhook] Missing or non-object data field');
      res.json({ received: true });
      return;
    }

    if (envelope.status !== '1') {
      console.warn('[shop/webhook] Non-success envelope, status:', envelope.status);
      res.json({ received: true });
      return;
    }

    if (data.statusCode !== '2') {
      console.warn('[shop/webhook] Payment not paid, statusCode:', data.statusCode);
      res.json({ received: true });
      return;
    }

    const transactionId  = data.transactionId  as string | undefined;
    const payerEmail     = data.payerEmail      as string | undefined;
    const customFields   = data.customFields    as { cField1?: string; cField2?: string; cField3?: string } | undefined;
    const internalUserId = customFields?.cField1;
    const cartJsonField  = customFields?.cField2;
    const purchaseType   = customFields?.cField3;

    // Safety: reject anything not explicitly tagged as a shop payment
    if (purchaseType !== SHOP_PURCHASE_TYPE) {
      console.warn(`[shop/webhook] purchaseType="${purchaseType}" is not "shop" — acking without action`);
      res.json({ received: true });
      return;
    }

    // ── Dedup by transactionId ─────────────────────────────────────────────
    if (transactionId) {
      const { data: existingRow } = await db
        .from('user_purchases')
        .select('id')
        .eq('purchase_token', transactionId)
        .maybeSingle();

      if (existingRow) {
        console.log(`[shop/webhook] Duplicate transactionId=${transactionId} — skipping`);
        res.json({ received: true });
        return;
      }
    }

    // ── Resolve user ───────────────────────────────────────────────────────
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
        `[shop/webhook] Could not resolve user cField1=${internalUserId} email=${payerEmail} — acking without action`
      );
      res.json({ received: true });
      return;
    }

    // ── Parse cart ─────────────────────────────────────────────────────────
    // Cart is stored as compact JSON: [{p: productId, q: quantity}, ...]
    let cartItems: Array<{ p: string; q: number }> = [];
    try {
      cartItems = JSON.parse(cartJsonField ?? '[]');
    } catch {
      console.error('[shop/webhook] Failed to parse cartJson:', cartJsonField);
      res.json({ received: true });
      return;
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      console.warn('[shop/webhook] Empty or invalid cart:', cartJsonField);
      res.json({ received: true });
      return;
    }

    // Validate all products up front before touching the DB
    for (const item of cartItems) {
      if (!PRODUCTS[item.p as ProductId]) {
        console.error('[shop/webhook] Unknown productId in cart:', item.p);
        res.json({ received: true });
        return;
      }
    }

    // ── Process each cart item ─────────────────────────────────────────────
    const now = new Date().toISOString();

    for (const item of cartItems) {
      const product = PRODUCTS[item.p as ProductId];
      const qty     = Math.max(1, item.q ?? 1);

      // Insert purchase audit row — capture id so we can mark it grant_failed if needed.
      const { data: purchaseRows, error: purchaseError } = await db.from('user_purchases').insert([{
        user_id:          userId,
        product_id:       product.id,
        quantity:         product.quantity * qty,
        price_paid:       Math.round(product.price * qty * 100) / 100,
        currency:         'ILS',
        status:           'completed',
        payment_provider: 'grow',
        payment_ref:      transactionId ?? `grow_${Date.now()}`,
        purchase_token:   transactionId ?? null,
        completed_at:     now,
      }]).select('id');

      const purchaseRowId: string | null = purchaseRows?.[0]?.id ?? null;

      if (purchaseError) {
        console.error(
          `[shop/webhook] user_purchases insert FAILED product=${product.id} user=${userId}:`,
          purchaseError
        );
        // Non-fatal: still grant the credits so the user isn't left in limbo
      }

      // Grant credits
      try {
        await grantCredits(userId, product.id as ProductId, qty);
        console.log(`[shop/webhook] Credits granted user=${userId} product=${product.id} qty=${qty}`);
      } catch (creditErr: any) {
        console.error(
          `[shop/webhook] Credit grant FAILED product=${product.id} user=${userId}:`,
          creditErr.message
        );
        // Mark the purchase row so failures are queryable:
        //   SELECT * FROM user_purchases WHERE status = 'grant_failed'
        if (purchaseRowId) {
          try {
            await db.from('user_purchases').update({ status: 'grant_failed' }).eq('id', purchaseRowId);
          } catch {
            // Supabase may also be down — the alert below is the backstop.
          }
        }
        // Alert out of band — fires even if the DB update above failed.
        await sendGrantFailureAlert({
          context:       'credit_grant',
          userId,
          userEmail:     payerEmail,
          productOrTier: product.id,
          quantity:      qty,
          transactionId: transactionId ?? null,
          provider:      'grow',
          errorMessage:  creditErr.message,
        });
      }
    }

    console.log(
      `[shop/webhook] ACCEPTED user=${userId} transactionId=${transactionId} items=${cartItems.length}`
    );

  } catch (err: any) {
    console.error('[shop/webhook] handler error:', err);
    // Always 200 so Grow does not retry on internal errors
  }

  res.json({ received: true });
});

// ── All routes below require auth ─────────────────────────────────────────────
shopRouter.use(verifyToken);

// ── GET /api/shop/credits ──────────────────────────────────────────────────────
shopRouter.get('/credits', async (req: any, res) => {
  try {
    const credits = await fetchCredits(req.user.id);
    res.json(credits);
  } catch (err: any) {
    console.error('[GET /api/shop/credits]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shop/purchase ────────────────────────────────────────────────────
// Mock/dev endpoint — still used for local testing. Real production flow goes via
// POST /api/shop/grow/create-payment → Grow → POST /api/shop/grow/webhook/:secret.
shopRouter.post('/purchase', async (req: any, res) => {
  try {
    const { productId } = req.body as { productId: ProductId };
    const userId = req.user.id;

    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({ error: 'Invalid productId' });
    }

    // Record the purchase (payment_provider: 'mock')
    const { error: purchaseError } = await db.from('user_purchases').insert({
      user_id:          userId,
      product_id:       product.id,
      quantity:         product.quantity,
      price_paid:       product.price,
      currency:         'ILS',
      status:           'completed',
      payment_provider: 'mock',
      payment_ref:      `mock_${Date.now()}`,
      completed_at:     new Date().toISOString(),
    });

    if (purchaseError) throw purchaseError;

    await grantCredits(userId, productId, 1);

    const credits = await fetchCredits(userId);
    res.json({ success: true, product, credits, message: 'הרכישה הושלמה בהצלחה!' });
  } catch (err: any) {
    console.error('[POST /api/shop/purchase]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shop/grow/create-payment ────────────────────────────────────────
// Creates a Grow payment link for the entire cart via Make.com, returns {paymentUrl}.
//
// Request body:
//   fullName   string   — Grow requires first + last name, each ≥ 2 chars
//   phone      string   — Israeli mobile (05XXXXXXXX)
//   cart       Array<{productId: string, quantity: number}>
//
// Make.com scenario must map the incoming fields to Grow custom fields:
//   userId      → cField1
//   cartJson    → cField2  (compact cart: [{p, q}, ...])
//   purchaseType→ cField3  (always 'shop')
const ISRAELI_MOBILE_RE = /^05\d{8}$/;
const SHOP_CART_MAX     = 7;
const SHOP_QTY_MAX      = 10;

shopRouter.post('/grow/create-payment', async (req: any, res) => {
  try {
    const { fullName, phone, cart } = req.body as {
      fullName?: string;
      phone?: string;
      cart?: Array<{ productId: string; quantity: number }>;
    };

    // Validate name (Grow requirement: first + last, each ≥ 2 chars)
    const nameParts = (fullName ?? '').trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts.some(w => w.length < 2)) {
      res.status(400).json({ error: 'נדרש שם מלא — שם פרטי ושם משפחה (לפחות 2 תווים כל אחד)' });
      return;
    }
    const validatedName = nameParts.join(' ');

    // Validate phone
    if (!phone || !ISRAELI_MOBILE_RE.test(phone)) {
      res.status(400).json({ error: 'נדרש מספר טלפון נייד ישראלי תקין (לדוגמה: 0501234567)' });
      return;
    }

    // Validate cart
    if (!Array.isArray(cart) || cart.length === 0 || cart.length > SHOP_CART_MAX) {
      res.status(400).json({ error: `Cart must contain 1–${SHOP_CART_MAX} items` });
      return;
    }

    let total = 0;
    for (const item of cart) {
      const product = PRODUCTS[item.productId as ProductId];
      if (!product) {
        res.status(400).json({ error: `Unknown product: ${item.productId}` });
        return;
      }
      const qty = item.quantity;
      if (!Number.isInteger(qty) || qty < 1 || qty > SHOP_QTY_MAX) {
        res.status(400).json({ error: `Invalid quantity for ${item.productId}: must be 1–${SHOP_QTY_MAX}` });
        return;
      }
      total += product.price * qty;
    }
    total = Math.round(total * 100) / 100;

    const makeWebhookUrl = process.env.GROW_MAKE_WEBHOOK_URL_SHOP;
    if (!makeWebhookUrl) {
      res.status(503).json({ error: 'Shop payments are not configured' });
      return;
    }

    const origin = req.headers.origin ?? 'https://gina-haya.com';

    // Compact cart JSON for cField2 — worst case ~230 chars for all 7 products,
    // well within Grow's custom field limits.
    const cartJson = JSON.stringify(
      cart.map(i => ({ p: i.productId, q: i.quantity }))
    );

    const makeRes = await fetch(makeWebhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName:     validatedName,
        phone,
        email:        req.user.email,
        sum:          total,
        userId:       req.user.id,
        cartJson,                 // → cField2 in Make.com
        purchaseType: 'shop',     // → cField3 in Make.com
        successUrl:   `${origin}/shop?status=success`,
        cancelUrl:    `${origin}/shop?status=cancelled`,
      }),
    });

    const rawBody = await makeRes.text();

    if (!makeRes.ok) {
      console.error('[shop/grow/create-payment] Make webhook error:', makeRes.status, rawBody);
      res.status(502).json({ error: 'Payment creation failed' });
      return;
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      console.error('[shop/grow/create-payment] Make returned non-JSON:', rawBody);
      res.status(502).json({ error: 'Payment creation failed' });
      return;
    }

    const paymentUrl: string | undefined = data?.paymentUrl;
    if (!paymentUrl) {
      console.error('[shop/grow/create-payment] No paymentUrl in Make response:', data);
      res.status(502).json({ error: 'Payment creation failed' });
      return;
    }

    res.json({ paymentUrl });
  } catch (err: any) {
    console.error('[POST /api/shop/grow/create-payment]', err);
    res.status(500).json({ error: err.message });
  }
});
