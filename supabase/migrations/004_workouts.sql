-- ============================================================
-- EXERCISES (reference library)
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

-- Seed with common exercises
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
-- WORKOUTS (logged sessions)
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
-- DAILY CALORIE BALANCE VIEW
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

-- RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to exercises"
  ON exercises FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to workouts"
  ON workouts FOR ALL TO anon USING (true) WITH CHECK (true);
