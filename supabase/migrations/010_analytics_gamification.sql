-- Body measurements
CREATE TABLE body_measurements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID REFERENCES profiles(id),
  measured_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  chest_cm        NUMERIC(5,1),
  waist_cm        NUMERIC(5,1),
  hips_cm         NUMERIC(5,1),
  left_arm_cm     NUMERIC(5,1),
  right_arm_cm    NUMERIC(5,1),
  left_thigh_cm   NUMERIC(5,1),
  right_thigh_cm  NUMERIC(5,1),
  left_calf_cm    NUMERIC(5,1),
  right_calf_cm   NUMERIC(5,1),
  shoulders_cm    NUMERIC(5,1),
  neck_cm         NUMERIC(5,1),
  body_fat_pct    NUMERIC(4,1),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Streaks
CREATE TABLE streaks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID REFERENCES profiles(id),
  streak_type       TEXT NOT NULL CHECK (streak_type IN ('meals', 'workouts', 'combined')),
  current_count     INTEGER NOT NULL DEFAULT 0,
  longest_count     INTEGER NOT NULL DEFAULT 0,
  last_active_date  DATE,
  freeze_available  INTEGER DEFAULT 1,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, streak_type)
);

-- Achievements
CREATE TABLE achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID REFERENCES profiles(id),
  achievement_key TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT CHECK (category IN ('workout', 'nutrition', 'streak', 'pr', 'milestone')),
  unlocked_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, achievement_key)
);

-- Profile photos and goal description
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_description TEXT;

-- Indexes
CREATE INDEX idx_body_measurements_profile ON body_measurements(profile_id, measured_at DESC);
CREATE INDEX idx_streaks_profile ON streaks(profile_id);
CREATE INDEX idx_achievements_profile ON achievements(profile_id);

-- RLS
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to body_measurements" ON body_measurements FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to streaks" ON streaks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to achievements" ON achievements FOR ALL TO anon USING (true) WITH CHECK (true);

-- Storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read profile photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'profile-photos');
CREATE POLICY "Anon can upload profile photos" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'profile-photos');
CREATE POLICY "Anon can delete profile photos" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'profile-photos');
