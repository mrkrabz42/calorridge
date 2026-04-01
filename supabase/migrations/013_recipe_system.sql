-- Recipe system: recipes + recipe_ingredients

CREATE TABLE recipes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID REFERENCES profiles(id),
  name                  TEXT NOT NULL,
  servings_count        INTEGER NOT NULL DEFAULT 1 CHECK (servings_count >= 1),
  total_weight_cooked_g NUMERIC(8,1),
  calories              INTEGER NOT NULL,
  protein_g             NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g               NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g                 NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g               NUMERIC(6,2),
  use_count             INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipes_profile ON recipes(profile_id, use_count DESC);

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_recipes" ON recipes FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE TABLE recipe_ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_name   TEXT NOT NULL,
  brand       TEXT,
  amount_g    NUMERIC(8,1) NOT NULL,
  calories    INTEGER NOT NULL,
  protein_g   NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g     NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_g       NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g     NUMERIC(6,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipe_ingredients ON recipe_ingredients(recipe_id);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_recipe_ingredients" ON recipe_ingredients FOR ALL TO anon USING (true) WITH CHECK (true);
