-- ============================================================
-- USER PROFILE (body stats for calorie calculations)
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

-- Seed empty profile
INSERT INTO user_profile DEFAULT VALUES;

CREATE TRIGGER user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to user_profile"
  ON user_profile FOR ALL TO anon USING (true) WITH CHECK (true);
