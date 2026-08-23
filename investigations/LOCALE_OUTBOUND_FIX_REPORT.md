# Locale Outbound Fix Report

Fixed: 2026-08-23

---

## Stored-language column — confirmed

Column: `users.language_preference`
Type: `language_enum NOT NULL DEFAULT 'he'` (PostgreSQL ENUM with values `'he'`, `'en'`)
Migration: `packages/api/src/db/migrations/001_initial_schema.sql:43`

The name `language_preference` from the investigation report is correct against the live schema. The `NOT NULL DEFAULT 'he'` constraint means a lookup for any existing user always returns a value — no NULL path.

---

## Fix 1 — starter-tasks

### Did Flutter already send the language?

**Yes — this was a read-and-use fix; no Flutter change needed.**

The Flutter investigation stated that all Chupchu endpoints pass `language` in the JSON body. The starter-tasks handler was destructuring only `{ plant_name, variety, plant_type, location_type, garden_plants_id }` from `req.body`, silently ignoring the `language` field that Flutter was already sending. Adding `language` to the destructuring was sufficient.

### What changed

File: `packages/api/src/routes/chupchu.ts`

1. `language` added to the `req.body` destructure (alongside existing fields).
2. `lang: 'he' | 'en'` computed — defaults to `'he'` when the value is absent or anything other than `'en'`. This matches the pattern used in `chupchu.ts` and `claude.ts` throughout.
3. `locationMap`, `typeMap` — now conditional on `lang`: English uses plain English values.
4. `contextParts` — labels (`"צמח:"` / `"Plant:"`, `"סוג:"` / `"Type:"`, etc.) conditional on `lang`.
5. `irrigationRule` — both branches now have he/en variants.
6. `systemPrompt` — full English variant added, structurally parallel to the Hebrew one:
   - JSON schema shape identical (same field names: `title`, `notes`, `date`, `category`, `priority`)
   - English title constraint: "up to 8 words" — same as Hebrew "עד 8 מילים"
   - `category` values unchanged (they are enum strings, language-neutral)
   - Same 2–3 task count, same 14-day date window, same `"medium"` priority default

The `enriched` output shape (lines 1118-1125) is unchanged — the client receives the same flat fields regardless of language.

### Diff summary

```diff
-    const { plant_name, variety, plant_type, location_type, garden_plants_id } = req.body;
+    const { plant_name, variety, plant_type, location_type, garden_plants_id, language } = req.body;
+
+    // language defaults to 'he' when absent
+    const lang: 'he' | 'en' = language === 'en' ? 'en' : 'he';
+    const isHe = lang === 'he';

-    const plantLabel = variety
-      ? `${String(plant_name).trim()} (זן: ${String(variety).trim()})`
-      : String(plant_name).trim();
+    const plantLabel = isHe
+      ? (variety ? `${String(plant_name).trim()} (זן: ${String(variety).trim()})` : String(plant_name).trim())
+      : (variety ? `${String(plant_name).trim()} (variety: ${String(variety).trim()})` : String(plant_name).trim());

-    const locationMap = { pot: 'עציץ', ... };
-    const typeMap = { annual: 'חד-שנתי', ... };
+    const locationMap = isHe ? { pot: 'עציץ', ... } : { pot: 'pot', ... };
+    const typeMap = isHe ? { annual: 'חד-שנתי', ... } : { annual: 'annual', ... };

-    const contextParts = [`צמח: ${plantLabel}`];
-    if (plant_type)    contextParts.push(`סוג: ...`);
-    if (location_type) contextParts.push(`מיקום גידול: ...`);
-    contextParts.push(`תאריך היום: ${today}`);
+    const contextParts = isHe ? [`צמח: ${plantLabel}`] : [`Plant: ${plantLabel}`];
+    if (plant_type)    contextParts.push(isHe ? `סוג: ...` : `Type: ...`);
+    if (location_type) contextParts.push(isHe ? `מיקום גידול: ...` : `Growing location: ...`);
+    contextParts.push(isHe ? `תאריך היום: ${today}` : `Today's date: ${today}`);

