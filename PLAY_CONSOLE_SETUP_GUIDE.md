# Google Play Billing Setup Guide

Manual steps Chopchu must complete before Play Billing goes live.

## 1. Railway Environment Variables

Add these three variables in the Railway dashboard for the API service:

| Variable | Value |
|---|---|
| `GOOGLE_PLAY_PACKAGE_NAME` | `com.ginahaya.gina_haya` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Full JSON key file contents (one line, or Railway multi-line secret) |

To get the service account JSON:
1. Google Cloud Console > IAM & Admin > Service Accounts
2. Create a service account (or use existing) with "Android Publisher" permissions
3. Keys > Add Key > JSON — download the file
4. Paste the entire file contents as the value of `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

## 2. Supabase Migration

Run this SQL in the Supabase SQL Editor (Project > SQL Editor > New Query):

```sql
-- File: packages/api/src/db/migrations/033_user_subscriptions.sql
CREATE TABLE user_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id),
  platform         text not null,
  purchase_token   text unique,
  product_id       text,
  base_plan_id     text,
  expires_at       timestamptz,
  status           text,
  acknowledged     boolean default false,
  raw_notification jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

CREATE INDEX ON user_subscriptions (user_id);
CREATE INDEX ON user_subscriptions (purchase_token);
```

## 3. Google Play Console — Subscription Products

In Play Console > your app > Monetize > Subscriptions, create three subscription products:

| Product ID | Name | Base plans |
|---|---|---|
| `gardener_pro_sub` | Ganan Baiti | `monthly` (18 ILS), `yearly` (180 ILS) |
| `advanced_sub` | Ganan Mitkadem | `monthly` (36 ILS), `yearly` (360 ILS) |
| `professional_sub` | Ganan Miktsoyi | `monthly` (54 ILS), `yearly` (540 ILS) |

## 4. Google Play Console — Real-Time Developer Notifications (RTDN)

1. Play Console > your app > Monetize > Monetization setup > Real-time developer notifications
2. Topic name: create a Pub/Sub topic in Google Cloud Console (same project as service account)
3. Enable "Send real-time notifications"
4. In Google Cloud Console > Pub/Sub > your topic > Subscriptions > Create subscription:
   - Delivery type: **Push**
   - Endpoint URL: `https://your-api-domain/api/billing/play/rtdn`
   - Authentication: Enable authentication, service account with Pub/Sub Publisher role
   - Message retention: 7 days
   - Retry policy: retry after 10s
5. Send a test notification from Play Console to verify the endpoint returns 200

## 5. Verify the Integration

After completing steps 1-4, test with a real purchase on a test device:
- The Flutter app calls `POST /api/billing/play/verify` with `{ purchaseToken, productId }`
- Expect response: `{ ok: true, tier: "gardener_pro", tier_label_he: "...", expires_at: "..." }`
- Verify `users.subscription_tier` updated in Supabase
- Verify `user_subscriptions` row created
