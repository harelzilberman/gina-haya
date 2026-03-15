-- Migration: add daily_tip_email preference column
-- Run manually in Supabase SQL Editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS daily_tip_email BOOLEAN NOT NULL DEFAULT true;
