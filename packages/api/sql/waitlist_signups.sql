-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/qlcaweebrouzfwkumffc/sql/new
--
-- Backs the mobile-app "coming soon" waitlist form on the landing page
-- (POST /api/waitlist). Written to via the service role key from the API,
-- so no RLS policies are required — RLS is enabled with no policies,
-- which blocks all client-side (anon/authenticated) access by default.

create table if not exists waitlist_signups (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  source     text default 'landing_page',
  locale     text default 'he',
  created_at timestamptz not null default now()
);

alter table waitlist_signups enable row level security;
