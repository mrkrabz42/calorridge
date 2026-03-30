CREATE TABLE saved_meals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID REFERENCES profiles(id),
  name        TEXT NOT NULL,
  meal_type   TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  calories    INTEGER NOT NULL,
  protein_g   NUMERIC(6,2) NOT NULL,
  carbs_g     NUMERIC(6,2) NOT NULL,
  fat_g       NUMERIC(6,2) NOT NULL,
  fiber_g     NUMERIC(6,2),
  sugar_g     NUMERIC(6,2),
  sodium_mg   NUMERIC(8,2),
  use_count   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_meals_profile ON saved_meals(profile_id, use_count DESC);

CREATE TRIGGER saved_meals_updated_at
  BEFORE UPDATE ON saved_meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to saved_meals" ON saved_meals FOR ALL TO anon USING (true) WITH CHECK (true);
