-- Adaptive calorie algorithm tables (MacroFactor-style)

CREATE TABLE daily_weigh_ins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID REFERENCES profiles(id),
  weigh_in_date   DATE NOT NULL,
  weight_kg       NUMERIC(5,1) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, weigh_in_date)
);

CREATE TABLE weekly_adjustments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID REFERENCES profiles(id),
  week_start_date   DATE NOT NULL,
  week_end_date     DATE NOT NULL,
  avg_weight_kg     NUMERIC(5,2),
  weight_trend_kg   NUMERIC(5,2),
  avg_daily_intake  INTEGER,
  estimated_tdee    INTEGER,
  previous_target   INTEGER,
  new_target        INTEGER,
  adjustment_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, week_start_date)
);

CREATE INDEX idx_weigh_ins_date ON daily_weigh_ins(profile_id, weigh_in_date DESC);
CREATE INDEX idx_weekly_adj_date ON weekly_adjustments(profile_id, week_start_date DESC);

ALTER TABLE daily_weigh_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to daily_weigh_ins" ON daily_weigh_ins FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to weekly_adjustments" ON weekly_adjustments FOR ALL TO anon USING (true) WITH CHECK (true);
