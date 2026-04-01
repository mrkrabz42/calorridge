-- Food library enhancements: source_id on entries, serving units + per-100g on custom foods

ALTER TABLE food_log_entries ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS serving_units JSONB DEFAULT '[]'::JSONB;
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS calories_per_100g NUMERIC(7,2);
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS protein_per_100g NUMERIC(6,2);
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS carbs_per_100g NUMERIC(6,2);
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS fat_per_100g NUMERIC(6,2);
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS fiber_per_100g NUMERIC(6,2);

-- Deduplicate before adding unique index (keep highest use_count)
DELETE FROM custom_foods a USING custom_foods b
WHERE a.id < b.id
  AND a.profile_id = b.profile_id
  AND LOWER(a.name) = LOWER(b.name)
  AND COALESCE(LOWER(a.brand), '') = COALESCE(LOWER(b.brand), '')
  AND a.use_count <= b.use_count;

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_foods_name_brand
  ON custom_foods(profile_id, LOWER(name), COALESCE(LOWER(brand), ''));
