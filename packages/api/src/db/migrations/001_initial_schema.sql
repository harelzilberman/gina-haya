-- ============================================================
-- Gina Haya — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE subscription_tier_enum AS ENUM (
  'free', 'grower', 'gardener_pro', 'professional'
);

CREATE TYPE soil_type_enum AS ENUM (
  'clay', 'sandy', 'loam', 'chalky', 'silty', 'peaty', 'mixed'
);

CREATE TYPE day_type_enum AS ENUM (
  'fruit', 'root', 'flower', 'leaf'
);

CREATE TYPE score_colour_enum AS ENUM (
  'green', 'yellow', 'orange', 'red', 'black'
);

CREATE TYPE moon_phase_direction_enum AS ENUM (
  'ascending', 'descending'
);

CREATE TYPE language_enum AS ENUM ('he', 'en');

-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE public.users (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL,
  display_name         TEXT NOT NULL DEFAULT '',
  language_preference  language_enum NOT NULL DEFAULT 'he',
  subscription_tier    subscription_tier_enum NOT NULL DEFAULT 'free',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. GARDENS
-- ============================================================

CREATE TABLE public.gardens (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  location_region  TEXT NOT NULL DEFAULT '',
  soil_type        soil_type_enum,
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gardens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gardens_select_own" ON public.gardens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gardens_insert_own" ON public.gardens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gardens_update_own" ON public.gardens
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gardens_delete_own" ON public.gardens
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. PLANTS (encyclopedia — public read, no RLS)
-- ============================================================

CREATE TABLE public.plants (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  common_name_he          TEXT NOT NULL,
  common_name_en          TEXT NOT NULL,
  latin_name              TEXT,
  category                TEXT,
  description_he          TEXT NOT NULL DEFAULT '',
  description_en          TEXT NOT NULL DEFAULT '',
  day_type_affinity       TEXT[] NOT NULL DEFAULT '{}',
  companion_plants        TEXT[] NOT NULL DEFAULT '{}',
  avoid_plants            TEXT[] NOT NULL DEFAULT '{}',
  sowing_months_israel    INT[] NOT NULL DEFAULT '{}',
  harvest_months_israel   INT[] NOT NULL DEFAULT '{}'
);

-- ============================================================
-- 4. GARDEN_PLANTS
-- ============================================================

CREATE TABLE public.garden_plants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garden_id       UUID NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  plant_id        UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  common_name_he  TEXT NOT NULL DEFAULT '',
  common_name_en  TEXT NOT NULL DEFAULT '',
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 5. BIODYNAMIC_CALENDAR
-- ============================================================

CREATE TABLE public.biodynamic_calendar (
  date                    DATE PRIMARY KEY,
  -- Podolinsky
  ascending_descending    moon_phase_direction_enum NOT NULL,
  ascending_descending_he TEXT NOT NULL,
  phase_transition_time   TIMESTAMPTZ,
  node_active             BOOLEAN NOT NULL DEFAULT FALSE,
  node_crossing_time      TIMESTAMPTZ,
  node_blackout_start     TIMESTAMPTZ,
  node_blackout_end       TIMESTAMPTZ,
  perigee_active          BOOLEAN NOT NULL DEFAULT FALSE,
  prep_500_recommended    BOOLEAN NOT NULL DEFAULT FALSE,
  prep_501_recommended    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Thun
  moon_sign               TEXT NOT NULL DEFAULT '',
  moon_sign_he            TEXT NOT NULL DEFAULT '',
  day_type                day_type_enum NOT NULL,
  day_type_he             TEXT NOT NULL DEFAULT '',
  day_type_change_time    TIMESTAMPTZ,
  -- Shared
  moon_phase_pct          NUMERIC(5, 2) NOT NULL DEFAULT 0,
  moon_phase_name         TEXT NOT NULL DEFAULT '',
  moon_phase_name_he      TEXT NOT NULL DEFAULT '',
  planting_score          INT NOT NULL DEFAULT 0 CHECK (planting_score BETWEEN 0 AND 10),
  score_colour            score_colour_enum NOT NULL,
  moonrise_time           TIME,
  moonset_time            TIME,
  moosh_daily_summary     TEXT NOT NULL DEFAULT '',
  calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. CALENDAR_CONFIG (single-row settings)
-- ============================================================

CREATE TABLE public.calendar_config (
  id                       INT PRIMARY KEY DEFAULT 1,
  node_blackout_hours      INT NOT NULL DEFAULT 24,
  perigee_score_penalty    INT NOT NULL DEFAULT -2,
  podolinsky_weight        NUMERIC(4, 2) NOT NULL DEFAULT 0.35,
  thun_weight              NUMERIC(4, 2) NOT NULL DEFAULT 0.25,
  moon_phase_weight        NUMERIC(4, 2) NOT NULL DEFAULT 0.20,
  israel_lat               NUMERIC(7, 4) NOT NULL DEFAULT 31.5,
  israel_lon               NUMERIC(7, 4) NOT NULL DEFAULT 35.0,
  israel_alt               INT NOT NULL DEFAULT 200,
  pre_generate_years_ahead INT NOT NULL DEFAULT 3,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.calendar_config DEFAULT VALUES;

-- ============================================================
-- 7. MOOSH_CONVERSATIONS
-- ============================================================

CREATE TABLE public.moosh_conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  garden_id  UUID REFERENCES public.gardens(id) ON DELETE SET NULL,
  messages   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.moosh_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moosh_select_own" ON public.moosh_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "moosh_insert_own" ON public.moosh_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "moosh_update_own" ON public.moosh_conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "moosh_delete_own" ON public.moosh_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_gardens_user_id
  ON public.gardens(user_id);

CREATE INDEX idx_garden_plants_garden_id
  ON public.garden_plants(garden_id);

CREATE INDEX idx_moosh_conversations_user_id
  ON public.moosh_conversations(user_id);

CREATE INDEX idx_moosh_conversations_garden_id
  ON public.moosh_conversations(garden_id);

-- Full-text search indexes on plant names
CREATE INDEX idx_plants_name_he
  ON public.plants USING gin(to_tsvector('simple', common_name_he));
CREATE INDEX idx_plants_name_en
  ON public.plants USING gin(to_tsvector('english', common_name_en));

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER gardens_updated_at
  BEFORE UPDATE ON public.gardens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER moosh_updated_at
  BEFORE UPDATE ON public.moosh_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
