# Grow Tier Fallback Fix

**Commit:** fix(billing): remove silent gardener_pro fallback in Grow webhook  
**Files changed:** `packages/api/src/routes/billing.ts`, `packages/api/src/tests/growBilling.test.ts`

---

## The bug

`POST /api/billing/grow/webhook/:secret` previously resolved the user's subscription tier like this:

```typescript
const tier = tierFromPayload && TIER_ORDER.includes(tierFromPayload)
  ? tierFromPayload
  : 'gardener_pro';
```

`tierFromPayload` comes from `customFields.cField2`, which travels as a plain string through Make.com. If `cField2` was absent, empty, or contained an unrecognised value (wrong case, old tier name, Make.com truncation), the code silently granted `gardener_pro` — the ₪18/month tier.

**The failure scenario**: a user pays ₪54 for `professional`. Something goes wrong with cField2 in the Make.com scenario (misconfigured mapping, webhook resent from a payment link created before cField2 was added). The user receives `gardener_pro` limits. Their payment succeeded, their receipt shows ₪54, and nothing anywhere recorded a downgrade. The user would discover the wrong limits by noticing that features they paid for are unavailable. The server log showed a successful ACCEPTED entry — there is no error.

---

## The fix

### Part 1 — Changed behavior

**`const tier` → `const resolvedTier: string | null`**

The fallback to `'gardener_pro'` is gone. When `cField2` is absent or unrecognised, `resolvedTier` is `null`.

**Shop/unrecognised payment mode detection**

Added `isShopPurchase`:
```typescript
const isShopPurchase = !VALID_PAYMENT_MODES.includes(paymentModeFromWebhook as any);
```

Any `cField3` value that is not `'recurring'`, `'one_time_monthly'`, or `'one_time_annual'` — including `'shop'` — is treated as a non-subscription purchase. See §"Shop purchase handling" below.

**`resolvedTier` logic**

```typescript
const resolvedTier: string | null =
  !isShopPurchase && tierFromPayload && TIER_ORDER.includes(tierFromPayload)
    ? tierFromPayload
    : null;
```

`null` means: write the audit row, do NOT touch `subscription_tier`.

**Dispatch on `resolvedTier`**

Three branches replace the old flat tier update:

1. **`isShopPurchase`**: `user_subscriptions` row written; no `subscription_tier` update; `console.log` only.
2. **`resolvedTier === null`** (subscription webhook, bad cField2): `user_subscriptions` row written; no `subscription_tier` update; `console.error` with the `TIER_GRANT_FAILED` sentinel, transactionId, cField2, userId, and sum.
3. **`resolvedTier !== null`** (valid subscription): sum cross-check warning if applicable, then the existing `.update() + .select() + email fallback` logic — unchanged except `tier` → `resolvedTier`.

**`user_subscriptions` upsert always runs**

The upsert runs for all branches so no payment data is ever lost. `product_id` is set to `resolvedTier ?? tierFromPayload ?? null` — if resolution failed, the raw cField2 value (even if unrecognised) is preserved for forensics.

### Part 2 — Sum cross-check

**Implemented.** The sum mapping is unambiguous at current ILS prices:

| Tier | Monthly | Annual |
|---|---|---|
| gardener_pro | ₪18 | ₪180 |
| advanced | ₪36 | ₪360 |
| professional | ₪54 | ₪540 |

Every amount maps to exactly one tier+billing-period combination. No overlap exists between monthly and annual amounts either (smallest annual ₪180 > largest monthly ₪54). The test suite (Test 6) asserts this.

The sum check is a **warning log only** — `console.error` with sentinel `SUM_MISMATCH`. The cField2 tier is still granted; the mismatch is advisory. This is intentional: cField2 is the system's primary source of truth (it's what was configured when the payment link was created). A sum mismatch most likely means a pricing table change, a promo discount, or a partial-period charge — not necessarily fraud. A human should review it.

The check accesses `(data as any).sum`. If that field is absent from the webhook body, the check silently skips. No failure.

### Part 3 — Shop purchase handling

**How the handler currently distinguishes shop from subscription purchases**

