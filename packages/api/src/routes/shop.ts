import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { PRODUCTS, type ProductId } from '../config/products';

export const shopRouter: IRouter = Router();

// ── GET /api/shop/products ─────────────────────────────────────────────────
// Public — no auth needed
shopRouter.get('/products', (_req, res) => {
  res.json({ products: Object.values(PRODUCTS) });
});

// All routes below require auth
shopRouter.use(verifyToken);

// ── Helper: get or build credits summary ──────────────────────────────────
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

// ── GET /api/shop/credits ──────────────────────────────────────────────────
shopRouter.get('/credits', async (req: any, res) => {
  try {
    const credits = await fetchCredits(req.user.id);
    res.json(credits);
  } catch (err: any) {
    console.error('[GET /api/shop/credits]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shop/purchase ────────────────────────────────────────────────
shopRouter.post('/purchase', async (req: any, res) => {
  try {
    const { productId } = req.body as { productId: ProductId };
    const userId = req.user.id;

    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(400).json({ error: 'Invalid productId' });
    }

    // 1. Record the purchase (status: completed — mock, no real payment)
    const { error: purchaseError } = await db
      .from('user_purchases')
      .insert({
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

    // 2. Add credits via upsert
    const { error: creditError } = await db.rpc('upsert_user_credits', {
      p_user_id:     userId,
      p_credit_type: product.type,
      p_quantity:    product.quantity,
    });

    // Fallback if RPC not available: manual upsert
    if (creditError) {
      const { data: existing } = await db
        .from('user_credits')
        .select('id, total')
        .eq('user_id', userId)
        .eq('credit_type', product.type)
        .single();

      if (existing) {
        await db
          .from('user_credits')
          .update({ total: existing.total + product.quantity, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await db
          .from('user_credits')
          .insert({ user_id: userId, credit_type: product.type, total: product.quantity, used: 0 });
      }
    }

    // 3. Return updated credits
    const credits = await fetchCredits(userId);

    res.json({
      success: true,
      product,
      credits,
      message: 'הרכישה הושלמה בהצלחה!',
    });
  } catch (err: any) {
    console.error('[POST /api/shop/purchase]', err.message);
    res.status(500).json({ error: err.message });
  }
});