-    const irrigationRule = autoIrrigation
-      ? '\n- הצמח מושקה אוטומטית — אל תציע משימות השקיה'
-      : '\n- משימה ראשונה: השקיה ראשונית — היום או מחר, category: watering';
+    const irrigationRule = isHe
+      ? (autoIrrigation ? '\n- הצמח מושקה אוטומטית ...' : '\n- משימה ראשונה ...')
+      : (autoIrrigation ? '\n- The plant is auto-irrigated ...' : '\n- First task: initial watering ...');

-    const systemPrompt = `אתה צ'ופצ'ו — ... [Hebrew only]`;
+    const systemPrompt = isHe
+      ? `אתה צ'ופצ'ו — ... [Hebrew unchanged]`
+      : `You are Chupchu — ... [English equivalent]`;
```

---

## Fix 2 — Push notifications

### Is the cron path live?

**Yes — the cron path is live and delivering.** `sendDailySummary()` in `cronJobs.ts` is called in-process by `node-cron` every day at 07:00 Israel time (04:00 UTC). This path:
- Checks `notification_settings.enabled` and `notification_settings.daily_summary` per user before sending
- Handles 404/410 responses by deleting stale subscriptions
- Is entirely separate from the dead HTTP route `POST /api/push/send-daily` (secured in the previous fix session)

### The 4 locations fixed

| # | File | Location | What changed |
|---|---|---|---|
| 1 | `cronJobs.ts` | `sendDailySummary` — `title` | Hebrew/English conditional on per-user `language_preference` |
| 2 | `cronJobs.ts` | `sendDailySummary` — `more` ("+ N more tasks") | Hebrew/English conditional |
| 3 | `cronJobs.ts` | `sendAnnualRenewalReminders` — renewal push `title`+`body` | Hebrew/English conditional; date locale also switches (`he-IL` / `en-US`) |
| 4 | `cronJobs.ts` | `sendSmartReminder` — `title` | Hebrew/English conditional |

The dead HTTP route (`push.ts POST /send-daily`) also contained one hardcoded Hebrew title — fixed for completeness as it is in scope.

### Where the strings live

There is no existing central bilingual-string store in the backend. The closest precedent is `email.ts`, which uses inline `isHe ? ... : ...` ternaries. Given that all four push locations are small and already in the same file (`cronJobs.ts`), I used the same inline ternary pattern rather than introducing a new abstraction. This keeps the pattern consistent with `email.ts` and avoids one-off infrastructure.

### Per-user language lookup pattern (cron paths)

Each of the three cron functions now queries `users.language_preference` per recipient:

```typescript
const { data: userData, error: langError } = await db
  .from('users')
  .select('language_preference')
  .eq('id', sub.user_id)
  .maybeSingle();
