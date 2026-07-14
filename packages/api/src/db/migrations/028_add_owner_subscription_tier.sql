-- ============================================================
-- Add 'owner' value to subscription_tier_enum
-- Migration: 028_add_owner_subscription_tier.sql
-- ============================================================
-- NOTE: This value was already applied directly to the production
-- DB via the Supabase SQL Editor before this file was created.
-- This file exists purely for reproducibility so a fresh DB setup
-- includes 'owner' and schema stays in sync with TIER_LIMITS in code.
--
-- Postgres ALTER TYPE ... ADD VALUE requires the new label and an
-- optional position hint (BEFORE / AFTER).  'owner' sits after
-- 'professional' as the highest (internal-only) tier.
-- ADD VALUE is transactional in Postgres 12+ (no restart required).
-- SAFE TO RE-RUN — IF NOT EXISTS makes this idempotent.
-- ============================================================

ALTER TYPE public.subscription_tier_enum ADD VALUE IF NOT EXISTS 'owner' AFTER 'professional';
