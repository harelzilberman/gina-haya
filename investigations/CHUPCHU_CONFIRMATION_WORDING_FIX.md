# Chupchu Confirmation Wording Fix

**Commit:** (see git log)  
**Date:** 2026-08-26  
**Scope:** `packages/api/src/services/claude.ts` only — prompt and tool descriptions. No schema, no route handlers, no web client, no Flutter client.

---

## The bug

A user wrote "יישמתי פרפרט 500 היום". Chupchu called `log_bd_prep`, the server returned `{ pending_confirmation: true }` and continued the agentic loop. On the second API call Chupchu replied **"רשמתי! הכנה 500 היום"** — *I recorded it* — even though nothing had been saved. The user had not confirmed anything.

Two secondary defects in the same reply:
- **"הכנה 500"** where the glossary (`CHUPCHU_GLOSSARY_HE`) explicitly requires **"פרפרט"** and forbids "הכנה".
- The tool description said "Log that the user applied…", implying an immediate write, and nothing in the system prompt told the model that `pending_confirmation: true` means the action is not yet saved.

---

## Diff

### Part 1 — Hebrew system prompt (`CHUPCHU_SYSTEM_PROMPT_HE`, ~line 115)

**Old:**
```
כלל מחייב: בכל פעם שאתה מציע תוכנית עם 2 שלבים ומעלה, אתה חייב לקרוא לכלי create_tasks באותה תשובה. זה לא אופציונלי. אם לא קראת ל-create_tasks, התשובה שלך אינה שלמה. הכלי מכין את המשימות לאישור המשתמש — המשתמש עדיין יצטרך ללחוץ על כפתור כדי לשמור.
```

**New (added line immediately after):**
```
כלי log_bd_prep ו-create_task מכינים רשומה לאישור המשתמש — הרשומה אינה נשמרת עד שהמשתמש ילחץ על כפתור. אל תכתוב ואל תרמוז שהפעולה בוצעה לפני האישור.
```

### Part 2 — English system prompt (`CHUPCHU_SYSTEM_PROMPT_EN`, Task Creation section)

**Added at the end of the Task Creation rules block:**
```
log_bd_prep and create_task queue a confirmation request — the entry is NOT saved until the user taps the confirmation button in the app. After calling either tool, do not state or imply that the action has been completed.
```

### Part 3 — `create_task` tool description

**Old:**
```
Create a single garden task from a mobile voice request. Use when user explicitly asks to remember or schedule one specific garden action. Different from create_tasks which proposes batches.
```

**New:**
```
Queue a single garden task for user confirmation. Use when user explicitly asks to remember or schedule one specific garden action. The task is NOT saved until the user taps the confirmation button — different from create_tasks which proposes batches.
```

### Part 4 — `log_bd_prep` tool description

**Old:**
```
Log that the user applied a biodynamic preparation today. Call when user says they applied or made a BD preparation.
```

**New:**
```
Queue a פרפרט (BD preparation) log entry for user confirmation. Call when user says they applied a BD preparation. The entry is NOT saved until the user taps the confirmation button in the app.
```

---

## Codepoints — every Hebrew string added or changed

### New line in `CHUPCHU_SYSTEM_PROMPT_HE`

`כלי log_bd_prep ו-create_task מכינים רשומה לאישור המשתמש — הרשומה אינה נשמרת עד שהמשתמש ילחץ על כפתור. אל תכתוב ואל תרמוז שהפעולה בוצעה לפני האישור.`

| Word | Codepoints |
|---|---|
| כלי | U+05DB U+05DC U+05D9 |
| ו (conjunction before create_task) | U+05D5 |
| מכינים | U+05DE U+05DB U+05D9 U+05E0 U+05D9 U+05DD |
| רשומה | U+05E8 U+05E9 U+05D5 U+05DE U+05D4 |
| לאישור | U+05DC U+05D0 U+05D9 U+05E9 U+05D5 U+05E8 |
| המשתמש | U+05D4 U+05DE U+05E9 U+05EA U+05DE U+05E9 |
| הרשומה | U+05D4 U+05E8 U+05E9 U+05D5 U+05DE U+05D4 |
| אינה | U+05D0 U+05D9 U+05E0 U+05D4 |
| נשמרת | U+05E0 U+05E9 U+05DE U+05E8 U+05EA |
| עד | U+05E2 U+05D3 |
| שהמשתמש | U+05E9 U+05D4 U+05DE U+05E9 U+05EA U+05DE U+05E9 |
| ילחץ | U+05D9 U+05DC U+05D7 U+05E6 |
| על | U+05E2 U+05DC |
| כפתור | U+05DB U+05E4 U+05EA U+05D5 U+05E8 |
| אל | U+05D0 U+05DC |
| תכתוב | U+05EA U+05DB U+05EA U+05D5 U+05D1 |
| ואל | U+05D5 U+05D0 U+05DC |
| תרמוז | U+05EA U+05E8 U+05DE U+05D5 U+05D6 |
| שהפעולה | U+05E9 U+05D4 U+05E4 U+05E2 U+05D5 U+05DC U+05D4 |
| בוצעה | U+05D1 U+05D5 U+05E6 U+05E2 U+05D4 |
| לפני | U+05DC U+05E4 U+05E0 U+05D9 |
| האישור | U+05D4 U+05D0 U+05D9 U+05E9 U+05D5 U+05E8 |