const isHe = langError || !userData || userData.language_preference !== 'en';
```

The Supabase client returns errors in the result object rather than throwing — the `langError` check ensures that a failed query falls back to Hebrew, not an exception crash. `maybeSingle()` returns `null` (not an error) when the user row doesn't exist; the `!userData` guard covers that path.

For `sendAnnualRenewalReminders`, `language_preference` was added to the existing `users` select that already fetched `email` and `display_name` — no additional query.

### Tier name in renewal push

`tierNameHe` (the Hebrew tier name, e.g. "גנן ביתי") appears in both the Hebrew and English renewal push body: `"Your ${tierNameHe} plan expires..."`. This is intentional — English tier display names are a brand decision flagged below.

---

## Fix 3 — `sendRenewalReminder()`

### What changed

File: `packages/api/src/services/email.ts`

`sendRenewalReminder()` received a new optional `language?: 'he' | 'en'` field in its opts object. Default is `'he'` (when `language` is absent or any value other than `'en'`).

- **Subject line**: switches between Hebrew and English
- **`from` address**: switches between `FROM_HE` (`צ'ופצ'ו מגינה חיה`) and `FROM_EN` (`ChupChu from Gina Haya`) — these already existed in `email.ts`
- **`expiryStr` date locale**: switches between `'he-IL'` and `'en-US'`
- **HTML body**: full English variant added, structurally parallel to the Hebrew template

The caller in `sendAnnualRenewalReminders` (cronJobs.ts) now passes `language: userLang` after adding `language_preference` to the user select.

### Flagged — tier names not translated

The `tierNameHe` parameter (Hebrew tier name from `tiers.ts`, e.g. "גנן ביתי", "גנן מתקדם") is used **as-is in both the Hebrew and English email body**. English emails will read: "Your **גנן ביתי** subscription on Gina Haya expires on...". This is intentional — English tier display names (`displayNameEn`) do not exist in `packages/shared/src/constants/tiers.ts`, and the task explicitly listed `ביתי` and `מקצועי` as brand decisions to be made separately.

### Flagged — other Resend templates with the same gap

`sendCancellationRequestNotice()` in `email.ts` is Hebrew-only. However, it is an **admin email** sent to `ADMIN_EMAIL` (harelzilberman@gmail.com), not to end users. It is out of scope and correct to leave as Hebrew-only.

---

## How to manually test

### Test 1 — starter-tasks

The endpoint accepts `language` in the JSON body. Call it with `language: 'en'` to get English output:

```bash
curl -s -X POST https://<railway-api-url>/api/chupchu/starter-tasks \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"plant_name":"Tomato","plant_type":"annual","location_type":"garden","language":"en"}'
```

Expected: task `title` and `notes` fields in English. Omit `language` or pass `language: "he"` to confirm Hebrew still works.

### Test 2 — Push notifications (daily summary)

**To flip your user to English:**
```sql
UPDATE users SET language_preference = 'en' WHERE email = 'harelzilberman@gmail.com';
```

**To trigger the daily summary without waiting for 07:00:**

The cron function `sendDailySummary` is not exported. The easiest path is to call `sendAnnualRenewalReminders` (which is exported) — but that only sends if a subscription is expiring. Instead, you can temporarily invoke the daily summary via the HTTP route:

```bash
curl -s -X POST https://<railway-api-url>/api/push/send-daily \
  -H "x-cron-secret: <CRON_SECRET value from Railway>"
```

This hits the HTTP dead route (now bilingual), which does the same work as the cron but skips notification_settings checks. You must have a push subscription registered and at least one pending `garden_tasks` row for today.

**After testing, flip back:**
```sql
UPDATE users SET language_preference = 'he' WHERE email = 'harelzilberman@gmail.com';
```

### Test 3 — sendRenewalReminder() (email)

The easiest path: temporarily insert a fake subscription row expiring within 7 days, then trigger the cron function manually.

```sql
-- Insert a test row (use your own user_id and product_id)
INSERT INTO user_subscriptions (user_id, platform, base_plan_id, product_id, status, expires_at)
VALUES (
  '<your-user-id>',
  'grow',
  'annual',
  'professional',
  'active',
  NOW() + INTERVAL '3 days'
);
```

Then call `sendAnnualRenewalReminders` via a temporary test route, or add a one-off Express route that calls it directly. Alternatively, since `sendAnnualRenewalReminders` is exported from `cronJobs.ts`, you can call it from a Railway shell session or a temporary test endpoint.

Set `language_preference = 'en'` for your user before triggering to see the English email. The renewal reminder email will arrive at `harelzilberman@gmail.com`.

**Clean up after testing:**
```sql
DELETE FROM user_subscriptions WHERE platform = 'grow' AND base_plan_id = 'annual' AND expires_at < NOW() + INTERVAL '4 days';
UPDATE users SET language_preference = 'he' WHERE email = 'harelzilberman@gmail.com';
```

---

## Things touched beyond the three fixes

**`push.ts` HTTP dead route** (line ~155): Added per-user language lookup and bilingual title, for completeness. The task listed 4 hardcoded push locations — this was the 4th. The route itself was not further changed.

**No other files touched.** TypeScript compilation (`npx tsc --noEmit`) passes clean after all changes.

---

## Things explicitly not touched

- `plantVision.ts` — out of scope
- `packages/web` — out of scope
- `garden_tasks` schema — stays flat TEXT
- `tiers.ts` `displayNameEn` — brand decision, flagged above
- `analyze-image` partially-broken lang handling — out of scope
- Migration files — no changes
