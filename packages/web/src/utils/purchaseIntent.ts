const INTENT_KEY   = 'gina_haya_purchase_intent';
const INTENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PurchaseIntent {
  tier:          string;
  billingPeriod: 'monthly' | 'annual';
  returnTo:      string;
  savedAt:       number;
}

/** Persist intent to both sessionStorage and localStorage.
 *  localStorage survives the email-confirmation link opening in a new tab. */
export function savePurchaseIntent(intent: Omit<PurchaseIntent, 'savedAt'>): void {
  const data: PurchaseIntent = { ...intent, savedAt: Date.now() };
  const json = JSON.stringify(data);
  try { sessionStorage.setItem(INTENT_KEY, json); } catch { /* storage unavailable */ }
  try { localStorage.setItem(INTENT_KEY, json); } catch { /* storage unavailable */ }
}

/** Read the stored intent. Returns null if absent or expired (>24 h). */
export function readPurchaseIntent(): PurchaseIntent | null {
  let json: string | null = null;
  try { json = sessionStorage.getItem(INTENT_KEY); } catch { /* ignore */ }
  if (!json) {
    try { json = localStorage.getItem(INTENT_KEY); } catch { /* ignore */ }
  }
  if (!json) return null;
  try {
    const intent = JSON.parse(json) as PurchaseIntent;
    if (Date.now() - intent.savedAt > INTENT_TTL_MS) {
      clearPurchaseIntent();
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

export function clearPurchaseIntent(): void {
  try { sessionStorage.removeItem(INTENT_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(INTENT_KEY); } catch { /* ignore */ }
}
