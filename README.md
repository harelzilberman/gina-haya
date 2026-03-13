# Gina Haya — גינה חיה ונושמת

A biodynamic gardening platform powered by Moosh Levanah, the AI Moon Grandpa.

## Quick Start

### Prerequisites
- Node.js v20+
- pnpm v9+ (`npm install -g pnpm`)
- Supabase project
- Anthropic API key

### Setup
```bash
pnpm install
cp packages/web/.env.example packages/web/.env.local
cp packages/api/.env.example packages/api/.env
# Fill in your environment variables

pnpm --filter @gina-haya/shared build
pnpm --filter @gina-haya/i18n build
pnpm --filter @gina-haya/api db:migrate
pnpm db:seed
pnpm dev
```

Web: http://localhost:5173  
API: http://localhost:3001/health

## Architecture
- `packages/web`    — React + Vite frontend (Hebrew-first, RTL)
- `packages/api`    — Node.js + Express backend
- `packages/shared` — Shared TypeScript types and utilities
- `packages/i18n`   — Translation files (Hebrew + English)
- `scripts/`        — Database seeding and utilities

## Documents
All architecture, design, and strategy documents are in the project Documents folder.

## Phase Plan
- Phase 1 (8–12 weeks): Web core, auth, calendar, Moosh chat, plant encyclopedia
- Phase 2 (6–10 weeks): 2D garden map, plant diagnosis, freemium gating
- Phase 3 (10–16 weeks): React Native iOS + Android app
