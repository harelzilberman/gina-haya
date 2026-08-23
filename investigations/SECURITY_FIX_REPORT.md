# Security Fix Report

Fixed: 2026-08-23
Codebase: `packages/api/src/routes/chupchu.ts`, `packages/api/src/routes/push.ts`

---

## ⚠️ DEPLOY ORDERING WARNING

**Read this before deploying.**

`POST /api/push/send-daily` now fails closed: if `CRON_SECRET` is not set in the environment, every request returns 503. Do not deploy this build until you have:

1. **Set `CRON_SECRET`** in the Railway environment (or wherever the API is hosted). Use a long random string (32+ characters). Example: `openssl rand -hex 32`.
2. **Updated any caller** to send the header `x-cron-secret: <value>`. Currently nothing calls this route via HTTP (see investigation below), so there is no existing caller to update. If you wire up an external cron in future, it must send this header.

Order: set env var → deploy → test.

---

## Fix 1 — `POST /api/chupchu/starter-tasks`

### What it did before

The route accepted a `garden_plants_id` from the request body and used it to read `garden_plants.auto_irrigation` from the database **before any ownership check**. Any authenticated user could pass any `garden_plants_id` — including one belonging to another user — and learn whether that plant is auto-irrigated. The Chupchu context then generated task proposals for a plant the caller does not own.

The route is read-only (it generates proposals, does not write to `garden_tasks`), but it discloses another user's plant configuration to an attacker. In a future community-garden context where tasks could be created, this would be an authorization bypass.

### What it does now

Before any database access involving `garden_plants_id`, the handler calls `userOwnsGardenPlant(garden_plants_id, userId)` — the existing shared helper in `utils/ownership.ts`. This helper fails closed on any DB error (returns `false`). If the check fails, the route returns `403 Forbidden`, matching the response shape of every other route that uses this helper.

Additionally, the follow-on DB read of `garden_plants` now explicitly checks its `error` field (`if (gpError) throw gpError`) — the original code swallowed that error silently, which would have allowed a constraint or RLS failure to fall through as "plant has no irrigation config" rather than a proper 500.

### Diff summary (`packages/api/src/routes/chupchu.ts`)

**Added import (line 16):**
```typescript
import { userOwnsGardenPlant } from '../utils/ownership';
```

**Inside the handler, before any DB read (replaces the original opening block):**
```typescript
// BEFORE:
chupChuRouter.post('/starter-tasks', async (req: any, res) => {
  try {
    const { plant_name, variety, plant_type, location_type, garden_plants_id } = req.body;

    if (!plant_name || !String(plant_name).trim()) {
      return res.status(400).json({ error: 'plant_name is required' });
    }

    const today = todayInIsrael();

    let autoIrrigation = false;
    if (garden_plants_id) {
      const { data: gpRow } = await db   // ← error field ignored; no ownership check
        .from('garden_plants')
        .select('auto_irrigation')
        .eq('id', String(garden_plants_id))
        .single();
      autoIrrigation = gpRow?.auto_irrigation === true;
    }

// AFTER:
chupChuRouter.post('/starter-tasks', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { plant_name, variety, plant_type, location_type, garden_plants_id } = req.body;

    if (!plant_name || !String(plant_name).trim()) {
      return res.status(400).json({ error: 'plant_name is required' });
    }

    // Ownership check before any DB read involving the caller-supplied id.
    if (garden_plants_id) {
      if (!(await userOwnsGardenPlant(String(garden_plants_id), userId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const today = todayInIsrael();

    let autoIrrigation = false;
    if (garden_plants_id) {
      const { data: gpRow, error: gpError } = await db   // ← error now checked
        .from('garden_plants')
        .select('auto_irrigation')
        .eq('id', String(garden_plants_id))
        .single();
      if (gpError) throw gpError;
      autoIrrigation = gpRow?.auto_irrigation === true;
    }
```

### Sibling routes checked in chupchu.ts

Every other route that takes a caller-supplied resource ID was checked:

| Route | ID taken from caller | Ownership check | Status |
|---|---|---|---|
| POST /attach-diagnosis | `garden_plants_id`, `tracker_id` | Manual two-hop join to `gardens.user_id` (lines 692–711); tracker checked via `.eq('user_id', userId)` (line 733) | Already protected |
| POST /full-diagnosis | `garden_plants_id` (optional) | Only used for context enrichment, not for writing; no data returned from it | No write risk; acceptable |
| POST /analyze-image | none (image bytes in body) | n/a | OK |
| GET /history | none | `.eq('user_id', req.user.id)` | OK |
| DELETE /history | none | `.eq('user_id', req.user.id)` | OK |
| GET /memory | none | `.eq('user_id', req.user.id)` | OK |
| POST /memory/summarize | none | all writes keyed to `req.user.id` | OK |
| POST /chat | `gardenId` | `.eq('user_id', userId)` on the garden fetch | OK |

No additional unprotected sibling routes found in chupchu.ts.

---

## Fix 2 — `POST /api/push/send-daily`

### Investigation: does anything call this route?

**Nothing calls `POST /api/push/send-daily` via HTTP anywhere in the repository.**

