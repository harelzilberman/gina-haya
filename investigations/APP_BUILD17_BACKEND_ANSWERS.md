# Answers to the app chat — backend items from build 1.0.5+17

Written 3 October 2026 from the website chat. Read-only investigation of `packages/api`, `packages/shared`, `packages/web` at `167dd51`. No files changed, nothing committed.

**Update 3 Oct, after owner approval:** §2 and §4 are implemented in the commit that adds this file. Run `packages/api/sql/play_billing_followups.sql` before or right after deploying it. §4 still depends on RTDN delivery working (see §3).

**Update 3 Oct, evening — live checks:**
- §1: bilingual templates installed in Supabase; signup and reset tested on device, both pass.
- §6: a free test account was refused a second garden, so LAUNCH_FREE_MODE is off in production.
- RTDN: a Play Console test notification reached the API (`[play/rtdn] Non-subscription notification, acking` at 19:43 IDT, deploy 2a2a2246). Delivery works now. The §3 hypothesis that delivery is broken is refuted for the present. Why the 2 Oct row was never updated is still unexplained; check it after the 4 Oct 03:30 reconcile.

**Limits of this pass:** the live database and the live Railway API were not reachable from this session (network egress blocked), and the browser had no signed-in session. Everything below is from the code. Items that need a live check say so.

---

## §3 — Is entitlement computed from `status` or `expires_at`? (answer first)

**Neither.** Entitlement comes from a third field: `users.subscription_tier`.

EVIDENCE
- `attachTier` (`middleware/tierMiddleware.ts`) reads `users.subscription_tier` and sets `req.limits = getLimits(tier)`. Every quota gate (gardens, plants, trackers, Chupchu, vision) reads `req.limits`.
- `GET /api/billing/play/status` returns `tier` from `users.subscription_tier`. It also returns the row's `status` and `expires_at`, but only as information.
- `user_subscriptions.status` affects access only indirectly, through a safety net in `attachTier`: if the latest `google_play` row is **expired by more than 24 h AND its status is not `active`/`grace_period`**, the user is downgraded to `free` on their next request.
- If the row is expired by more than 24 h **and still says `active`** (the b0902d9f case), `attachTier` deliberately leaves the tier alone and emails a stale-active alert. A missed renewal notification must not lock out someone who is paying.
- The writers of `status`/`expires_at` are `play/verify`, the RTDN handler (`POST /api/billing/play/rtdn`, which also sets `subscription_tier`), and a daily reconcile cron at 03:30 Israel time (`reconcilePlaySubs`, `staleOnly`). The cron re-reads Google for `active`/`grace_period` rows whose `expires_at` is more than 25 h old and corrects `status`/`expires_at`. It does **not** touch `subscription_tier`; the `attachTier` safety net does that on the user's next request.

CONCLUSION
- **The app must not use `status` for entitlement.** Use `tier` from `/api/billing/play/status` (or `/api/users/me/usage`).
- A lapsed subscriber does **not** keep paid features forever. Worst case without RTDN: about 25 h, plus the wait until the next 03:30 run, plus the user's next request. That's roughly 1–2 days of leakage per lapse. This is a bounded delay, not an open-ended revenue leak.
- Expected for b0902d9f: the 03:30 run on **4 Oct** picks the row up (on 3 Oct it was under 25 h old). That run sets `expired`, and the next API call drops the user to `free`.

HYPOTHESIS (needs a live check): **RTDN is not reaching the API.** If it were, Google's renewal or expiry notifications for the license-tester subscription would have rewritten `expires_at`/`status` within minutes. Instead the row stayed `active` with a 3-hour-old `expires_at`. The cron comment records a previous incident where the Pub/Sub topic lost its subscription for weeks. To check:
1. Railway logs: search `[play/rtdn]` since 2 Oct.
2. Google Cloud → Pub/Sub → the Play RTDN topic → confirm there is a push subscription pointing at `https://powerful-embrace-production-95ea.up.railway.app/api/billing/play/rtdn` with OIDC auth enabled.
3. Play Console → Monetization setup → "Send test notification". The API should log `[play/rtdn] Non-subscription notification, acking`.

---

## §4 — Slow payments: the RTDN webhook already exists, but it can't rescue this case

