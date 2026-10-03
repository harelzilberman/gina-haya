import { db } from '../db/client';
import { PLAY_PACKAGE_NAME } from '../config/playProducts';
import type { getAndroidPublisherClient } from './googlePlay';

type Publisher = ReturnType<typeof getAndroidPublisherClient>;

/**
 * Acknowledge a Play subscription purchase if Google says it is not yet
 * acknowledged, and mirror the result into user_subscriptions.acknowledged.
 *
 * Google auto-refunds purchases that stay unacknowledged for 3 days, so every
 * path that grants a tier (verify, RTDN, reconcile) must call this — not only
 * the in-app verify call, which never runs if the user does not reopen the app.
 *
 * Never throws. Returns true when the purchase is acknowledged (now or before).
 */
export async function acknowledgeIfNeeded(
  publisher: Publisher,
  sub: any,
  productId: string,
  purchaseToken: string,
  logTag: string,
): Promise<boolean> {
  if (sub?.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    await markAcknowledged(purchaseToken, logTag);
    return true;
  }
  try {
    await publisher.purchases.subscriptions.acknowledge({
      packageName:    PLAY_PACKAGE_NAME,
      subscriptionId: productId,
      token:          purchaseToken,
      requestBody:    {},
    });
    await markAcknowledged(purchaseToken, logTag);
    console.log(`${logTag} acknowledged purchase token=${purchaseToken.slice(0, 12)}…`);
    return true;
  } catch (ackErr: any) {
    // Non-fatal: Google may already have it acknowledged, or the next
    // verify / RTDN / reconcile pass will retry.
    console.warn(`${logTag} acknowledge failed (non-fatal):`, ackErr?.message ?? String(ackErr));
    return false;
  }
}

async function markAcknowledged(purchaseToken: string, logTag: string): Promise<void> {
  const { error } = await db.from('user_subscriptions')
    .update({ acknowledged: true, updated_at: new Date().toISOString() })
    .eq('purchase_token', purchaseToken);
  if (error) console.warn(`${logTag} acknowledged-flag update failed (non-fatal):`, error.message);
}
