-- ============================================================
-- Add 'advanced' value to subscription_tier_enum
-- Migration: 023_add_advanced_tier.sql
-- ============================================================
-- Postgres ALTER TYPE ... ADD VALUE requires the new label and an
-- optional position hint (BEFORE / AFTER).  'advanced' sits between
-- 'gardener_pro' and 'professional' in the tier hierarchy.
-- ADD VALUE is transactional in Postgres 12+ (no restart required).
-- ============================================================

ALTER TYPE public.subscription_tier_enum ADD VALUE IF NOT EXISTS 'advanced' AFTER 'gardener_pro';
