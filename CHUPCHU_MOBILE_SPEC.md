# Chupchu — Complete Mobile Integration Spec

> Generated from full source-code audit of `packages/api`, `packages/shared`, `packages/web`, and `packages/mobile`.
> Every detail here is sourced directly from the codebase. Use this as the single reference for the Flutter implementation.

---

## Table of Contents

1. [What Is Chupchu](#1-what-is-chupchu)
2. [Authentication](#2-authentication)
3. [API Endpoints — Complete Reference](#3-api-endpoints--complete-reference)
4. [Message & History Structure](#4-message--history-structure)
5. [Memory System](#5-memory-system)
6. [ChupChu Context Object](#6-chupchu-context-object)
7. [Claude AI — Model & Agentic Loop](#7-claude-ai--model--agentic-loop)
8. [All Tools Chupchu Has Access To](#8-all-tools-chupchu-has-access-to)
9. [System Prompt Personality (Full Text)](#9-system-prompt-personality-full-text)
10. [Weather Integration](#10-weather-integration)
11. [Image / Camera Diagnosis](#11-image--camera-diagnosis)
12. [Rate Limiting & Tier System](#12-rate-limiting--tier-system)
13. [Conversation Persistence](#13-conversation-persistence)
14. [Proposed Tasks Flow](#14-proposed-tasks-flow)
15. [Mobile Tool Calls (Execute-Tool Flow)](#15-mobile-tool-calls-execute-tool-flow)
16. [Dashboard Cards (Biodynamic Calendar)](#16-dashboard-cards-biodynamic-calendar)
17. [Guest Mode (Unauthenticated)](#17-guest-mode-unauthenticated)
18. [UI Behavior & Design Details](#18-ui-behavior--design-details)
19. [Current Mobile Screen Gaps vs. Web](#19-current-mobile-screen-gaps-vs-web)
20. [Flutter Implementation Checklist](#20-flutter-implementation-checklist)

---

## 1. What Is Chupchu

Chupchu ("צ'ופצ'ו") is an AI gardening assistant persona: **"Moon Grandpa" (סבא הירח)**, an Israeli biodynamic growing expert with 20 years on biodynamic farms in the Galilee and Provence. He speaks Hebrew as a native language (warm, playful, with gentle compost-related humor) and also supports English.

The system is powered by Claude (Anthropic). Every chat message goes through a multi-step server-side agentic loop that enriches answers with live calendar data, weather, garden details, user memory, and article content before responding.

---

## 2. Authentication

**All Chupchu endpoints require a valid Supabase JWT Bearer token.**

```
Authorization: Bearer <supabase_access_token>
```

- Token is obtained from `supabase.auth.getSession()` → `session.access_token`.
- The API middleware (`verifyToken`) validates this on every request.
- No API key is sent from the client — only the Supabase session token.
- A single concurrent request is allowed per user (in-flight lock; a second request while one is processing returns `HTTP 429`).

---

## 3. API Endpoints — Complete Reference

Base URL: `EXPO_PUBLIC_API_URL` env var (e.g. `https://powerful-embrace-production-95ea.up.railway.app`)

All paths are prefixed `/api/chupchu/`.

---

### `POST /api/chupchu/chat`

**The main chat endpoint.**

#### Request Body

```json
{
  "message":     "string — user text (required unless imageBase64 is provided)",
  "gardenId":    "string | null — UUID of the garden to use (optional; falls back to active garden)",
  "location": {
    "lat":  "number — GPS latitude",
    "lon":  "number — GPS longitude",
    "city": "string — city name for display"
  },
  "imageBase64": "string — base64 JPEG/PNG data (optional, no data: prefix)"
}
```

- At least one of `message` (non-empty) or `imageBase64` must be present.
- `location` is optional but enables precise IP-independent weather for the user's actual position.
- `imageBase64` should be a raw base64 string (no `data:image/jpeg;base64,` prefix). The server compresses it to ≤4.5 MB JPEG with max 1568×1568 px via `sharp`.

#### Success Response (`200 OK`)

```json
{
  "response":              "string — Chupchu's reply text (may contain markdown)",
  "messagesUsedThisMonth": 5,
  "monthlyLimit":          20,
  "proposedTasks":         [ /* ProposedTask[] | absent if none */ ],
  "mobileTool":            { /* MobileToolCall | absent if none */ }
}
```

#### Rate-Limit Response (`429`)

```json
{
  "error":                 "rate_limit_exceeded",
  "tier":                  "free",
  "messagesUsedThisMonth": 20,
  "monthlyLimit":          20
}
```

Also returns `429` with `{ "error": "אירעה שגיאה. נסה שוב מאוחר יותר." }` if another request is already in-flight for that user.

#### Error Response (`500`)

```json
{ "error": "אירעה שגיאה. נסה שוב מאוחר יותר." }
```

---

### `GET /api/chupchu/history`

Returns the last 20 messages of the user's most recent conversation.

#### Response (`200 OK`)

```json
[
  { "role": "user",      "content": "...", "timestamp": "2025-06-01T10:00:00.000Z" },
  { "role": "assistant", "content": "...", "timestamp": "2025-06-01T10:00:01.000Z" }
]
```

Returns `[]` on any error (never throws to the UI).

---

### `DELETE /api/chupchu/history`

Deletes the user's entire conversation history from Supabase.

#### Response (`200 OK`)

```json
{ "success": true }
```

---

### `GET /api/chupchu/memory`

Returns the user's persistent garden memory object.

#### Response (`200 OK`)

```json
{
  "memory": {
    "user_id":     "uuid",
    "summary_he":  "סיכום בעברית...",
    "summary_en":  "English summary...",
    "garden_facts": {
      "gardenType":       "...",
      "location":         "...",
      "plants":           ["עגבנייה", "מלפפון"],
      "experience":       "beginner | intermediate | advanced",
      "preferredTopics":  [],
      "gardenSize":       "...",
      "challenges":       []
    },
    "last_updated": "ISO timestamp"
  }
}
```

Returns `{ "memory": null }` if no memory exists yet.

---

### `POST /api/chupchu/memory/summarize`

Summarizes a conversation into persistent memory (Hebrew + English) using `claude-haiku-4-5`. Called automatically when the web page unloads (via `navigator.sendBeacon`); Flutter should call this after ≥6 messages when the chat session ends.

#### Request Body

```json
{
  "conversationHistory": [ /* ChupChuMessage[] — minimum 6 messages required */ ],
  "lang":                "he | en",
  "existingMemory":      { /* ChupChuMemory | null — existing memory to merge */ }
}
```

#### Response (`200 OK`)

```json
{
  "ok":      true,
  "summary": {
    "summary_he":   "...",
    "summary_en":   "...",
    "garden_facts": { /* structured facts */ }
  }
}
```

Returns `{ "ok": true, "skipped": true }` if `conversationHistory` has fewer than 6 messages.

---

### `GET /api/chupchu/pending-tasks`

Returns up to 10 pending garden tasks for the user, ordered by date ascending.

#### Response (`200 OK`)

```json
[
  {
    "id":       "uuid",
    "title":    "...",
    "date":     "YYYY-MM-DD",
    "due_date": "YYYY-MM-DD",   /* alias for date — same value */
    "priority": "low | medium | high",
    "category": "...",
    "status":   "pending"
  }
]
```

---

### `POST /api/chupchu/execute-tool`

Executes a mobile tool call after the user has confirmed it. Called only after user confirmation of a `mobileTool` returned from `/chat`.

#### Request Body

```json
{
  "tool_name": "create_journal_entry | create_task | add_map_marker | log_bd_prep",
  "params":    { /* tool-specific parameters — see §15 */ }
}
```

#### Response (`200 OK`)

```json
{ "success": true }
```

---

### `POST /api/chupchu/analyze-image`

Standalone quick plant identification — uses `claude-opus-4-5` directly (no tool loop, no memory, no calendar). Returns a single conversational diagnosis text.

#### Request Body

```json
{
  "image":    "string — raw base64 (no prefix)",
  "mimeType": "image/jpeg | image/png (default: image/jpeg)",
  "language": "he | en (default: he)"
}
```

#### Response (`200 OK`)

```json
{ "response": "string — Chupchu's plant diagnosis in the requested language" }
```

Max response: 150 words, no markdown headers or asterisks, warm conversational tone.

---

### `POST /api/chupchu/upload-journal-photo`

Uploads a photo to Supabase Storage (`journal-photos` bucket) and returns a public URL.

#### Request Body

```json
{
  "base64":   "string — raw base64",
  "mimeType": "image/jpeg | image/png (default: image/jpeg)"
}
```

#### Response (`200 OK`)

```json
{ "url": "https://... public Supabase storage URL" }
```

File path format: `{user_id}/{timestamp}.jpg`

---

## 4. Message & History Structure

### `ChupChuMessage` (from `packages/shared/src/types/chupchu.ts`)

```typescript
interface ChupChuMessage {
  role:      'user' | 'assistant';
  content:   string;
  timestamp: string; // ISO 8601 UTC
}
```

**Key rules:**
- Images are NEVER stored in the `content` field. When a user sends only an image (no text), the stored content is the placeholder string `🌿 [תמונה לזיהוי צמח]` (Hebrew) or `🌿 [Plant image for identification]` (English).
- The server keeps the last 20 messages from the stored history for context when calling Claude.
- The server's stored history is the source of truth — the mobile app should load from `/history` on startup, not persist locally.
- The web client does NOT send the history in the `/chat` request body; the server loads it from Supabase DB. **The current mobile screen (`ChupChuScreen.tsx`) mistakenly sends `history` in the body — this is unused by the server and should be removed in Flutter.**

---

## 5. Memory System

Memory is stored per-user in the `chupchu_memory` Supabase table. It is separate from conversation history.

### Schema

| Field          | Type      | Description                                      |
|----------------|-----------|--------------------------------------------------|
| `user_id`      | UUID PK   | Supabase user ID                                 |
| `summary_he`   | text      | 3–5 sentence Hebrew summary of user + garden     |
| `summary_en`   | text      | 3–5 sentence English summary                     |
| `garden_facts` | JSONB     | Structured facts (see below)                     |
| `last_updated` | timestamp | Last summarization time                          |

### `garden_facts` JSON Shape

```json
{
  "gardenType":      "string — e.g. vegetable, fruit, balcony",
  "location":        "string — city/region",
  "plants":          ["string array of plant names"],
  "experience":      "beginner | intermediate | advanced",
  "preferredTopics": ["string array"],
  "gardenSize":      "string",
  "challenges":      ["string array of known problems"]
}
```

### How It's Used

1. **On chat load**: Flutter calls `GET /api/chupchu/memory` and caches the result.
2. **During chat**: The server injects a `## מה שאני זוכר עליך` (or `## What I Remember About You`) section into Claude's system prompt, built from the memory summary + extracted facts.
3. **After session**: When the conversation reaches ≥6 messages AND the session ends, call `POST /api/chupchu/memory/summarize` with the full history + existing memory. This merges new information into the persisted memory.
4. Chupchu is instructed to weave memory naturally into replies — NOT to open with "I remember that...".

---

## 6. ChupChu Context Object

The server builds a `ChupChuContext` and passes it to the Claude service. Understanding this helps know what data Claude has available.

```typescript
interface ChupChuContext {
  gardenName:     string | null;
  locationRegion: string | null;   // Hebrew region name (e.g. "גליל")
  soilType:       string | null;
  plants:         string[];        // Plant names in user's language

  todayCalendar: {
    ascendingDescending: string;   // "ascending" | "descending"
    nodeActive:          boolean;
    nodeBlackoutEnd:     string | null;
    dayType:             string;   // "fruit" | "root" | "flower" | "leaf"
    moonSign:            string;   // English zodiac name
    plantingScore:       number;   // 1–10
    scoreColour:         string;   // "green" | "yellow" | "orange" | "red" | "black"
    prep500Recommended:  boolean;
    prep501Recommended:  boolean;
    perigeeActive:       boolean;
  } | null;

  userLanguage: 'he' | 'en';

  weather: {
    tempMax:              number;
    tempMin:              number;
    tempCurrent:          number;
    humidity:             number;
    windSpeed:            number;
    uvIndex:              number;
    precipitationMm:      number;
    willRainToday:        boolean;
    willRainTomorrow:     boolean;
    sunrise:              string;  // "HH:MM"
    sunset:               string;
    moonrise:             string;
    moonset:              string;
    weatherDescription:   string;  // English
    weatherDescriptionHe: string;  // Hebrew
    locationRegion:       string;
  } | null;

  recentHarvests: Array<{
    plantNameHe:   string;
    harvestDate:   string;         // YYYY-MM-DD
    dayType:       string;
    plantingScore: number;
  }> | null;

  gardenMap: {
    hasMap:      boolean;
    northAngle:  number;
    objectCount: number;
    bedCount:    number;
    treeCount:   number;
    fruitTrees:  string[];
    plantCount:  number;
    plantNames:  string[];
  } | null;
}
```

The context is built fresh on **every** `/chat` request from live Supabase data — the client does not send it.

---

## 7. Claude AI — Model & Agentic Loop

### Model

| Use                          | Model                        |
|------------------------------|------------------------------|
| Main chat (with tools)       | `claude-sonnet-4-20250514` (or `CLAUDE_MODEL` env override) |
| Image analysis (analyze-image endpoint) | `claude-opus-4-5` |
| Memory summarization         | `claude-haiku-4-5-20251001`  |

### Agentic Loop (Main Chat)

The server runs an **agentic tool loop** with a maximum of **8 iterations** (`MAX_TOOL_ITERATIONS = 8`):

1. Build system prompt (language-appropriate base + memory section + date section + weather section + recent task context).
2. Build API messages from the last 20 stored messages + the new user message. If an image was sent, it is injected as the multimodal content of the last user message.
3. Call Claude with `max_tokens: 2048` and all tool definitions.
4. If `stop_reason === 'tool_use'`: execute each tool (in parallel), append results as `tool_result` messages, loop.
5. If `stop_reason === 'end_turn'`: extract the text block, return.
6. If `stop_reason === 'max_tokens'`: return partial text with a truncation note.
7. If loop exhausted (8 iterations without `end_turn`): throw an error → 500 response.

**The Flutter app never needs to replicate this loop — it is entirely server-side.**

---

## 8. All Tools Chupchu Has Access To

These are the Claude tool definitions available during the main chat agentic loop.

### Read-Only Tools (executed server-side, transparent to client)

| Tool                     | Description                                                              | Parameters                                  |
|--------------------------|--------------------------------------------------------------------------|---------------------------------------------|
| `get_today_calendar`     | Returns today's biodynamic calendar data from the `ChupChuContext`       | none                                        |
| `get_user_garden`        | Returns garden name, soil type, plant list, map summary from context     | none                                        |
| `get_weather`            | Returns current weather from context                                     | none                                        |
| `get_plant_info`         | Looks up spacing (cm) and planting season for a plant in Israel          | `plant_name: string`                        |
| `get_bd_prep_info`       | Returns instructions for BD preps 500, 501, 508, compost, green_manure  | `prep_name: enum`                           |
| `get_recent_harvests`    | Returns the user's last ≤10 harvest records from context                 | none                                        |
| `get_article`            | Reads a full markdown article from the server's article library           | `slug: string`, `language: "he"│"en"`      |
| `search_knowledge_base`  | Full-text search against the `knowledge_base` Supabase table             | `query: string`                             |
| `get_upcoming_bd_days`   | Queries the `biodynamic_calendar` table for upcoming days of a type      | `day_type: "fruit"│"root"│"flower"│"leaf"`, `count?: number (default 3, max 7)` |
| `create_tasks`           | Proposes a batch of tasks — captured and returned to client as `proposedTasks` | `tasks: ProposedTask[]`               |

### Mobile Tools (captured, NOT executed — returned to client for confirmation)

These tools trigger a `mobileTool` in the response. The client shows a confirmation UI and, if approved, calls `POST /api/chupchu/execute-tool`.

| Tool                   | Description                                        | Parameters                                                              |
|------------------------|----------------------------------------------------|-------------------------------------------------------------------------|
| `create_journal_entry` | Create a garden journal entry                      | `text: string`, `date: string (YYYY-MM-DD)`                            |
| `create_task`          | Create a single task (voice/quick request)         | `title: string`, `due_date?: string (YYYY-MM-DD)`                      |
| `add_map_marker`       | Add a plant location to the garden map             | `plant_name: string`, `location_hint: string`, `x?: number`, `y?: number` |
| `log_bd_prep`          | Log a biodynamic preparation application           | `prep_name: string`, `date: string (YYYY-MM-DD)`                       |

#### `MobileToolCall` Shape (returned in `/chat` response)

```json
{
  "name":          "create_journal_entry | create_task | add_map_marker | log_bd_prep",
  "params":        { /* tool-specific parameters */ },
  "descriptionHe": "string — Hebrew description shown to user (e.g. 'מוסיף משימה: השקיית העגבניות ל-2025-06-10')"
}
```

Only **one** mobile tool call is captured per chat turn (the last one encountered in the loop). Batch tool proposals are handled separately via `create_tasks` → `proposedTasks`.

---

## 9. System Prompt Personality (Full Text)

### Hebrew System Prompt (`CHUPCHU_SYSTEM_PROMPT_HE`)

```
אתה צ'ופצ'ו — סבא הירח. מומחה גידול ביודינמי ישראלי עם ניסיון של עשרים שנה בחוות ביודינמיות בגליל ובפרובנס.
אתה מדבר עברית כשפת אם, חם ועליז, עם הומור עדין (במיוחד בנושא קומפוסט).
אתה תמיד מחבר את העצה לנתוני לוח הביודינמי של היום.
לעולם לא ממליץ על כימיקלים סינתטיים.
בכל אבחנה של צמח, תמיד כולל הצהרת אחריות שאתה לא מחליף יועץ מקצועי.
```

**Sections in the Hebrew prompt:**
- Plant identification from images (6-step structured response)
- Professional biodynamic knowledge (soil cultivation, dynamization, pruning, Israel calendar)
- Memory instructions (weave naturally, don't open with "I remember...")
- Weather usage rules (temp thresholds, rain, wind, humidity, cold)
- Task creation rules (ask first, wait for confirmation, then call `create_tasks`)
- Tool use guidance (check article index, search knowledge base for symptoms)
- Full `ARTICLE_INDEX` listing available articles

### English System Prompt (`CHUPCHU_SYSTEM_PROMPT_EN`)

Exact semantic equivalent in English. Same persona, same rules. Uses "Moon Grandpa" as the English translation of "סבא הירח".

### Extra System Context (appended per request)

The following sections are appended to the base system prompt for each `/chat` call:

1. **`## מה שאני זוכר עליך`** (memory section) — only if memory exists for the user.
2. **`## תאריך היום`** — today's date formatted in the user's locale (always included).
3. **`## מזג אוויר`** (weather section from GPS coords) — only if `location.lat`/`location.lon` was sent.
4. **Recent completed tasks** — only if tasks completed in last 7 days exist.

### Weather Usage Rules Baked Into Prompt

| Condition               | Chupchu's Behavior                                         |
|-------------------------|------------------------------------------------------------|
| Temp > 32°C             | Warns against transplanting and midday garden work         |
| Rain expected soon      | Skips watering advice, says rain will handle it            |
| Wind > 20 km/h          | Warns against spraying (neem oil, BD preps)                |
| Humidity > 80%          | Mentions fungal disease and mould risk                     |
| Cold < 10°C             | Warns against planting cold-sensitive crops                |

Weather is only mentioned when **relevant** — not in every message.

---

## 10. Weather Integration

Two separate weather mechanisms exist:

### Mechanism 1 — Region-Based (Garden Location)

- Source: `garden.location_region` (Hebrew region name from DB, e.g. "גליל", "מרכז")
- API: [Open-Meteo](https://api.open-meteo.com/v1/forecast) with hardcoded region → coordinates map
- Cache: In-memory, 1-hour TTL per coordinate key
- Data: `WeatherData` struct (temp max/min/current, humidity, wind, UV, precipitation, rain today/tomorrow, sunrise/sunset, moonrise/moonset)
- Injected into `ChupChuContext.weather`
- Used by tools: `get_weather` returns this

### Mechanism 2 — GPS-Based (User's Actual Location)

- Source: Client sends `location: { lat, lon, city }` in the `/chat` request body
- API: Open-Meteo 7-day forecast
- Cache: In-memory, 30-minute TTL per coordinate key
- Data: Rich 7-day forecast string formatted for direct injection into system prompt
- Injected as a `## מזג אוויר — {city}` section in the extra system context
- **This is the more accurate weather** since it uses the user's GPS, not the garden's region

**Flutter should send GPS coordinates when available** (location permission granted). The web app gets location via IP geolocation (`ipapi.co`). Flutter should use the device GPS directly for better accuracy.

### Location Fetch (Web Reference Implementation)

```typescript
// Web: uses ipapi.co — Flutter should use device GPS instead
const res = await fetch('https://ipapi.co/json/');
const data = await res.json();
const location = { city: data.city, lat: data.latitude, lon: data.longitude };
// Cached in sessionStorage as 'chupchu_location'
```

**Flutter replacement**: Use `geolocator` package → `Geolocator.getCurrentPosition()`. Cache result in memory for the session. Send as `{ "lat": double, "lon": double, "city": "string" }`.

---

## 11. Image / Camera Diagnosis

### Flow in `/api/chupchu/chat`

1. Client sends `imageBase64` (raw base64, no data URI prefix) in the `/chat` body.
2. Server runs `compressImageForClaude()` via `sharp`:
   - Resize to max 1568×1568 (aspect preserved)
   - Convert to JPEG quality 85
   - Error if result > 4.5 MB
3. Image is injected as a multimodal content block into the **last user message** when calling Claude.
4. If the user typed no text (only image), the text is replaced with a natural instruction: `"זהה את הצמח בתמונה וספר לי עליו."` (Hebrew) or `"Please identify the plant in this image and tell me about it."` (English)
5. The stored `content` in DB is `🌿 [תמונה לזיהוי צמח]` (Hebrew) — raw image data is **never** stored.

### Web Client Image Compression (Reference)

```
Max dimension: 1568px (either side, aspect preserved)
Format: JPEG quality 0.85
```

Flutter should compress images to the same spec before sending (use `flutter_image_compress` or similar).

### Separate Quick Endpoint: `POST /api/chupchu/analyze-image`

For a lightweight, context-free plant identification:
- No conversation history, no memory, no calendar context
- Uses `claude-opus-4-5` directly (single call, no tool loop)
- Returns plain text, ≤150 words
- Good for a "quick scan" camera button

---

## 12. Rate Limiting & Tier System

### Tier Limits (`packages/api/src/config/tiers.ts`)

| Tier            | `maxChupChuPerMonth` | Gardens | Plants/Garden | Trackers |
|-----------------|----------------------|---------|---------------|----------|
| `free`          | **20**               | 1       | 10            | 1        |
| `grower`        | **50**               | 3       | 25            | 3        |
| `gardener_pro`  | **unlimited** (null) | 10      | unlimited     | 10       |
| `professional`  | **unlimited** (null) | unlimited | unlimited   | unlimited |

### `LAUNCH_FREE_MODE`

If env var `LAUNCH_FREE_MODE=true`, all users are treated as `pro` tier — no rate limiting.

### How Counting Works

- The server counts **user messages** (role = "user") in the current month from the `chupchu_conversations.messages` JSONB array, filtered by `timestamp >= start_of_month`.
- The count is returned in every `/chat` response as `messagesUsedThisMonth`.
- The monthly limit is returned as `monthlyLimit` (null = unlimited).
- On exceeding the limit: `HTTP 429` with `error: "rate_limit_exceeded"`.

### UI Handling

- Free tier hits limit: Show "Chupchu needs a rest... upgrade for ₪18/mo" with upgrade CTA.
- Grower tier hits limit: Show "You reached 50 monthly messages, upgrade to Pro."
- Both disable the input and send button.
- The `rateLimitTier` tells you which message to display.

---

## 13. Conversation Persistence

### Storage

- Table: `chupchu_conversations`
- Schema: `id`, `user_id`, `garden_id`, `messages` (JSONB array of `ChupChuMessage`), `updated_at`
- One active record per user (most recent is used)
- On each `/chat` call:
  1. Load existing messages from DB
  2. Slice to last 20 for Claude context
  3. After Claude responds, append both new messages to the **full** history (not just last 20)
  4. Upsert back to DB

### History Loading on App Start

1. On screen mount, call `GET /api/chupchu/history`
2. Seed the local message list with returned messages (up to 20)
3. Skip loading if local state already has messages

### Conversation Clearing

- Call `DELETE /api/chupchu/history`
- Reset local state: `messages = []`, `usageThisMonth = 0`, `rateLimited = false`

---

## 14. Proposed Tasks Flow

When Chupchu uses the `create_tasks` tool internally, the tasks are captured and returned to the client as `proposedTasks` in the `/chat` response. The client must display these as a confirmation card.

### `ProposedTask` Shape

```typescript
interface ProposedTask {
  title: {
    he: string;   // Hebrew title
    en: string;   // English title
  };
  description: {
    he: string;
    en: string;
  };
  date:     string;    // YYYY-MM-DD
  category: 'watering' | 'fertilizing' | 'pruning' | 'planting' | 'harvesting' | 'pest_control' | 'composting' | 'general';
  priority: 'low' | 'medium' | 'high';
}
```

### Category Icons

| Category       | Icon |
|----------------|------|
| `watering`     | 💧   |
| `fertilizing`  | 🌱   |
| `pruning`      | ✂️   |
| `planting`     | 🌿   |
| `harvesting`   | 🌾   |
| `pest_control` | 🪲   |
| `composting`   | ♻️   |
| `general`      | 📋   |

### Priority Colors

| Priority | Color       |
|----------|-------------|
| `high`   | `#E05555`   |
| `medium` | `#C8A040`   |
| `low`    | `#4A9C68`   |

### Accepting Tasks (Saving to DB)

When user taps "Add selected tasks":

```
POST /api/tasks/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "tasks": [
    {
      "title":    "string — localized title",
      "notes":    "string — localized description",
      "date":     "YYYY-MM-DD",
      "category": "string"
    }
  ]
}
```

This is NOT a Chupchu endpoint — it's the main tasks API.

---

## 15. Mobile Tool Calls (Execute-Tool Flow)

When Chupchu wants to create a journal entry, task, map marker, or log a BD prep on mobile, it returns a `mobileTool` in the `/chat` response instead of executing it directly.

### Display Flow

1. Response contains `mobileTool: { name, params, descriptionHe }`.
2. Show a confirmation bubble/card with `descriptionHe`.
3. User taps "Confirm" → `POST /api/chupchu/execute-tool` with `{ tool_name: name, params }`.
4. User taps "Cancel" → discard silently.

### Tool Parameters by Name

#### `create_journal_entry`
```json
{ "text": "string", "date": "YYYY-MM-DD" }
```
Inserts into `journal_entries` table with `user_id`, `text`, `date`, `created_at`.

#### `create_task`
```json
{ "title": "string", "due_date": "YYYY-MM-DD (optional)" }
```
Inserts into `garden_tasks` with `type: "custom"`, `status: "pending"`, `source_action: "chupchu"`.

#### `add_map_marker`
```json
{
  "plant_name":    "string",
  "location_hint": "string — Hebrew description like 'ליד הגדר הצפונית'",
  "x":             "number 0-100 (optional)",
  "y":             "number 0-100 (optional)"
}
```
Inserts into `garden_map_markers`.

#### `log_bd_prep`
```json
{ "prep_name": "500 | 501 | 508 | compost", "date": "YYYY-MM-DD" }
```
Inserts into `bd_applications`.

---

## 16. Dashboard Cards (Biodynamic Calendar)

The current mobile screen shows 3 cards at the top fetched from `GET /api/calendar/today` (NOT a Chupchu endpoint — it's the main calendar API).

### Cards Displayed

| Card            | Value                | Icon | Color          |
|-----------------|----------------------|------|----------------|
| `סוג היום`      | Translated day type  | 🌱   | `success` color |
| `מזל הירח`      | Translated moon sign | 🌙   | `accent` color  |
| `ציון נטיעה`    | `{score}/10`         | ⭐   | `warning` color |

### Moon Sign Translations (Hebrew)

```
Aries → טלה, Taurus → שור, Gemini → תאומים,
Cancer → סרטן, Leo → אריה, Virgo → בתולה,
Libra → מאזניים, Scorpio → עקרב, Sagittarius → קשת,
Capricorn → גדי, Aquarius → דלי, Pisces → דגים
```

### Day Type Translations (Hebrew)

```
fruit → פרי, flower → פרח, leaf → עלה,
root → שורש, unfavorable → לא מומלץ
```

### Card Info Modal (on tap)

Each card opens a modal with a description and bullet-point tips:

**ציון נטיעה tips:**
- `8-10: יום מצוין לנטיעה`
- `5-7: יום טוב, אפשר לעבוד`
- `1-4: עדיף להמנע מנטיעה`

**מזל הירח tips:**
- `טלה, אריה, קשת: ימי פרי`
- `שור, בתולה, גדי: ימי שורש`
- `תאומים, מאזניים, דלי: ימי פרח`
- `סרטן, עקרב, דגים: ימי עלה`

**סוג היום tips:**
- `פרי 🍎: קטיף, שתיית מיצים, ייבוש פירות`
- `פרח 🌸: קטיף פרחים, ייבוש עשבי תיבול`
- `עלה 🌿: השקיה, דישון, עבודה עם עלים`
- `שורש 🥕: חפירה, קטיף ירקות שורש`

---

## 17. Guest Mode (Unauthenticated)

The web app supports 3 free guest messages before showing a signup wall. **Flutter does not need to replicate guest mode** since all mobile screens require authentication. The mobile app should redirect unauthenticated users to the login screen immediately.

---

## 18. UI Behavior & Design Details

### Initial Greeting

When the chat history is empty, show the greeting message (not fetched from server — hardcoded locally):

| Language | Text |
|----------|------|
| Hebrew   | `שלום! אני צ'ופצ'ו. מה קורה בגינה שלך היום?` |
| English  | `Shalom! I am Chupchu. What's happening in your garden today?` |

Plus a calendar context line if today's calendar data is available:
- Hebrew: `על פי לוח הביודינמי, היום הוא {dayType}.`
- English: `According to the biodynamic calendar, today is a {dayType}.`

The current mobile screen uses a different initial message (`שלום! מה הגינה שלך צריכה היום?\nצ'יפ ✦`). Flutter should use the canonical greeting above.

### Typing Indicator

While `isLoading = true`, show a typing animation (3 bouncing dots). Label it:
- Hebrew: `צ'ופצ'ו חושב...`
- English: `Chupchu is thinking...`

### Message Rendering

- Assistant messages: **render as Markdown** (bold, italic, lists, etc.)
- User messages: plain text with newline support
- RTL layout: user bubble on LEFT (since Hebrew reads right-to-left, user is on the "near" side), Chupchu on RIGHT — the web component uses `flex-start` for user and `flex-end` for Chupchu in RTL mode. Flutter: set text direction RTL for Hebrew, use appropriate alignment.

### Disclaimer

Always show below the message list:
- Hebrew: `עצות צ'ופצ'ו הן לצורך מידע בלבד. לבעיות חמורות, פנה למומחה גידול.`
- English: `Chupchu's advice is for informational purposes only. For serious issues, consult a professional.`

### Character Expression

The web app shows a character avatar image that changes based on conversation content:
- `default`: `/chupchu_final.png`
- `happy`: `/chupchu_happy.png`
- `surprised`: `/chupchu_surprised.png`
- `thinking`: `/chupchu_thinking.png` (shown during loading)
- `wise`: `/chupchu_wise.png` (if response contains "לוח", "ירח", "moon", "calendar", "biodynamic", "BD prep")

In Flutter, use the local asset `chupchu_web_in_hole.png` (already in `packages/mobile/assets/`) for the hero image. Expressions can be added later.

### Colors (Design System)

| Role            | Hex       |
|-----------------|-----------|
| Background      | `#050d0a` |
| Background mid  | `#091410` |
| Card bg         | `#111f18` |
| Accent (cyan)   | `#00e5c3` |
| Text mid        | `#b0cfbf` |

---

## 19. Current Mobile Screen Gaps vs. Web

The existing `ChupChuScreen.tsx` (React Native) is a **simplified placeholder** — it is missing most features of the web implementation. Here is what needs to be added in Flutter:

| Feature                                    | Web | Mobile RN | Notes                                   |
|--------------------------------------------|-----|-----------|----------------------------------------|
| Load history from server on startup        | ✅  | ❌        | Should call `GET /api/chupchu/history`  |
| Send location with each message            | ✅  | ❌        | Use device GPS, not IP geolocation     |
| Image/camera support                       | ✅  | ❌        | Send `imageBase64` in `/chat` body     |
| `proposedTasks` confirmation card          | ✅  | ❌        | Show after each response               |
| `mobileTool` confirmation UI               | ✅  | ❌        | Show and call `execute-tool` on confirm |
| Memory load on startup                     | ✅  | ❌        | Call `GET /api/chupchu/memory`         |
| Memory summarize on session end            | ✅  | ❌        | Call on app background/terminate       |
| Rate limit UI (429 handling)               | ✅  | ❌        | Show upgrade banner                    |
| Markdown rendering                         | ✅  | ❌        | Use `flutter_markdown`                 |
| Clear history button                       | ✅  | ❌        | `DELETE /api/chupchu/history`          |
| Active garden selection                    | ✅  | ❌        | Read from `localStorage` / prefs       |
| Typing indicator (3 dots animation)        | ✅  | partial   | Uses `ActivityIndicator` currently      |
| RTL-aware message alignment                | ✅  | partial   | Uses `writingDirection: 'rtl'`         |
| Error display inline                       | ✅  | Alert     | Move to inline UI                      |
| Usage counter display                      | ✅  | ❌        | Show `{used}/{limit}` messages          |
| Mobile: history not sent in request body   | N/A | ❌ (bug)  | Remove `history` field from body       |

---

## 20. Flutter Implementation Checklist

### State Management

```dart
class ChupChuState {
  List<ChupChuMessage> messages;
  ChupChuMessage? pendingMessage;
  bool isLoading;
  String? error;
  bool rateLimited;
  String? rateLimitTier;
  int usageThisMonth;
  int? monthlyLimit;
  List<ProposedTask>? proposedTasks;
  MobileToolCall? pendingMobileTool;
  ChupChuMemory? memory;
}
```

### Startup Sequence

1. Load memory: `GET /api/chupchu/memory`
2. Load history: `GET /api/chupchu/history` (skip if messages already in state)
3. Fetch calendar cards: `GET /api/calendar/today`
4. Request location permission (for weather)

### Send Message Sequence

1. Show `pendingMessage` optimistically in UI
2. Set `isLoading = true`, expression = `thinking`
3. Fetch GPS location (cached for session)
4. Build request body: `{ message, gardenId, location, imageBase64? }`
5. `POST /api/chupchu/chat`
6. Handle 429 → set `rateLimited = true`, `rateLimitTier`
7. Handle success → append messages, set `proposedTasks`, set `mobileTool`
8. Set `isLoading = false`

### Session End (App Background / Terminate)

- If `messages.length >= 6`, fire `POST /api/chupchu/memory/summarize` (fire-and-forget via isolate or `sendPort`).

### Key Libraries Needed

| Purpose              | Package                  |
|----------------------|--------------------------|
| Markdown rendering   | `flutter_markdown`       |
| Image compression    | `flutter_image_compress` |
| Camera access        | `image_picker`           |
| GPS location         | `geolocator`             |
| State management     | `riverpod` or `bloc`     |
| HTTP                 | `dio` or `http`          |

### Important Notes for Flutter

- **Never store raw image bytes in messages** — use the placeholder string.
- **Always include `Authorization: Bearer <token>` header** on every request.
- The server is the source of truth for message history — do not build a local-only history.
- If `gardenId` is not explicitly provided, the server will use the user's `active_garden_id` automatically — just omit it or pass `null`.
- The `response` field in `/chat` response is already plain text (possibly with markdown formatting). Render with `flutter_markdown`.
- Task proposal (`proposedTasks`) and mobile tool confirmation (`mobileTool`) can both appear in the same response. Show mobile tool confirmation first, then task proposals.
