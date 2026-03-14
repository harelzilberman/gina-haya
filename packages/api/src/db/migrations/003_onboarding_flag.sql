-- ============================================================
-- Gina Haya — Onboarding flag
-- Migration: 003_onboarding_flag.sql
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
