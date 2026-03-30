-- ============================================================
-- STORAGE: meal-photos bucket
-- Run this after creating the bucket in Supabase Dashboard
-- (or via: supabase storage create meal-photos --public)
-- ============================================================

-- Allow anon to upload photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read meal photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'meal-photos');

-- Allow anon to upload
CREATE POLICY "Anon can upload meal photos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'meal-photos');

-- Allow anon to delete their photos
CREATE POLICY "Anon can delete meal photos"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'meal-photos');
