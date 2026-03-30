-- ================================================================
-- CALORRIDGE: COMPLETE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor (one shot)
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 001: MEALS
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
-- 001: DAILY GOALS
-- ============================================================
CREATE TABLE daily_goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calories    INTEGER NOT NULL DEFAULT 2000,
  protein_g   NUMERIC(6,2) NOT NULL DEFAULT 150,
  carbs_g     NUMERIC(6,2) NOT NULL DEFAULT 200,
  fat_g       NUMERIC(6,2) NOT NULL DEFAULT 65,
  fiber_g     NUMERIC(6,2) DEFAULT 25
);

INSERT INTO daily_goals (calories, protein_g, carbs_g, fat_g, fiber_g)
VALUES (2000, 150, 200, 65, 25);

-- ============================================================
-- 001: FOOD CACHE
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
-- 001: DAILY NUTRITION VIEW
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
-- 001: RLS for core tables
-- ============================================================
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to meals"
  ON meals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to daily_goals"
  ON daily_goals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to food_cache"
  ON food_cache FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 002: STORAGE - meal-photos bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read meal photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'meal-photos');

CREATE POLICY "Anon can upload meal photos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'meal-photos');

CREATE POLICY "Anon can delete meal photos"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'meal-photos');

-- ============================================================
-- 003: USER PROFILE
-- ============================================================
CREATE TABLE user_profile (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weight_kg       NUMERIC(5,1),
  height_cm       NUMERIC(5,1),
  age             INTEGER,
  sex             TEXT CHECK (sex IN ('male', 'female')),
  activity_level  TEXT CHECK (activity_level IN (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  )),
  goal_type       TEXT CHECK (goal_type IN ('cut', 'bulk', 'maintain')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO user_profile DEFAULT VALUES;

CREATE TRIGGER user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to user_profile"
  ON user_profile FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 004: EXERCISES (reference library)
-- ============================================================
CREATE TABLE exercises (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  category            TEXT NOT NULL CHECK (category IN (
    'cardio', 'strength', 'flexibility', 'sports', 'other'
  )),
  cals_per_min_default NUMERIC(6,2),
  met_value           NUMERIC(5,2),
  is_custom           BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO exercises (name, category, met_value, cals_per_min_default) VALUES
  ('Running (6 mph)', 'cardio', 9.8, 10.0),
  ('Walking (3.5 mph)', 'cardio', 3.5, 4.0),
  ('Cycling (moderate)', 'cardio', 6.8, 7.5),
  ('Swimming (laps)', 'cardio', 7.0, 8.0),
  ('Jump Rope', 'cardio', 11.0, 12.0),
  ('HIIT', 'cardio', 8.0, 9.0),
  ('Rowing Machine', 'cardio', 7.0, 7.5),
  ('Elliptical', 'cardio', 5.0, 5.5),
  ('Stairmaster', 'cardio', 9.0, 9.5),
  ('Weight Training (moderate)', 'strength', 3.5, 4.0),
  ('Weight Training (vigorous)', 'strength', 6.0, 6.5),
  ('Bodyweight Exercises', 'strength', 3.8, 4.2),
  ('Deadlifts', 'strength', 6.0, 6.5),
  ('Squats', 'strength', 5.0, 5.5),
  ('Bench Press', 'strength', 3.5, 4.0),
  ('Pull-ups', 'strength', 3.8, 4.2),
  ('Yoga', 'flexibility', 2.5, 3.0),
  ('Stretching', 'flexibility', 2.3, 2.5),
  ('Pilates', 'flexibility', 3.0, 3.5),
  ('Basketball', 'sports', 6.5, 7.0),
  ('Football', 'sports', 8.0, 8.5),
  ('Tennis', 'sports', 7.3, 8.0),
  ('Boxing', 'sports', 7.8, 8.5);

-- ============================================================
-- 004: WORKOUTS
-- ============================================================
CREATE TABLE workouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id     UUID REFERENCES exercises(id),
  exercise_name   TEXT NOT NULL,
  category        TEXT NOT NULL,
  workout_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_mins   INTEGER NOT NULL,
  calories_burned INTEGER NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workouts_date ON workouts(workout_date DESC);

CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 004: DAILY CALORIE BALANCE VIEW
-- ============================================================
CREATE VIEW daily_calorie_balance AS
SELECT
  COALESCE(m.meal_date, w.workout_date) AS day_date,
  COALESCE(m.total_calories, 0) AS calories_consumed,
  COALESCE(w.total_burned, 0) AS calories_burned,
  COALESCE(m.total_calories, 0) - COALESCE(w.total_burned, 0) AS net_calories,
  COALESCE(m.meal_count, 0) AS meal_count,
  COALESCE(w.workout_count, 0) AS workout_count
FROM
  (SELECT meal_date, SUM(calories)::INTEGER AS total_calories, COUNT(*)::INTEGER AS meal_count
   FROM meals GROUP BY meal_date) m
FULL OUTER JOIN
  (SELECT workout_date, SUM(calories_burned)::INTEGER AS total_burned, COUNT(*)::INTEGER AS workout_count
   FROM workouts GROUP BY workout_date) w
ON m.meal_date = w.workout_date;

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to exercises"
  ON exercises FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to workouts"
  ON workouts FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 005: CHALLENGES
-- ============================================================
CREATE TABLE challenges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  goal_type         TEXT NOT NULL CHECK (goal_type IN ('cut', 'bulk', 'maintain', 'custom')),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  duration_days     INTEGER NOT NULL DEFAULT 30,
  target_calories   INTEGER NOT NULL,
  target_protein_g  NUMERIC(6,2) NOT NULL,
  target_carbs_g    NUMERIC(6,2) NOT NULL,
  target_fat_g      NUMERIC(6,2) NOT NULL,
  target_fiber_g    NUMERIC(6,2),
  start_weight_kg   NUMERIC(5,1),
  target_weight_kg  NUMERIC(5,1),
  is_active         BOOLEAN DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 005: CHALLENGE DAYS
-- ============================================================
CREATE TABLE challenge_days (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id      UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  day_number        INTEGER NOT NULL CHECK (day_number >= 1),
  day_date          DATE NOT NULL,
  actual_calories   INTEGER,
  actual_protein_g  NUMERIC(6,2),
  actual_carbs_g    NUMERIC(6,2),
  actual_fat_g      NUMERIC(6,2),
  calories_burned   INTEGER DEFAULT 0,
  weight_kg         NUMERIC(5,1),
  completed         BOOLEAN DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, day_number)
);

CREATE INDEX idx_challenge_days_lookup ON challenge_days(challenge_id, day_date);

CREATE TRIGGER challenge_days_updated_at
  BEFORE UPDATE ON challenge_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to challenges"
  ON challenges FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to challenge_days"
  ON challenge_days FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 006: BARCODE CACHE
-- ============================================================
CREATE TABLE barcode_cache (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode             TEXT NOT NULL UNIQUE,
  product_name        TEXT,
  brand               TEXT,
  nutrition_per_100g  JSONB,
  serving_size        TEXT,
  source              TEXT NOT NULL DEFAULT 'openfoodfacts',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_barcode_cache ON barcode_cache(barcode);

-- ============================================================
-- 006: PANTRY ITEMS
-- ============================================================
CREATE TABLE pantry_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT CHECK (category IN (
    'protein', 'carb', 'fat', 'dairy', 'vegetable',
    'fruit', 'grain', 'spice', 'sauce', 'other'
  )),
  quantity    TEXT,
  is_staple   BOOLEAN DEFAULT false,
  expires_at  DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pantry_items_updated_at
  BEFORE UPDATE ON pantry_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 006: CHAT
-- ============================================================
CREATE TABLE chat_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT NOT NULL,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_convo ON chat_messages(conversation_id, created_at);

CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE barcode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to barcode_cache"
  ON barcode_cache FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to pantry_items"
  ON pantry_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to chat_conversations"
  ON chat_conversations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to chat_messages"
  ON chat_messages FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- DONE! All tables, views, triggers, RLS, and seed data created.
-- ============================================================
