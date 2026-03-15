# Gina Haya — Production Deployment Guide

## Pre-deploy checklist

- [ ] All environment variables set in Vercel dashboard
- [ ] All environment variables set in Railway dashboard
- [ ] Supabase production project created (separate from dev)
- [ ] All migrations run on production DB (`pnpm db:migrate`)
- [ ] Calendar data seeded (`pnpm db:seed-calendar-placeholder`)
- [ ] Plants data seeded (`pnpm db:seed-plants`)
- [ ] Google OAuth configured with production domain (`https://gina-haya.com`)
- [ ] Stripe webhook configured with production URL (`https://api.gina-haya.com/api/billing/webhook`)
- [ ] Resend domain verified (`gina-haya.com`)
- [ ] Custom domain configured in Vercel

---

## Environment variables

### Vercel (web frontend)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Production API base URL, e.g. `https://api.gina-haya.com` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

### Railway (API backend)

| Variable | Description |
|---|---|
| `PORT` | Port to bind (Railway sets this automatically) |
| `NODE_ENV` | `production` |
| `ANTHROPIC_API_KEY` | Anthropic API key for Moosh |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `JWT_SECRET` | Secret for signing JWTs |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_GROWER` | Stripe price ID for Grower plan |
| `STRIPE_PRICE_GARDENER_PRO` | Stripe price ID for Gardener Pro plan |
| `STRIPE_PRICE_PROFESSIONAL` | Stripe price ID for Professional plan |
| `APP_URL` | `https://gina-haya.com` |

---

## Step-by-step deployment

### 1. Supabase — production project

1. Create a new Supabase project at [supabase.com](https://supabase.com) (keep dev and prod separate).
2. Copy the project URL and keys into Railway + Vercel dashboards.
3. Run migrations against the production DB:
   ```bash
   # Set env vars locally pointing at prod DB, then:
   pnpm db:migrate
   ```
4. Seed initial data:
   ```bash
   pnpm db:seed-calendar-placeholder
   pnpm db:seed-plants
   ```
5. In Supabase dashboard → Authentication → Providers → Google: enable and paste your Google OAuth credentials.
6. Add `https://gina-haya.com` and `https://gina-haya.com/**` to the allowed redirect URLs.

### 2. Railway — API backend

1. Create a new Railway project and connect this GitHub repo.
2. Set the root directory to `/` (monorepo root — Railway reads `packages/api/railway.json`).
3. Add all Railway environment variables from the table above in the Railway dashboard.
4. Deploy. Railway will run:
   ```
   pnpm --filter @gina-haya/shared build && pnpm --filter @gina-haya/api build
   ```
   then start with:
   ```
   pnpm --filter @gina-haya/api start
   ```
5. Set a custom domain in Railway → Settings → Domains: `api.gina-haya.com`.
6. Confirm health check passes: `curl https://api.gina-haya.com/health`

### 3. Vercel — web frontend

1. Import this GitHub repo into Vercel.
2. Vercel auto-detects `vercel.json` at the repo root — no framework override needed.
3. Add all Vercel environment variables from the table above.
4. Set `VITE_API_URL` to `https://api.gina-haya.com`.
5. Deploy. Vercel will run:
   ```
   npx pnpm@8.15.0 install
   pnpm --filter @gina-haya/shared build && pnpm --filter @gina-haya/i18n build && pnpm --filter @gina-haya/web build
   ```
6. Add your custom domain in Vercel → Settings → Domains: `gina-haya.com` + `www.gina-haya.com`.
7. Point your DNS: add Vercel's nameservers or the CNAME/A records they provide.

### 4. Stripe — webhooks

1. In the Stripe dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://api.gina-haya.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
2. Copy the signing secret into Railway as `STRIPE_WEBHOOK_SECRET`.

### 5. Resend — transactional email

1. In the Resend dashboard → Domains → Add `gina-haya.com`.
2. Add the DNS records Resend provides (MX + TXT/DKIM).
3. Wait for verification (usually minutes).
4. Copy the API key into Railway as `RESEND_API_KEY`.

### 6. Google OAuth — production credentials

1. In Google Cloud Console → Credentials → OAuth 2.0 Client:
   - Authorised JavaScript origins: `https://gina-haya.com`
   - Authorised redirect URIs: `https://<supabase-project>.supabase.co/auth/v1/callback`
2. Copy the client ID into Vercel as `VITE_GOOGLE_CLIENT_ID`.

---

## Post-deploy smoke tests

Run these manually after every production deploy:

- [ ] `GET https://api.gina-haya.com/health` → `{ "status": "ok", "db": "ok" }`
- [ ] `GET https://gina-haya.com/` → landing page loads, Hebrew RTL
- [ ] `GET https://gina-haya.com/plants` → plants encyclopedia loads
- [ ] Sign up with email → onboarding wizard appears
- [ ] Sign in with Google → redirects to `/calendar`
- [ ] `/calendar` → today's biodynamic score visible
- [ ] `/moosh` → chat sends a message, Moosh responds
- [ ] Upgrade flow → Stripe checkout opens
- [ ] Daily tip email → verify test send in Resend dashboard

---

## Rollback

Vercel: instant rollback via dashboard → Deployments → select a previous build → Redeploy.

Railway: redeploy a previous deployment from the Railway dashboard or push a revert commit to `main`.
