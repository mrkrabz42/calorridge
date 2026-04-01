-- Diary completions for end-of-day ritual and streak tracking

CREATE TABLE diary_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id),
  completion_date DATE NOT NULL,
  total_calories  INTEGER NOT NULL,
  total_protein_g NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_carbs_g   NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_fat_g     NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_fiber_g   NUMERIC(6,2),
  goal_calories   INTEGER,
  goal_protein_g  NUMERIC(6,2),
  goal_carbs_g    NUMERIC(6,2),
  goal_fat_g      NUMERIC(6,2),
  grade           TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, completion_date)
);

CREATE INDEX idx_diary_completions ON diary_completions(profile_id, completion_date DESC);

ALTER TABLE diary_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_diary_completions" ON diary_completions FOR ALL TO anon USING (true) WITH CHECK (true);
