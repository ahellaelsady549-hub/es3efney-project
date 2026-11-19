-- Keep community uploads private and only expose media attached to posts the
-- signed-in caller is allowed to read. Media columns now store object paths,
-- not long-lived bearer URLs.
BEGIN;

UPDATE storage.buckets
SET public = false
WHERE id = 'community-media';

-- Older versions stored year-long signed URLs in community_posts. Keep just
-- the object path so new links are generated with a short expiry at read time.
UPDATE public.community_posts
SET image_url = split_part(
  regexp_replace(image_url, '^.*/storage/v1/object/(sign|authenticated|public)/community-media/', ''),
  '?', 1
)
WHERE image_url ~ '/storage/v1/object/(sign|authenticated|public)/community-media/';

UPDATE public.community_posts
SET video_url = split_part(
  regexp_replace(video_url, '^.*/storage/v1/object/(sign|authenticated|public)/community-media/', ''),
  '?', 1
)
WHERE video_url ~ '/storage/v1/object/(sign|authenticated|public)/community-media/';

UPDATE public.community_posts
SET voice_url = split_part(
  regexp_replace(voice_url, '^.*/storage/v1/object/(sign|authenticated|public)/community-media/', ''),
  '?', 1
)
WHERE voice_url ~ '/storage/v1/object/(sign|authenticated|public)/community-media/';

DROP POLICY IF EXISTS "Anyone view community media" ON storage.objects;
DROP POLICY IF EXISTS "Signed-in users view community media" ON storage.objects;
DROP POLICY IF EXISTS "Community members view permitted post media" ON storage.objects;

CREATE POLICY "Community members view permitted post media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'community-media'
  AND (
    storage.objects.owner_id = (SELECT auth.uid()::text)
    OR EXISTS (
      SELECT 1
      FROM public.community_posts AS p
      WHERE (
        p.image_url = storage.objects.name
        OR p.video_url = storage.objects.name
        OR p.voice_url = storage.objects.name
      )
      AND NOT public.is_user_banned((SELECT auth.uid()))
      AND (
        p.category = 'doctors_and_users'
        OR (p.category = 'users_only' AND NOT public.has_role((SELECT auth.uid()), 'doctor'))
        OR (p.category = 'doctors_only' AND public.has_role((SELECT auth.uid()), 'doctor'))
      )
    )
  )
);

COMMIT;
