import type { Response } from 'express';
import { GOOGLE_PLAY_URL } from '@gina-haya/shared';

/**
 * Web checkout switch (Lemon Squeezy today, a different provider later).
 * Set WEB_CHECKOUT_ENABLED=true to turn it on; unset or anything else = OFF.
 * Read on every call so a Railway env change applies after restart without code edits.
 * Google Play billing is NOT affected by this flag.
 */
export function isWebCheckoutEnabled(): boolean {
  return process.env.WEB_CHECKOUT_ENABLED === 'true';
}

/** Standard response for any checkout-creating endpoint while web checkout is off. */
export function sendWebCheckoutDisabled(res: Response): void {
  res.status(503).json({ error: 'web_checkout_disabled', playUrl: GOOGLE_PLAY_URL });
}