`cField3` is the field that identifies the payment mode. For subscription purchases the UI sets it to `'recurring'`, `'one_time_monthly'`, or `'one_time_annual'`. For Grow shop credit purchases (observed: ₪3.60 for a credit pack), `cField3` comes in as `'shop'`.

Before this fix: `paymentModeFromWebhook = (customFields?.cField3 ?? 'recurring') as PaymentMode`. If cField3 was `'shop'`, the cast was a lie — `'shop'` is not a `PaymentMode`. The expiry computation then fell into the `else` branch (recurring, 33-day window), which is wrong. Worse, the old tier resolution used cField2 (`gardener_pro` fallback if absent), so a shop purchase could silently grant a tier.

After this fix: `isShopPurchase = !VALID_PAYMENT_MODES.includes(paymentModeFromWebhook as any)`. Any unrecognised `cField3` — including `'shop'` — sets this flag. The audit row is written, `subscription_tier` is not touched, and a `console.log` records the shop event.

**One remaining gap**: `expiresAt` is still computed from the expiry formula before the shop branch, so a shop purchase gets a nonsense expiry in its `user_subscriptions` row (33 days from now, as if recurring). This is harmless — the row is written for audit and will never drive an `attachTier` downgrade (that logic checks `status = 'cancellation_requested'`, not subscription purchases). It could be cleaned up by setting `expiresAt` to null for shop purchases, but that is not done in this fix to minimise scope.

---

## Manual reconciliation — what to do when TIER_GRANT_FAILED fires

If you see this in Railway logs:

```
[grow/webhook] TIER_GRANT_FAILED -- cField2 absent or unrecognised;
subscription_tier NOT updated. Manual reconciliation required.
transactionId=<TXN_ID> cField2=<VALUE> userId=<UUID> sum=<AMOUNT>
```

Steps:

1. **Identify the user.** The log contains `userId`. Query `SELECT email FROM users WHERE id = '<userId>'`.

2. **Identify what they purchased.** Look up `transactionId` in Grow's dashboard or via `SELECT * FROM user_subscriptions WHERE purchase_token = '<transactionId>'`. The `raw_notification` JSONB column contains the full webhook payload for forensic review. The `sum` field (if present) tells you the amount charged — cross-reference with the pricing table to infer the intended tier.

3. **Apply the correct tier manually:**
   ```sql
   UPDATE users
   SET subscription_tier = '<correct_tier>',
       updated_at = NOW()
   WHERE id = '<userId>';
   ```

4. **Fix the root cause in Make.com.** The most likely cause is that the Make.com scenario is not mapping the `tier` field to `cField2` on the payment link. Open the Make.com scenario and verify: the `Create Payment Link` module's `cField2` input must be wired to the `tier` variable from the webhook trigger. If it's a static value or empty, fix it.

