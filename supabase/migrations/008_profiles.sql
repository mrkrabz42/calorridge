-- ============================================================
-- 008: MULTI-PROFILE SUPPORT
-- Simple profile switcher for 2-3 users (no auth)
-- ============================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  colour          TEXT NOT NULL DEFAULT '#22D3EE',  -- avatar/accent colour
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to profiles"
  ON profiles FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add profile_id to ALL data tables
ALTER TABLE meals ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE daily_goals ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE user_profile ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE workout_sessions ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE challenges ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE challenge_days ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE pantry_items ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE chat_conversations ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE barcode_cache ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE personal_records ADD COLUMN profile_id UUID REFERENCES profiles(id);
ALTER TABLE workout_templates ADD COLUMN profile_id UUID REFERENCES profiles(id);

-- Index profile_id on high-traffic tables
CREATE INDEX idx_meals_profile ON meals(profile_id);
CREATE INDEX idx_workout_sessions_profile ON workout_sessions(profile_id);
CREATE INDEX idx_challenges_profile ON challenges(profile_id);
CREATE INDEX idx_daily_goals_profile ON daily_goals(profile_id);
CREATE INDEX idx_user_profile_profile ON user_profile(profile_id);
CREATE INDEX idx_pantry_items_profile ON pantry_items(profile_id);
CREATE INDEX idx_workout_templates_profile ON workout_templates(profile_id);
CREATE INDEX idx_personal_records_profile ON personal_records(profile_id);
