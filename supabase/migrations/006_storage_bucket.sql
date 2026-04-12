-- Migration 006: Create listing-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg','image/png','image/webp','image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for listing-images bucket
CREATE POLICY "Public can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "Admins can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Admins can delete listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND auth.role() = 'authenticated'
  );
