-- Create or repair the public storage bucket used by Platform Catalog videos.
-- Safe to run again if the bucket or policies already exist.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-guides',
  'platform-guides',
  true,
  314572800,
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view platform guide videos" ON storage.objects;
CREATE POLICY "Public can view platform guide videos"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'platform-guides');

DROP POLICY IF EXISTS "Admins upload platform guide videos" ON storage.objects;
CREATE POLICY "Admins upload platform guide videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'platform-guides'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'admin'::public.user_role)
  );

DROP POLICY IF EXISTS "Admins update platform guide videos" ON storage.objects;
CREATE POLICY "Admins update platform guide videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'platform-guides'
    AND public.has_role(auth.uid(), 'admin'::public.user_role)
  )
  WITH CHECK (
    bucket_id = 'platform-guides'
    AND public.has_role(auth.uid(), 'admin'::public.user_role)
  );

DROP POLICY IF EXISTS "Admins delete platform guide videos" ON storage.objects;
CREATE POLICY "Admins delete platform guide videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'platform-guides'
    AND public.has_role(auth.uid(), 'admin'::public.user_role)
  );

NOTIFY pgrst, 'reload schema';
