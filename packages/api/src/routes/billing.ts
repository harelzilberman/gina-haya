import 'dotenv/config';
import { Router, type IRouter, type Request } from 'express';
import Stripe from 'stripe';
import { TIER_PRICING } from '@gina-haya/shared';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

export const billingRouter: IRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

const PRICE_IDS: Record<string, string> = {
  grower:       process.env.STRIPE_PRICE_GROWER!,
  gardener_pro: process.env.STRIPE_PRICE_GARDENER_PRO!,
  advanced:     process.env.STRIPE_PRICE_ADVANCED!,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
};

const TIER_ORDER = ['free', 'grower', 'gardener_pro', 'advanced', 'professional'];

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
