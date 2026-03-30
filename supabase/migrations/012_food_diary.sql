CREATE TABLE custom_foods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID REFERENCES profiles(id),
  name            TEXT NOT NULL,
  brand           TEXT,
  serving_size    TEXT DEFAULT '1 serving',
  serving_grams   NUMERIC(7,1),
  calories        INTEGER NOT NULL,
  protein_g       NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g         NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g           NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g         NUMERIC(6,2),
  use_count       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_custom_foods_profile ON custom_foods(profile_id, use_count DESC);
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to custom_foods" ON custom_foods FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE TABLE food_log_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id         UUID REFERENCES meals(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES profiles(id),
  food_name       TEXT NOT NULL,
  brand           TEXT,
  servings        NUMERIC(5,2) NOT NULL DEFAULT 1,
  serving_size    TEXT DEFAULT '1 serving',
  calories        INTEGER NOT NULL,
  protein_g       NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g         NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g           NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g         NUMERIC(6,2),
  source          TEXT DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_food_log_entries_meal ON food_log_entries(meal_id);
ALTER TABLE food_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to food_log_entries" ON food_log_entries FOR ALL TO anon USING (true) WITH CHECK (true);
