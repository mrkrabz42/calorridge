-- Saved meal items: component foods of a saved meal

CREATE TABLE saved_meal_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_meal_id   UUID NOT NULL REFERENCES saved_meals(id) ON DELETE CASCADE,
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
  source_id       UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_meal_items ON saved_meal_items(saved_meal_id);

ALTER TABLE saved_meal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_saved_meal_items" ON saved_meal_items FOR ALL TO anon USING (true) WITH CHECK (true);
