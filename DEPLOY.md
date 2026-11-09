# Gina Haya — Production Deployment Guide

## Pre-deploy checklist

- [ ] All environment variables set in Cloudflare Pages dashboard
- [ ] All environment variables set in Railway dashboard
- [ ] Supabase production project created (separate from dev)
- [ ] All migrations run on production DB (`pnpm db:migrate`)
- [ ] Calendar data seeded (`pnpm db:seed-calendar-placeholder`)
- [ ] Plants data seeded (`pnpm db:seed-plants`)
- [ ] Google OAuth configured with production domain (`https://gina-haya.com`)
- [ ] Stripe webhook configured with production URL (`https://api.gina-haya.com/api/billing/webhook`)
- [ ] Resend domain verified (`gina-haya.com`)
- [ ] Custom domain configured in Cloudflare Pages

---

## Environment variables

### Cloudflare Pages (web frontend)

| Variable | Description |
|---|---|
| `SKIP_DEPENDENCY_INSTALL` | `true` — skip Cloudflare's automatic install; the build command installs with pnpm itself |
| `VITE_API_URL` | Production API base URL, e.g. `https://api.gina-haya.com` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key |
| `VITE_ADMIN_EMAIL` | Admin account email |
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
2. Copy the project URL and keys into Railway + Cloudflare Pages dashboards.
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

### 3. Cloudflare Pages — web frontend

1. In Cloudflare → Workers & Pages → Create → Pages → connect this GitHub repo.
2. Build settings:
   - Framework preset: None
   - Build command:
     ```
     npx pnpm@9.15.0 install --no-frozen-lockfile && npx pnpm@9.15.0 --filter @gina-haya/web build
     ```
   - Build output directory: `packages/web/dist`
   - Root directory: `/` (repo root)
3. Add the Cloudflare Pages environment variables from the table above (`SKIP_DEPENDENCY_INSTALL=true`, `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), `VITE_ADMIN_EMAIL`).
4. Set `VITE_API_URL` to `https://api.gina-haya.com`.
5. Deploy. The project is also reachable at `https://gina-haya.pages.dev` (allowed in the API's default CORS origins).
6. Add custom domains in Pages → Custom domains: `gina-haya.com` + `www.gina-haya.com`.
7. DNS: `gina-haya.com` DNS is hosted on Cloudflare (nameservers were changed at the registrar, JetServer, to Cloudflare's).
8. `gina-haya.com` redirects to `www.gina-haya.com` via a Cloudflare redirect rule (Rules → Redirect Rules).

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
2. Copy the client ID into Cloudflare Pages as `VITE_GOOGLE_CLIENT_ID`.

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

Cloudflare Pages: instant rollback via Workers & Pages → project → Deployments → select a previous deployment → Rollback.

Railway: redeploy a previous deployment from the Railway dashboard or push a revert commit to `main`.
