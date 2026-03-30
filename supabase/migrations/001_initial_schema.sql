-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MEALS
-- ============================================================
CREATE TABLE meals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_type   TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  photo_url   TEXT,
  food_name   TEXT NOT NULL,
  food_items  JSONB,
  confidence  NUMERIC(4,3),
  calories    INTEGER NOT NULL,
  protein_g   NUMERIC(6,2) NOT NULL,
  carbs_g     NUMERIC(6,2) NOT NULL,
  fat_g       NUMERIC(6,2) NOT NULL,
  fiber_g     NUMERIC(6,2),
  sugar_g     NUMERIC(6,2),
  sodium_mg   NUMERIC(8,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meals_meal_date ON meals(meal_date DESC);
CREATE INDEX idx_meals_logged_at ON meals(logged_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DAILY GOALS
-- ============================================================
CREATE TABLE daily_goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calories    INTEGER NOT NULL DEFAULT 2000,
  protein_g   NUMERIC(6,2) NOT NULL DEFAULT 150,
  carbs_g     NUMERIC(6,2) NOT NULL DEFAULT 200,
  fat_g       NUMERIC(6,2) NOT NULL DEFAULT 65,
  fiber_g     NUMERIC(6,2) DEFAULT 25
);

-- Seed with defaults
INSERT INTO daily_goals (calories, protein_g, carbs_g, fat_g, fiber_g)
VALUES (2000, 150, 200, 65, 25);

-- ============================================================
-- FOOD CACHE
-- ============================================================
CREATE TABLE food_cache (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_hash      TEXT NOT NULL UNIQUE,
  claude_response JSONB NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_food_cache_hash ON food_cache(image_hash);
CREATE INDEX idx_food_cache_expires ON food_cache(expires_at);

-- ============================================================
-- DAILY NUTRITION VIEW
-- ============================================================
CREATE VIEW daily_nutrition AS
SELECT
  meal_date,
  COUNT(*)                        AS meal_count,
  SUM(calories)                   AS total_calories,
  ROUND(CAST(SUM(protein_g) AS NUMERIC), 1) AS total_protein_g,
  ROUND(CAST(SUM(carbs_g) AS NUMERIC), 1)   AS total_carbs_g,
  ROUND(CAST(SUM(fat_g) AS NUMERIC), 1)     AS total_fat_g,
  ROUND(CAST(SUM(fiber_g) AS NUMERIC), 1)   AS total_fiber_g
FROM meals
GROUP BY meal_date
ORDER BY meal_date DESC;

-- ============================================================
-- ROW LEVEL SECURITY
-- No auth for single-user app — public access via anon key
-- ============================================================
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_cache ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (single-user, no auth)
CREATE POLICY "Allow anon full access to meals"
  ON meals FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon full access to daily_goals"
  ON daily_goals FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon full access to food_cache"
  ON food_cache FOR ALL TO anon USING (true) WITH CHECK (true);