EVIDENCE
- `POST /api/billing/play/rtdn` exists. It verifies the OIDC token, re-reads `subscriptionsv2`, updates the row and grants or revokes the tier.
- **Gap 1:** when `play/verify` gets a non-active state (a pending payment is `SUBSCRIPTION_STATE_PENDING`), it returns 402 **before writing anything**. No `user_subscriptions` row exists.
- **Gap 2:** RTDN looks the purchase token up in `user_subscriptions`, and if it is unknown it logs `Unknown purchase token, acking` and drops it. Nothing in the notification identifies the user, unless the app set `obfuscatedAccountId` at purchase time, and the backend doesn't read that.
- **Gap 3:** RTDN never acknowledges a purchase. Only `play/verify` does. Even if RTDN granted the tier, Google would still refund it after 3 days.
- **Gap 4:** `mapSubscriptionState` has no case for `PENDING` (→ `unknown`), and the reconcile cron only looks at `active`/`grace_period` rows.

CONCLUSION: the risk described in the handoff is real, and the existing webhook doesn't close it. Server-only fix, no app change:
1. On a pending state, `play/verify` upserts the row (`user_id`, `product_id`, `status='pending'`) and *then* returns 402.
2. Map `SUBSCRIPTION_STATE_PENDING` → `pending`.
3. When the payment settles (`SUBSCRIPTION_PURCHASED`), RTDN finds the row, grants the tier **and acknowledges** if it isn't acknowledged yet.
4. The reconcile cron also sweeps `pending` rows (with acknowledgement) as a backstop for missed RTDNs.
5. Prerequisite: RTDN delivery has to work (see the §3 hypothesis).

---

## §2 — `base_plan_id` is NULL

EVIDENCE: `play/verify` hard-codes `base_plan_id: null`. RTDN and reconcile never write it. The value is in Google's response at `lineItems[0].offerDetails.basePlanId`, and the full response is already stored in `raw_notification`.

FIX (server-side value, not the request body): write `lineItems[0].offerDetails.basePlanId` in verify, RTDN and reconcile. Backfill existing rows from `raw_notification`:
`update user_subscriptions set base_plan_id = raw_notification->'lineItems'->0->'offerDetails'->>'basePlanId' where platform='google_play' and base_plan_id is null;`

---

## §5 — Which quota numbers are authoritative

**The website is correct. The app tier cards are wrong in all ten cells listed.**

EVIDENCE: every quota gate reads `TIER_LIMITS` in `packages/shared/src/constants/tiers.ts` through `attachTier` → `req.limits`. These are `garden.ts` (gardens, plants, restore), `trackers.ts`, `chupchu.ts` and `visionQuota.ts`. No other hard-coded limits exist. `/pricing` imports `getLimits()` from the same file, so it cannot drift. ("AI analyses" = `maxVisionLooksPerMonth`.)

| Tier | Gardens | Plants/garden | AI analyses/mo (per day) | Chupchu/mo (per day) | Growth trackers |
|---|---|---|---|---|---|
| free | 1 | 15 | 3 (2) | 54 (3) | 1, and 1 check-in total ever |
| gardener_pro | 2 | 30 | 18 (5) | 250 (18) | 10, 10 check-ins/tracker/mo |
| advanced | 5 | 30 | 36 (8) | 500 (36) | unlimited |
| professional | 10 | 30 | 54 (12) | 800 (54) | unlimited |

The daily caps are enforced too, and the app doesn't show them. Prices in the same file: 18 / 36 / 54 ₪ per month, and 10× monthly per year.

**Garden-pack add-on (+10 gardens, ₪19/mo): not live anywhere.** On `/pricing` the button only shows the `comingSoonToast`. There is no Grow product and no backend grant. Nothing adds to `maxGardens`. No Play product is needed until the backend supports it.

---

## §6 — `LAUNCH_FREE_MODE`

EVIDENCE (code): every check is `process.env.LAUNCH_FREE_MODE === 'true'`, a strict string match. Any other value, or no value, means off.
NOT YET VERIFIED LIVE (no network path from this session). Two ways to check it:
- On the free test account, try to create a **second garden**. Flag off → 403 garden limit. Flag on → the garden is created.
- Or call `GET /api/users/me/usage` with that user's token: the response includes `launch_free_mode` and the effective `tier` directly.

Note: the store screen switching to גנן מתקדם after the test purchase does **not** prove the flag is off. That screen reads `/play/status`, which ignores the flag.

---

## §1 — Bilingual auth emails

The templates live only in the Supabase dashboard, not in the repo. The plan stays as decided: Hebrew block first, English below, in both Confirm Signup and Reset Password, with Hebrew checked by codepoint. Note for the record: Supabase templates are Go templates and expose user metadata as `.Data`, so per-locale branching is technically possible. It's rejected anyway because it needs an app change.