5. **Verify the fix by submitting a test payment** (use Grow's sandbox mode). Confirm the subsequent webhook log shows `ACCEPTED user=... tier=<tier>` with the correct tier.

---

## What if SUM_MISMATCH fires

```
[grow/webhook] SUM_MISMATCH -- cField2="gardener_pro" expected ILS 18
but charged ILS 54 (paymentMode=recurring).
Tier "gardener_pro" will still be granted. Manual review required.
transactionId=<TXN_ID> userId=<UUID>
```

This means: the user was charged ₪54 (professional price) but `cField2` says `gardener_pro`. They received `gardener_pro` limits.

1. **Confirm the charge in Grow's dashboard.** The sum in the log is what Grow says the user paid.
2. **If cField2 is wrong** (Make.com scenario misconfiguration): fix Make.com (see step 4 above), then manually upgrade the user:
   ```sql
   UPDATE users SET subscription_tier = 'professional', updated_at = NOW()
   WHERE id = '<userId>';
   ```
3. **If the sum is wrong** (e.g. a promotional discount was applied): the tier grant is correct; the sum mismatch is expected. No action needed; the alert can be dismissed.

---

## Part 2 — Stripe findings (report only, no code changed)

### Is Stripe in use?

**Yes, conditionally.** The web upgrade modal (`packages/web/src/components/ui/UpgradeModal.tsx:119-139`) routes based on language:

```typescript
if (i18n.language === 'he') {
  // Hebrew/Israeli users → Grow path
  setPendingGrowTier(targetTier);
  return;
}
// Non-Hebrew → Stripe
api.post('/api/billing/create-checkout', { tier: targetTier }, ...)
```

The Israeli market (primary users, all Hebrew) goes exclusively to Grow. Stripe is the payment path for non-Hebrew users — English-speaking international users.

### Is `POST /api/billing/create-checkout` reachable?

**Yes, from the web.** `UpgradeModal.tsx:128` calls it directly. It is **not** referenced anywhere in the Flutter app code.

### Are Stripe env vars set?

The local `.env` and `.env.example` both have placeholder test values (`sk_test_...`, `whsec_...`, `price_...`). Railway env vars cannot be read directly from code, but the code declares:

```typescript
const PRICE_IDS: Record<string, string> = {
  gardener_pro: process.env.STRIPE_PRICE_GARDENER_PRO!,
  advanced:     process.env.STRIPE_PRICE_ADVANCED!,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
};
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { ... });
```

**Significant finding**: the `.env` file contains `STRIPE_PRICE_GROWER` (the old retired tier) but **does not contain `STRIPE_PRICE_ADVANCED`**. The billing.ts code requires `STRIPE_PRICE_ADVANCED`. If Railway also only has `STRIPE_PRICE_GROWER` (not `STRIPE_PRICE_ADVANCED`), then:
- `PRICE_IDS.advanced` would be `undefined` at runtime
- A checkout request for `tier: 'advanced'` would pass the `TIER_ORDER.includes(tier)` guard (valid tier) but `priceId` would be `undefined`
- The code checks `if (!priceId)` and returns `400 { error: 'Invalid tier' }` — so it fails gracefully

If `STRIPE_SECRET_KEY` is absent from Railway, `new Stripe(undefined!, ...)` is called at module load time. The Stripe SDK validates the key in the constructor; if it throws, the billing module fails to load and the API server crashes on startup. If the SDK defers validation to the first API call, only Stripe calls would fail — other routes would be unaffected.

### What breaks if Stripe is removed?

1. **`UpgradeModal.tsx`**: the `i18n.language !== 'he'` branch calls `create-checkout`. English users would see a silent error (the `.catch(() => {})` swallows it) with no upgrade path. They would need to be directed to the Grow path instead, which currently doesn't support phone-less international payments.
2. **`GET /api/billing/status`**: the route checks Stripe for an active subscription (`stripe.subscriptions.list()`). Removing Stripe would make `isActive` always equal `tier !== 'free'`, with no real-time Stripe check. For Grow users this is already the case (no Stripe customer ID). For Stripe subscribers it would mean the endpoint trusts the DB tier without verification.
3. **`POST /api/billing/cancel`**: the Grow branch runs first; the Stripe branch is a fallback for users with `stripe_customer_id`. Removing it would silently fail cancellation for any Stripe subscribers.

**Before removing Stripe**: run `SELECT COUNT(*) FROM users WHERE stripe_customer_id IS NOT NULL AND subscription_tier != 'free'` against the live DB. If the count is zero, no live Stripe subscribers exist and removal is safe for users. A Stripe API call `stripe.subscriptions.list({ status: 'active', limit: 1 })` across all customers would give the same answer. The `GET /api/billing/status` route already does this per-user.

---

## Verification

**TypeScript**: `npx tsc --noEmit` → no output, no errors.

**Ownership tests**: `npx tsx src/tests/ownership.test.ts` → 70 passed, 0 failed.

**New Grow billing tests**: `npx tsx src/tests/growBilling.test.ts` → 49 passed, 0 failed.

## `git diff --stat`

```
 packages/api/src/routes/billing.ts       | 201 ++++++++++++++++++++++++---
 packages/api/src/tests/growBilling.test.ts | (new file, 49 tests)
```

(`settings.local.json` appears as a pre-existing modification; not staged here.)