### `פרפרט` in `log_bd_prep` tool description (unchanged from prior use, included for completeness)

| Word | Codepoints |
|---|---|
| פרפרט | U+05E4 U+05E8 U+05E4 U+05E8 U+05D8 |

---

## Did `create_task` have the same problem?

**Yes.** Its description said "Create a single garden task…" — same "sounds like it already happened" defect as `log_bd_prep`'s "Log that the user applied…". No system prompt instruction existed for it. It has been fixed identically: description now says "Queue a single garden task for user confirmation… NOT saved until the user taps the confirmation button." The same Hebrew system prompt line and English Task Creation note cover both tools.

---

## Cache block structure — confirmed undisturbed

| Block | What it is | Status |
|---|---|---|
| Block 1 — `basePrompt` | `CHUPCHU_SYSTEM_PROMPT_HE/EN` + `CHUPCHU_GLOSSARY_HE` (HE only) + `ARTICLE_INDEX`. Sent with `cache_control: { type: 'ephemeral', ttl: '1h' }`. | **Changed** — new instructions added here. Cache will miss once per instance after deploy, then re-warm. |
| Tool cache | `cache_control: { type: 'ephemeral', ttl: '1h' }` on the last tool (`create_tasks`). Covers all 11 tool definitions. | **Changed** — `create_task` and `log_bd_prep` descriptions updated. Cache will miss once, then re-warm. |
| Block 2 — `stableContext` | Per-user stable context (garden, memory, tasks). Sent with `cache_control: { type: 'ephemeral', ttl: '1h' }`. | **Untouched.** |
| Block 3 — `volatileContext` | Per-request volatile context (date, weather, gardenTimelineSection). Never cached. | **Untouched.** |

`create_tasks` remains the last tool in `CHUPCHU_TOOLS` with `cache_control`. Tool count: 11. No tool was added or removed.

---

## How to test

### Exact phrase to send Chupchu

Send this in Hebrew (logged-in web or Flutter):

> **"יישמתי פרפרט 500 היום"**

### Wrong reply (before this fix)

> "רשמתי! הכנה 500 היום — נרשם בלוח."

Symptoms:
- Claims the action was recorded immediately
- Uses "הכנה" instead of "פרפרט" (glossary violation)
- No confirmation card appears (separate web-client gap — not fixed here)
- No row written to `garden_timeline`

### Correct reply (after this fix)

Chupchu should acknowledge the BD prep, use **"פרפרט"** (not "הכנה"), and ask the user to confirm — e.g.:

> "נהדר! פרפרט 500 — לחץ על כפתור האישור כדי לשמור את הרישום."

Or, phrased differently:

> "אחלה! פרפרט 500 בערב — לאישור הרישום לחץ על הכפתור למטה."

What it must NOT say: "רשמתי", "נרשם", "שמרתי", or any phrasing implying the action is complete.

### Secondary check — `create_task`

Send: **"תזכיר לי להשקות את הלימון מחר"**

Old wrong reply would say "נוסף!" or "שמרתי!" before the card appears.  
Correct reply: "בוודאי — לחץ על האישור כדי לשמור את המשימה." (or similar — pending, not done).

### Verify in Railway logs

The Railway log for the second API call (the `end_turn` turn) should show the conversational reply that does NOT claim completion. No other log change expected.

---

## What is NOT fixed here

- **Web client has no `mobileTool` handler.** The confirmation card for `log_bd_prep` (and `create_task`) does not render on gina-haya.com/chupchu. `packages/web` was explicitly out of scope. No row will be written to `garden_timeline` via web until the web client is updated.
- **`time_of_day` parameter** for `log_bd_prep` — still requires coordinated Flutter + web client release (see `GARDEN_TIMELINE_BUILD.md`).
- **"הכנה" in the system prompt body** (lines ~128, 131, 141 of the Hebrew prompt) — those use "הכנה" in educational biodynamic context (naming the preparations by their traditional number), not in user-facing reply generation. Out of scope.
