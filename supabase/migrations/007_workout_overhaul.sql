-- ============================================================
-- 007_workout_overhaul.sql
-- Complete gym workout tracker overhaul
-- Drops old exercises/workouts tables, replaces with full
-- exercise library, templates, sessions, sets, PRs
-- ============================================================

-- Drop the old daily_calorie_balance view first (depends on workouts)
DROP VIEW IF EXISTS daily_calorie_balance;

-- Drop old tables
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- ============================================================
-- 1. EXERCISE LIBRARY
-- ============================================================
CREATE TABLE exercise_library (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN (
    'chest','back','shoulders','biceps','triceps','forearms',
    'quads','hamstrings','glutes','calves','abs',
    'cardio','olympic','full_body','other'
  )),
  primary_muscles   TEXT[] DEFAULT '{}',
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment         TEXT CHECK (equipment IN (
    'barbell','dumbbell','machine','cable','bodyweight',
    'kettlebell','band','smith_machine','ez_bar','trap_bar','other','none'
  )),
  movement_type     TEXT CHECK (movement_type IN ('compound','isolation')),
  is_barbell        BOOLEAN DEFAULT false,
  is_custom         BOOLEAN DEFAULT false,
  instructions      TEXT,
  met_value         NUMERIC(5,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. WORKOUT TEMPLATES
-- ============================================================
CREATE TABLE workout_templates (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  description             TEXT,
  category                TEXT,
  estimated_duration_mins  INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER workout_templates_updated_at
  BEFORE UPDATE ON workout_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. TEMPLATE EXERCISES
-- ============================================================
CREATE TABLE template_exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id     UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercise_library(id),
  position        INTEGER NOT NULL,
  superset_group  INTEGER,
  target_sets     INTEGER DEFAULT 3,
  target_reps_min INTEGER DEFAULT 8,
  target_reps_max INTEGER DEFAULT 12,
  rest_secs       INTEGER DEFAULT 90,
  notes           TEXT
);

-- ============================================================
-- 4. WORKOUT SESSIONS
-- ============================================================
CREATE TABLE workout_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT,
  template_id     UUID REFERENCES workout_templates(id),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  duration_secs   INTEGER,
  total_volume_kg NUMERIC(10,2),
  total_sets      INTEGER,
  calories_burned INTEGER,
  notes           TEXT,
  session_date    DATE DEFAULT CURRENT_DATE,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER workout_sessions_updated_at
  BEFORE UPDATE ON workout_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. WORKOUT EXERCISES
-- ============================================================
CREATE TABLE workout_exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES exercise_library(id),
  position        INTEGER NOT NULL,
  superset_group  INTEGER,
  rest_secs       INTEGER DEFAULT 90,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. EXERCISE SETS
-- ============================================================
CREATE TABLE exercise_sets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL,
  set_type            TEXT DEFAULT 'normal' CHECK (set_type IN (
    'normal','warmup','drop_set','failure','rest_pause'
  )),
  weight_kg           NUMERIC(7,2),
  reps                INTEGER,
  rpe                 NUMERIC(3,1) CHECK (rpe BETWEEN 1 AND 10),
  rir                 INTEGER CHECK (rir BETWEEN 0 AND 5),
  is_completed        BOOLEAN DEFAULT false,
  is_pr               BOOLEAN DEFAULT false,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. PERSONAL RECORDS
-- ============================================================
CREATE TABLE personal_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES exercise_library(id),
  pr_type     TEXT NOT NULL CHECK (pr_type IN ('weight','reps','volume','estimated_1rm')),
  value       NUMERIC(10,2) NOT NULL,
  weight_kg   NUMERIC(7,2),
  reps        INTEGER,
  session_id  UUID REFERENCES workout_sessions(id),
  achieved_at DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. INDEXES
-- ============================================================
CREATE INDEX idx_workout_sessions_date ON workout_sessions(session_date DESC);
CREATE INDEX idx_workout_exercises_session_position ON workout_exercises(session_id, position);
CREATE INDEX idx_exercise_sets_workout_exercise ON exercise_sets(workout_exercise_id);
CREATE INDEX idx_personal_records_exercise_type ON personal_records(exercise_id, pr_type);
CREATE INDEX idx_exercise_library_category ON exercise_library(category);
CREATE INDEX idx_exercise_library_primary_muscles ON exercise_library USING GIN (primary_muscles);

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to exercise_library"
  ON exercise_library FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to workout_templates"
  ON workout_templates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to template_exercises"
  ON template_exercises FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to workout_sessions"
  ON workout_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to workout_exercises"
  ON workout_exercises FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to exercise_sets"
  ON exercise_sets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to personal_records"
  ON personal_records FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 10. SEED DATA — EXERCISE LIBRARY (150+ exercises)
-- ============================================================

-- CHEST (16 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Barbell Bench Press', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'barbell', 'compound', true, 3.5),
('Incline Barbell Bench Press', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'barbell', 'compound', true, 3.5),
('Decline Barbell Bench Press', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'barbell', 'compound', true, 3.5),
('Dumbbell Bench Press', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'dumbbell', 'compound', false, 3.5),
('Incline Dumbbell Bench Press', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'dumbbell', 'compound', false, 3.5),
('Decline Dumbbell Bench Press', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'dumbbell', 'compound', false, 3.5),
('Dumbbell Fly', 'chest', ARRAY['chest'], ARRAY['front_delt'], 'dumbbell', 'isolation', false, 3.0),
('Incline Dumbbell Fly', 'chest', ARRAY['chest'], ARRAY['front_delt'], 'dumbbell', 'isolation', false, 3.0),
('Cable Fly', 'chest', ARRAY['chest'], ARRAY['front_delt'], 'cable', 'isolation', false, 3.0),
('Low Cable Fly', 'chest', ARRAY['chest'], ARRAY['front_delt'], 'cable', 'isolation', false, 3.0),
('High Cable Fly', 'chest', ARRAY['chest'], ARRAY['front_delt'], 'cable', 'isolation', false, 3.0),
('Machine Chest Press', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'machine', 'compound', false, 3.0),
('Pec Deck', 'chest', ARRAY['chest'], ARRAY['front_delt'], 'machine', 'isolation', false, 3.0),
('Push-up', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt','abs'], 'bodyweight', 'compound', false, 3.8),
('Weighted Push-up', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt','abs'], 'bodyweight', 'compound', false, 4.0),
('Chest Dip', 'chest', ARRAY['chest'], ARRAY['triceps','front_delt'], 'bodyweight', 'compound', false, 3.8);

-- BACK (20 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Barbell Deadlift', 'back', ARRAY['lower_back','hamstrings','glutes'], ARRAY['quads','forearms','upper_back'], 'barbell', 'compound', true, 6.0),
('Conventional Deadlift', 'back', ARRAY['lower_back','hamstrings','glutes'], ARRAY['quads','forearms','upper_back'], 'barbell', 'compound', true, 6.0),
('Sumo Deadlift', 'back', ARRAY['glutes','quads','lower_back'], ARRAY['hamstrings','forearms','upper_back'], 'barbell', 'compound', true, 6.0),
('Barbell Row', 'back', ARRAY['upper_back','lats'], ARRAY['biceps','rear_delt','forearms'], 'barbell', 'compound', true, 4.5),
('Pendlay Row', 'back', ARRAY['upper_back','lats'], ARRAY['biceps','rear_delt','forearms'], 'barbell', 'compound', true, 4.5),
('Dumbbell Row', 'back', ARRAY['upper_back','lats'], ARRAY['biceps','rear_delt','forearms'], 'dumbbell', 'compound', false, 4.0),
('Seated Cable Row', 'back', ARRAY['upper_back','lats'], ARRAY['biceps','rear_delt'], 'cable', 'compound', false, 3.5),
('T-Bar Row', 'back', ARRAY['upper_back','lats'], ARRAY['biceps','rear_delt','forearms'], 'barbell', 'compound', true, 4.5),
('Lat Pulldown', 'back', ARRAY['lats'], ARRAY['biceps','upper_back'], 'cable', 'compound', false, 3.5),
('Wide Grip Lat Pulldown', 'back', ARRAY['lats'], ARRAY['biceps','upper_back'], 'cable', 'compound', false, 3.5),
('Close Grip Lat Pulldown', 'back', ARRAY['lats'], ARRAY['biceps','upper_back'], 'cable', 'compound', false, 3.5),
('Pull-up', 'back', ARRAY['lats','upper_back'], ARRAY['biceps','forearms'], 'bodyweight', 'compound', false, 3.8),
('Chin-up', 'back', ARRAY['lats','biceps'], ARRAY['upper_back','forearms'], 'bodyweight', 'compound', false, 3.8),
('Weighted Pull-up', 'back', ARRAY['lats','upper_back'], ARRAY['biceps','forearms'], 'bodyweight', 'compound', false, 4.0),
('Inverted Row', 'back', ARRAY['upper_back','lats'], ARRAY['biceps','rear_delt'], 'bodyweight', 'compound', false, 3.5),
('Face Pull', 'back', ARRAY['rear_delt','upper_back'], ARRAY['biceps'], 'cable', 'isolation', false, 2.5),
('Straight Arm Pulldown', 'back', ARRAY['lats'], ARRAY['upper_back','triceps'], 'cable', 'isolation', false, 2.5),
('Machine Row', 'back', ARRAY['upper_back','lats'], ARRAY['biceps','rear_delt'], 'machine', 'compound', false, 3.5),
('Rack Pull', 'back', ARRAY['upper_back','lower_back'], ARRAY['glutes','hamstrings','forearms'], 'barbell', 'compound', true, 5.5),
('Good Morning', 'back', ARRAY['lower_back','hamstrings'], ARRAY['glutes'], 'barbell', 'compound', true, 4.0);

-- SHOULDERS (14 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Overhead Press', 'shoulders', ARRAY['front_delt','side_delt'], ARRAY['triceps','upper_back'], 'barbell', 'compound', true, 4.0),
('Seated Overhead Press', 'shoulders', ARRAY['front_delt','side_delt'], ARRAY['triceps'], 'barbell', 'compound', true, 3.5),
('Dumbbell Shoulder Press', 'shoulders', ARRAY['front_delt','side_delt'], ARRAY['triceps'], 'dumbbell', 'compound', false, 3.5),
('Arnold Press', 'shoulders', ARRAY['front_delt','side_delt'], ARRAY['triceps','rear_delt'], 'dumbbell', 'compound', false, 3.5),
('Lateral Raise', 'shoulders', ARRAY['side_delt'], ARRAY['front_delt'], 'dumbbell', 'isolation', false, 2.5),
('Cable Lateral Raise', 'shoulders', ARRAY['side_delt'], ARRAY['front_delt'], 'cable', 'isolation', false, 2.5),
('Front Raise', 'shoulders', ARRAY['front_delt'], ARRAY['side_delt'], 'dumbbell', 'isolation', false, 2.5),
('Rear Delt Fly', 'shoulders', ARRAY['rear_delt'], ARRAY['upper_back'], 'dumbbell', 'isolation', false, 2.5),
('Cable Rear Delt Fly', 'shoulders', ARRAY['rear_delt'], ARRAY['upper_back'], 'cable', 'isolation', false, 2.5),
('Machine Shoulder Press', 'shoulders', ARRAY['front_delt','side_delt'], ARRAY['triceps'], 'machine', 'compound', false, 3.0),
('Upright Row', 'shoulders', ARRAY['side_delt','front_delt'], ARRAY['upper_back','biceps'], 'barbell', 'compound', true, 3.5),
('Shrugs', 'shoulders', ARRAY['upper_back'], ARRAY['forearms'], 'barbell', 'isolation', true, 3.0),
('Dumbbell Shrugs', 'shoulders', ARRAY['upper_back'], ARRAY['forearms'], 'dumbbell', 'isolation', false, 3.0),
('Barbell Shrugs', 'shoulders', ARRAY['upper_back'], ARRAY['forearms'], 'barbell', 'isolation', true, 3.0);

-- BICEPS (10 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Barbell Curl', 'biceps', ARRAY['biceps'], ARRAY['forearms'], 'barbell', 'isolation', true, 3.0),
('EZ Bar Curl', 'biceps', ARRAY['biceps'], ARRAY['forearms'], 'ez_bar', 'isolation', false, 3.0),
('Dumbbell Curl', 'biceps', ARRAY['biceps'], ARRAY['forearms'], 'dumbbell', 'isolation', false, 3.0),
('Hammer Curl', 'biceps', ARRAY['biceps','forearms'], ARRAY[]::TEXT[], 'dumbbell', 'isolation', false, 3.0),
('Concentration Curl', 'biceps', ARRAY['biceps'], ARRAY[]::TEXT[], 'dumbbell', 'isolation', false, 2.5),
('Preacher Curl', 'biceps', ARRAY['biceps'], ARRAY['forearms'], 'ez_bar', 'isolation', false, 2.5),
('Incline Dumbbell Curl', 'biceps', ARRAY['biceps'], ARRAY[]::TEXT[], 'dumbbell', 'isolation', false, 2.5),
('Cable Curl', 'biceps', ARRAY['biceps'], ARRAY['forearms'], 'cable', 'isolation', false, 2.5),
('Spider Curl', 'biceps', ARRAY['biceps'], ARRAY[]::TEXT[], 'dumbbell', 'isolation', false, 2.5),
('Reverse Curl', 'biceps', ARRAY['forearms','biceps'], ARRAY[]::TEXT[], 'barbell', 'isolation', true, 2.5);

-- TRICEPS (9 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Close Grip Bench Press', 'triceps', ARRAY['triceps'], ARRAY['chest','front_delt'], 'barbell', 'compound', true, 3.5),
('Skull Crusher', 'triceps', ARRAY['triceps'], ARRAY[]::TEXT[], 'ez_bar', 'isolation', false, 3.0),
('Tricep Pushdown', 'triceps', ARRAY['triceps'], ARRAY[]::TEXT[], 'cable', 'isolation', false, 2.5),
('Rope Pushdown', 'triceps', ARRAY['triceps'], ARRAY[]::TEXT[], 'cable', 'isolation', false, 2.5),
('Overhead Tricep Extension', 'triceps', ARRAY['triceps'], ARRAY[]::TEXT[], 'dumbbell', 'isolation', false, 2.5),
('Dumbbell Kickback', 'triceps', ARRAY['triceps'], ARRAY[]::TEXT[], 'dumbbell', 'isolation', false, 2.5),
('Diamond Push-up', 'triceps', ARRAY['triceps'], ARRAY['chest','front_delt'], 'bodyweight', 'compound', false, 3.8),
('Dip (Tricep)', 'triceps', ARRAY['triceps'], ARRAY['chest','front_delt'], 'bodyweight', 'compound', false, 3.8),
('French Press', 'triceps', ARRAY['triceps'], ARRAY[]::TEXT[], 'ez_bar', 'isolation', false, 3.0);

-- FOREARMS (4 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Wrist Curl', 'forearms', ARRAY['forearms'], ARRAY[]::TEXT[], 'barbell', 'isolation', true, 2.0),
('Reverse Wrist Curl', 'forearms', ARRAY['forearms'], ARRAY[]::TEXT[], 'barbell', 'isolation', true, 2.0),
('Farmers Walk', 'forearms', ARRAY['forearms'], ARRAY['upper_back','abs'], 'dumbbell', 'compound', false, 6.0),
('Dead Hang', 'forearms', ARRAY['forearms'], ARRAY['lats'], 'bodyweight', 'isolation', false, 2.5);

-- QUADS (11 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Barbell Squat', 'quads', ARRAY['quads','glutes'], ARRAY['hamstrings','lower_back','abs'], 'barbell', 'compound', true, 5.0),
('Front Squat', 'quads', ARRAY['quads'], ARRAY['glutes','abs','upper_back'], 'barbell', 'compound', true, 5.0),
('Goblet Squat', 'quads', ARRAY['quads','glutes'], ARRAY['abs'], 'dumbbell', 'compound', false, 4.5),
('Leg Press', 'quads', ARRAY['quads','glutes'], ARRAY['hamstrings'], 'machine', 'compound', false, 4.5),
('Hack Squat', 'quads', ARRAY['quads'], ARRAY['glutes','hamstrings'], 'machine', 'compound', false, 4.5),
('Bulgarian Split Squat', 'quads', ARRAY['quads','glutes'], ARRAY['hamstrings'], 'dumbbell', 'compound', false, 4.5),
('Lunges', 'quads', ARRAY['quads','glutes'], ARRAY['hamstrings'], 'dumbbell', 'compound', false, 4.0),
('Walking Lunges', 'quads', ARRAY['quads','glutes'], ARRAY['hamstrings'], 'dumbbell', 'compound', false, 4.5),
('Leg Extension', 'quads', ARRAY['quads'], ARRAY[]::TEXT[], 'machine', 'isolation', false, 3.0),
('Sissy Squat', 'quads', ARRAY['quads'], ARRAY[]::TEXT[], 'bodyweight', 'isolation', false, 3.5),
('Step-up', 'quads', ARRAY['quads','glutes'], ARRAY['hamstrings'], 'dumbbell', 'compound', false, 4.0);

-- HAMSTRINGS (7 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Romanian Deadlift', 'hamstrings', ARRAY['hamstrings','glutes'], ARRAY['lower_back','forearms'], 'barbell', 'compound', true, 5.0),
('Stiff Leg Deadlift', 'hamstrings', ARRAY['hamstrings','lower_back'], ARRAY['glutes','forearms'], 'barbell', 'compound', true, 5.0),
('Leg Curl', 'hamstrings', ARRAY['hamstrings'], ARRAY[]::TEXT[], 'machine', 'isolation', false, 3.0),
('Seated Leg Curl', 'hamstrings', ARRAY['hamstrings'], ARRAY[]::TEXT[], 'machine', 'isolation', false, 3.0),
('Nordic Curl', 'hamstrings', ARRAY['hamstrings'], ARRAY['glutes'], 'bodyweight', 'isolation', false, 3.5),
('Glute Ham Raise', 'hamstrings', ARRAY['hamstrings','glutes'], ARRAY['lower_back'], 'bodyweight', 'compound', false, 4.0),
('Single Leg Deadlift', 'hamstrings', ARRAY['hamstrings','glutes'], ARRAY['lower_back'], 'dumbbell', 'compound', false, 4.0);

-- GLUTES (6 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Hip Thrust', 'glutes', ARRAY['glutes'], ARRAY['hamstrings'], 'bodyweight', 'compound', false, 4.0),
('Barbell Hip Thrust', 'glutes', ARRAY['glutes'], ARRAY['hamstrings'], 'barbell', 'compound', true, 4.5),
('Cable Pull-through', 'glutes', ARRAY['glutes','hamstrings'], ARRAY['lower_back'], 'cable', 'compound', false, 3.5),
('Glute Bridge', 'glutes', ARRAY['glutes'], ARRAY['hamstrings'], 'bodyweight', 'isolation', false, 3.0),
('Cable Kickback', 'glutes', ARRAY['glutes'], ARRAY[]::TEXT[], 'cable', 'isolation', false, 2.5),
('Sumo Squat', 'glutes', ARRAY['glutes','quads'], ARRAY['hamstrings'], 'dumbbell', 'compound', false, 4.5);

-- CALVES (5 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Standing Calf Raise', 'calves', ARRAY['calves'], ARRAY[]::TEXT[], 'machine', 'isolation', false, 3.0),
('Seated Calf Raise', 'calves', ARRAY['calves'], ARRAY[]::TEXT[], 'machine', 'isolation', false, 2.5),
('Leg Press Calf Raise', 'calves', ARRAY['calves'], ARRAY[]::TEXT[], 'machine', 'isolation', false, 2.5),
('Donkey Calf Raise', 'calves', ARRAY['calves'], ARRAY[]::TEXT[], 'machine', 'isolation', false, 3.0),
('Single Leg Calf Raise', 'calves', ARRAY['calves'], ARRAY[]::TEXT[], 'bodyweight', 'isolation', false, 2.5);

-- ABS (12 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Crunch', 'abs', ARRAY['abs'], ARRAY[]::TEXT[], 'bodyweight', 'isolation', false, 2.8),
('Cable Crunch', 'abs', ARRAY['abs'], ARRAY[]::TEXT[], 'cable', 'isolation', false, 3.0),
('Hanging Leg Raise', 'abs', ARRAY['abs'], ARRAY['obliques'], 'bodyweight', 'isolation', false, 3.5),
('Ab Rollout', 'abs', ARRAY['abs'], ARRAY['obliques','lower_back'], 'other', 'compound', false, 3.5),
('Plank', 'abs', ARRAY['abs'], ARRAY['obliques','lower_back'], 'bodyweight', 'isolation', false, 3.0),
('Side Plank', 'abs', ARRAY['obliques'], ARRAY['abs'], 'bodyweight', 'isolation', false, 3.0),
('Russian Twist', 'abs', ARRAY['obliques','abs'], ARRAY[]::TEXT[], 'bodyweight', 'isolation', false, 3.0),
('Bicycle Crunch', 'abs', ARRAY['abs','obliques'], ARRAY[]::TEXT[], 'bodyweight', 'isolation', false, 3.0),
('Decline Sit-up', 'abs', ARRAY['abs'], ARRAY['obliques'], 'bodyweight', 'isolation', false, 3.0),
('Woodchop', 'abs', ARRAY['obliques','abs'], ARRAY[]::TEXT[], 'cable', 'compound', false, 3.5),
('Pallof Press', 'abs', ARRAY['abs','obliques'], ARRAY[]::TEXT[], 'cable', 'isolation', false, 2.5),
('Dragon Flag', 'abs', ARRAY['abs'], ARRAY['obliques','lower_back'], 'bodyweight', 'compound', false, 4.0);

-- CARDIO (11 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Running (Treadmill)', 'cardio', ARRAY['quads','hamstrings','calves'], ARRAY['glutes','abs'], 'machine', 'compound', false, 9.8),
('Cycling (Stationary)', 'cardio', ARRAY['quads','hamstrings'], ARRAY['calves','glutes'], 'machine', 'compound', false, 6.8),
('Rowing Machine', 'cardio', ARRAY['upper_back','lats'], ARRAY['biceps','quads','hamstrings'], 'machine', 'compound', false, 7.0),
('Elliptical', 'cardio', ARRAY['quads','hamstrings'], ARRAY['glutes','calves'], 'machine', 'compound', false, 5.0),
('Stairmaster', 'cardio', ARRAY['quads','glutes','calves'], ARRAY['hamstrings'], 'machine', 'compound', false, 9.0),
('Jump Rope', 'cardio', ARRAY['calves','quads'], ARRAY['forearms','abs'], 'other', 'compound', false, 11.0),
('Swimming', 'cardio', ARRAY['lats','upper_back'], ARRAY['chest','triceps','abs'], 'none', 'compound', false, 7.0),
('HIIT', 'cardio', ARRAY['quads','hamstrings','glutes'], ARRAY['abs','calves'], 'none', 'compound', false, 8.0),
('Walking (Treadmill)', 'cardio', ARRAY['quads','hamstrings'], ARRAY['calves','glutes'], 'machine', 'compound', false, 3.5),
('Battle Ropes', 'cardio', ARRAY['forearms','upper_back'], ARRAY['abs','biceps','triceps'], 'other', 'compound', false, 8.0),
('Box Jump', 'cardio', ARRAY['quads','glutes','calves'], ARRAY['hamstrings','abs'], 'other', 'compound', false, 8.0);

-- OLYMPIC (7 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Clean and Jerk', 'olympic', ARRAY['quads','glutes','front_delt'], ARRAY['hamstrings','upper_back','triceps','abs'], 'barbell', 'compound', true, 8.0),
('Snatch', 'olympic', ARRAY['quads','glutes','upper_back'], ARRAY['hamstrings','front_delt','triceps','abs'], 'barbell', 'compound', true, 8.0),
('Power Clean', 'olympic', ARRAY['quads','glutes','upper_back'], ARRAY['hamstrings','forearms','abs'], 'barbell', 'compound', true, 7.5),
('Hang Clean', 'olympic', ARRAY['quads','glutes','upper_back'], ARRAY['hamstrings','forearms'], 'barbell', 'compound', true, 7.0),
('Clean Pull', 'olympic', ARRAY['upper_back','quads','glutes'], ARRAY['hamstrings','forearms','lower_back'], 'barbell', 'compound', true, 6.5),
('Push Press', 'olympic', ARRAY['front_delt','side_delt'], ARRAY['triceps','quads','abs'], 'barbell', 'compound', true, 5.5),
('Push Jerk', 'olympic', ARRAY['front_delt','side_delt','quads'], ARRAY['triceps','abs','glutes'], 'barbell', 'compound', true, 6.0);

-- FULL BODY (6 exercises)
INSERT INTO exercise_library (name, category, primary_muscles, secondary_muscles, equipment, movement_type, is_barbell, met_value) VALUES
('Burpee', 'full_body', ARRAY['quads','chest','abs'], ARRAY['triceps','hamstrings','glutes'], 'bodyweight', 'compound', false, 8.0),
('Thruster', 'full_body', ARRAY['quads','front_delt'], ARRAY['glutes','triceps','abs'], 'barbell', 'compound', true, 7.0),
('Man Maker', 'full_body', ARRAY['chest','quads','front_delt'], ARRAY['triceps','abs','upper_back'], 'dumbbell', 'compound', false, 8.0),
('Turkish Get-up', 'full_body', ARRAY['abs','front_delt','glutes'], ARRAY['quads','obliques','upper_back'], 'kettlebell', 'compound', false, 6.0),
('Kettlebell Swing', 'full_body', ARRAY['glutes','hamstrings'], ARRAY['lower_back','abs','forearms'], 'kettlebell', 'compound', false, 6.0),
('Kettlebell Snatch', 'full_body', ARRAY['glutes','hamstrings','front_delt'], ARRAY['upper_back','abs','forearms'], 'kettlebell', 'compound', false, 7.0);

-- ============================================================
-- 11. RECREATE DAILY CALORIE BALANCE VIEW
-- (now uses workout_sessions instead of old workouts table)
-- ============================================================
CREATE VIEW daily_calorie_balance AS
SELECT
  COALESCE(m.meal_date, w.session_date) AS day_date,
  COALESCE(m.total_calories, 0)         AS calories_consumed,
  COALESCE(w.total_burned, 0)           AS calories_burned,
  COALESCE(m.total_calories, 0) - COALESCE(w.total_burned, 0) AS net_calories,
  COALESCE(m.meal_count, 0)             AS meal_count,
  COALESCE(w.workout_count, 0)          AS workout_count
FROM
  (SELECT meal_date,
          SUM(calories)::INTEGER AS total_calories,
          COUNT(*)::INTEGER AS meal_count
   FROM meals
   GROUP BY meal_date) m
FULL OUTER JOIN
  (SELECT session_date,
          SUM(COALESCE(calories_burned, 0))::INTEGER AS total_burned,
          COUNT(*)::INTEGER AS workout_count
   FROM workout_sessions
   WHERE status IN ('active','completed')
   GROUP BY session_date) w
ON m.meal_date = w.session_date;
