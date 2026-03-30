-- ============================================================
-- CHALLENGES (30-day plans)
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
-- CHALLENGE DAYS (daily check-in data)
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

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to challenges"
  ON challenges FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to challenge_days"
  ON challenge_days FOR ALL TO anon USING (true) WITH CHECK (true);
