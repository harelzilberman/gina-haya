import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { PRODUCTS, type ProductId } from '../config/products';

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
// Exported so the Lemon Squeezy webhook handler can call it directly.
export async function grantCredits(userId: string, productId: ProductId, quantity: number): Promise<void> {
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

// ── POST /api/shop/checkout ────────────────────────────────────────────────────
// Creates a Lemon Squeezy checkout for a single credit pack.
// LS does not support multi-item carts; callers must invoke once per product.
shopRouter.post('/checkout', async (req: any, res) => {
  try {
    const apiKey   = process.env.LEMONSQUEEZY_API_KEY;
    const storeId  = process.env.LEMONSQUEEZY_STORE_ID;
    if (!apiKey || !storeId) {
      res.status(503).json({ error: 'payments not configured' });
      return;
    }

    const { productId } = req.body as { productId?: string };
    if (!productId || !PRODUCTS[productId as ProductId]) {
      res.status(400).json({ error: 'Invalid productId' });
      return;
    }

    const variantEnvKey = `LEMONSQUEEZY_VARIANT_${productId.toUpperCase()}`;
    const variantId = process.env[variantEnvKey];
    if (!variantId) {
      res.status(503).json({ error: 'payments not configured for this product' });
      return;
    }

    const origin = req.headers.origin ?? 'https://gina-haya.com';

    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method:  'POST',
      headers: {
        'Accept':        'application/vnd.api+json',
        'Content-Type':  'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          relationships: {
            store:   { data: { type: 'stores',   id: storeId } },
            variant: { data: { type: 'variants',  id: variantId } },
          },
          attributes: {
            checkout_data: {
              email:  req.user.email,
              custom: {
                user_id:    req.user.id,
                kind:       'credits',
                product_id: productId,
              },
            },
            product_options: {
              redirect_url: `${origin}/shop?status=success`,
            },
          },
        },
      }),
    });

    const body = await lsRes.json() as any;
    if (!lsRes.ok) {
      console.error('[POST /api/shop/checkout] LS error:', lsRes.status, JSON.stringify(body));
      res.status(502).json({ error: 'Checkout creation failed' });
      return;
    }

    const checkoutUrl: string | undefined = body?.data?.attributes?.url;
    if (!checkoutUrl) {
      console.error('[POST /api/shop/checkout] No checkout URL in LS response:', body);
      res.status(502).json({ error: 'Checkout creation failed' });
      return;
    }

    res.json({ checkoutUrl });
  } catch (err: any) {
    console.error('[POST /api/shop/checkout]', err);
    res.status(500).json({ error: err.message });
  }
});