Search results for `send-daily` and `send_daily` across the entire repo found only:
- The route definition itself (`push.ts:94`)
- The investigation report in `investigations/`

The cron job in `packages/api/src/services/cronJobs.ts` schedules a `sendDailySummary()` function directly (it is an in-process function call at line 12, not an HTTP request). That function is independent of and better than the HTTP route: it checks `notification_settings.enabled` and `notification_settings.daily_summary` before sending, and handles 404/410 subscription cleanup correctly. The HTTP route skips those checks.

**The push channel is live.** `webpush.sendNotification()` is called by the cron job daily. The HTTP route is a dead manual-trigger endpoint that was never wired to any scheduler.

### What it did before

`POST /send-daily` was registered under `pushRouter`, which applied `verifyToken` globally (`pushRouter.use(verifyToken)` at line 17). Any user with a valid bearer token could POST to this endpoint and trigger web-push notifications for every user in the system. No further authorization was required beyond being logged in.

Additionally, `verifyToken` is the wrong gate for a cron/operational endpoint: an external scheduler has no user session to present.

### What it does now

`verifyToken` is no longer a global router middleware. It is applied per-route to the five user-facing push routes (`vapid-public-key`, `subscribe`, `delete subscribe`, `settings GET`, `settings PATCH`).

`POST /send-daily` now requires an `x-cron-secret` request header whose value must match the `CRON_SECRET` environment variable, compared with `crypto.timingSafeEqual`. The route explicitly does **not** use `verifyToken`.

Failure modes:
- `CRON_SECRET` env var unset or empty → 503 `cron_not_configured` (fail closed)
- Header absent, wrong type, or wrong value → 401 `Unauthorized`
- Length mismatch between secret and provided value → `false` returned before `timingSafeEqual` (avoids the exception thrown when buffer lengths differ); treated as 401

### What the route does that the cron does NOT

The HTTP route does not check `notification_settings` before sending — it sends to all subscribers regardless of their preferences. This was a pre-existing bug. It was not fixed here because the route is dead (no caller) and the scope was authorization only. If this route is wired to an external scheduler in future, the handler should be updated to match `sendDailySummary()` in cronJobs.ts.

### Diff summary (`packages/api/src/routes/push.ts`)

```diff
-import { Router, type IRouter } from 'express';
+import { Router, type IRouter } from 'express';
+import { timingSafeEqual } from 'crypto';
 import { verifyToken } from '../middleware/auth';
 import { db } from '../db/client';
 import webpush from 'web-push';

 export const pushRouter: IRouter = Router();

 if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) { ... }

-pushRouter.use(verifyToken);  // ← removed global middleware
+
+function secretsEqual(a: string, b: string): boolean {
+  const aBuf = Buffer.from(a);
+  const bBuf = Buffer.from(b);
+  if (aBuf.length !== bBuf.length) return false;
+  return timingSafeEqual(aBuf, bBuf);
+}

-pushRouter.get('/vapid-public-key', (_req, res) => {
+pushRouter.get('/vapid-public-key', verifyToken, (_req, res) => {
   res.json({ key: process.env.VAPID_PUBLIC_KEY ?? '' });
 });

-pushRouter.post('/subscribe', async (req, res) => {
+pushRouter.post('/subscribe', verifyToken, async (req, res) => {
   ...
 });

-pushRouter.delete('/subscribe', async (req, res) => {
+pushRouter.delete('/subscribe', verifyToken, async (req, res) => {
   ...
 });

-pushRouter.get('/settings', async (req, res) => {
+pushRouter.get('/settings', verifyToken, async (req, res) => {
   ...
 });

-pushRouter.patch('/settings', async (req, res) => {
+pushRouter.patch('/settings', verifyToken, async (req, res) => {
   ...
 });

 pushRouter.post('/send-daily', async (req, res) => {
+  const secret = process.env.CRON_SECRET;
+  if (!secret) {
+    console.error('[POST /api/push/send-daily] CRON_SECRET env var is not set — rejecting request');
+    return res.status(503).json({ error: 'cron_not_configured' });
+  }
+  const provided = req.headers['x-cron-secret'];
+  if (typeof provided !== 'string' || !secretsEqual(secret, provided)) {
+    return res.status(401).json({ error: 'Unauthorized' });
+  }
   try {
     ... (body unchanged)
```

---

## Sibling routes checked in push.ts

All five other routes in push.ts operate on the requesting user's own data (subscriptions, settings) and are gated by `verifyToken`. No sibling routes were found with the same flaw.

---

## Things touched that were not explicitly requested

**`gpError` check in starter-tasks:** The original code used `const { data: gpRow } = await db...` with no `error` variable. Adding the ownership check above it required re-reading the plant row (the ownership helper already reads from `garden_plants`; we re-read for `auto_irrigation` as a second fetch). I added `error: gpError` and `if (gpError) throw gpError` to that second fetch. This is a correctness fix (swallowed DB errors should not silently produce `autoIrrigation = false`) that was directly adjacent to the security fix and required by the instructions ("Verify the ownership query explicitly checks its error field").

The re-read is slightly redundant (the ownership helper reads `garden_id` from the same table; we could have returned `auto_irrigation` from there). Left as-is to avoid changing the helper's interface.
