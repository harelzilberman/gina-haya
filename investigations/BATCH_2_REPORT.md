# Batch 2 Report — push / users / billing routes

## Summary

| File | Routes examined | Converted | Notes |
|---|---|---|---|
| `push.ts` | 6 | 0 | 5 user routes (all filter-based); 1 cron (excluded per instructions) |
| `users.ts` | 4 | 0 | All aggregate/filter-based reads and identity-keyed writes |
| `billing.ts` | 9 | 0 | 3 webhooks (excluded); 5 user routes (filter-based); 1 fetch-then-gate returning 409 (not convertible) |
| **Total** | **19** | **0** | |

---

## push.ts

`verifyToken` is applied per-route (not at router level) so `POST /send-daily` can
use CRON_SECRET instead of a user JWT.

### GET /vapid-public-key
No DB access — returns an env var. No ownership gate needed.

### POST /subscribe
```typescript
await db.from('push_subscriptions').upsert({
  user_id: req.user!.id,
  subscription,
}, { onConflict: 'user_id' });
// ...
await db.from('notification_settings').upsert({
  user_id: req.user!.id,
  ...settings,
}, { onConflict: 'user_id' });
```
Category **E** (identity-keyed upserts). The authenticated `user_id` is written
directly into both rows — there is no pre-existing row to verify ownership of.
No conversion.

### DELETE /subscribe
```typescript
await db.from('push_subscriptions').delete().eq('user_id', req.user!.id);
```
Category **E** (filter-based delete). The filter `user_id = auth_user` is the
authorization. No conversion.

### GET /settings
```typescript
await db.from('notification_settings').select('*').eq('user_id', req.user!.id).single();
```
Category **E** (filter-based select). No conversion.

### PATCH /settings
```typescript
await db.from('notification_settings').upsert({
  user_id: req.user!.id,
  ...req.body,
}, { onConflict: 'user_id' }).select().single();
```
Category **E** (identity-keyed upsert). No conversion.

### POST /send-daily
CRON_SECRET-gated operational route. **Excluded per task instructions.** Not touched.

---

## users.ts

`usersRouter.use(verifyToken)` applied at router level — all routes are authenticated.

### PATCH /profile
```typescript
await db.from('users').update(updates).eq('id', req.user!.id);
```
Category **E** (identity-keyed update on own row). `id` is the PK of the `users`
table and equals `req.user!.id` — this is not a resource owned by the user, it
*is* the user. No conversion.

### POST /push-token
```typescript
await db.from('users').update({ push_token: parsed.data.pushToken }).eq('id', req.user!.id);
```
Category **E** (identity-keyed update on own row). No conversion.

### GET /usage
Multi-table aggregate counting (plant_tracker_checkins, plant_trackers, garden_plants,
gardens, chat_uses). Every query is scoped by `.eq('user_id', userId)` or via
`.in('garden_id', userGardenIds)` where `userGardenIds` was itself fetched with
`.eq('user_id', userId)`. No per-row ownership gate — this is pure aggregate
reporting. Category **E**. No conversion.

### GET /me/usage
Same pattern as `GET /usage` — aggregate reporting with per-garden plant counts.
All queries filtered by `userId` derived from the JWT. Category **E**. No conversion.

---

## billing.ts

### POST /create-checkout
Creates a Stripe checkout session. Uses `req.user.email` and `req.user.id` from
the JWT — no DB read of a resource the user might or might not own. No conversion.

### POST /webhook ← Stripe
Stripe webhook authenticated by HMAC signature (`stripe-signature` header).
No authenticated user. **Webhook — not a user route. Not touched.**

### GET /status
```typescript
await db.from('users').select('subscription_tier, stripe_customer_id')
  .eq('id', req.user.id).single();
```
Category **E** (filter-based select on own row). No conversion.

### POST /cancel
Two queries, both scoped to the authenticated user:
```typescript
// Grow path
await db.from('user_subscriptions')
  .select(...)
  .eq('user_id', req.user.id)
  .eq('platform', 'grow')
  .eq('status', 'active')
  ...

// Stripe path
await db.from('users').select('stripe_customer_id').eq('id', req.user.id).single();
```
Category **E** (filter-based selects, then writes keyed by the fetched token/customer
ID which is already user-scoped). No cross-user check. No conversion.

### POST /play/verify
Has a fetch-then-gate (lines 332–342):
```typescript
const { data: existing } = await db
  .from('user_subscriptions')
  .select('user_id')
  .eq('purchase_token', purchaseToken)
  .maybeSingle();

if (existing && existing.user_id !== userId) {
  res.status(409).json({ error: 'Purchase token already associated with another account' });
  return;
}
```
This is a **token-conflict check**, not an ownership check. The question is "has
any other user already registered this purchase token?" — not "does the authenticated
user own this row?" The normal case is `existing === null` (first-time verify).

`checkOwnsResourceByUserId` would be wrong here:
- It would return 404 when no existing row is found (normal case should succeed).
- It would return 403 on conflict; the correct status is 409 Conflict.

**Not convertible.** The gate semantics do not match the helper's contract.

**Bug note (not fixed, per task rules):** After the conflict check passes, the
upsert uses `onConflict: 'purchase_token'` — so the same token can be re-verified
by the same user without issue. The concern is the inverse: a stolen token from
another user's account. The 409 handling is intentional and correct.

### POST /play/rtdn
Google Pub/Sub RTDN webhook, authenticated via OIDC JWT from
`accounts.google.com`. No user Bearer token.
**Webhook — not a user route. Not touched.**

### POST /grow/create-payment
Creates a Grow payment link via Make.com. Uses `req.user.email` and `req.user.id`
from JWT — no DB read of a resource the user might or might not own. No conversion.

### POST /grow/webhook/:secret
URL-secret authenticated webhook (GROW_WEBHOOK_SECRET embedded in URL path).
No user Bearer token.
**Webhook — not a user route. Not touched.**

### GET /play/status
```typescript
await Promise.all([
  db.from('users').select('subscription_tier').eq('id', userId).single(),
  db.from('user_subscriptions').select(...).eq('user_id', userId)...maybeSingle(),
]);
```
Category **E** (filter-based selects). No conversion.

---

## Verification

**TypeScript:** `npx tsc --noEmit` → no output, no errors.

**Tests:** `npx tsx src/tests/ownership.test.ts` → 70 passed, 0 failed.

No files changed. No helpers imported. Report only.
