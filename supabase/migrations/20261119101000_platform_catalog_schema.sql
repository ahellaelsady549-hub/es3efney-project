-- Idempotently install the Platform Catalog table and video storage setup.
CREATE TABLE IF NOT EXISTS public.platform_tutorial_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  video_url text,
  storage_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT platform_tutorial_videos_has_media
    CHECK (video_url IS NOT NULL OR storage_path IS NOT NULL),
  CONSTRAINT platform_tutorial_videos_youtube_only
    CHECK (video_url IS NULL OR video_url ~* '^https?://(www\.)?(youtube(-nocookie)?\.com|youtu\.be)/'),
  CONSTRAINT platform_tutorial_videos_storage_owner_folder
    CHECK (storage_path IS NULL OR storage_path LIKE created_by::text || '/%')
);

CREATE INDEX IF NOT EXISTS platform_tutorial_videos_sort_idx
  ON public.platform_tutorial_videos (sort_order, created_at DESC);

ALTER TABLE public.platform_tutorial_videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.platform_tutorial_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_tutorial_videos TO authenticated;

DROP POLICY IF EXISTS "Tutorial videos are public to view" ON public.platform_tutorial_videos;
CREATE POLICY "Tutorial videos are public to view"
  ON public.platform_tutorial_videos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage tutorial videos" ON public.platform_tutorial_videos;
CREATE POLICY "Admins manage tutorial videos"
  ON public.platform_tutorial_videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('platform-guides', 'platform-guides', true, 314572800, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view platform guide videos" ON storage.objects;
CREATE POLICY "Public can view platform guide videos"
  ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'platform-guides');

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
  USING (bucket_id = 'platform-guides' AND public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (bucket_id = 'platform-guides' AND public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins delete platform guide videos" ON storage.objects;
CREATE POLICY "Admins delete platform guide videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'platform-guides' AND public.has_role(auth.uid(), 'admin'::public.user_role));

NOTIFY pgrst, 'reload schema';