-- A community ban removes the user's authored posts (replies cascade) and hides
-- verified doctors from the public doctor search until the ban is lifted.
CREATE OR REPLACE FUNCTION public.purge_banned_user_community_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.community_posts WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purge_banned_user_community_posts ON public.community_bans;
CREATE TRIGGER purge_banned_user_community_posts
  AFTER INSERT ON public.community_bans
  FOR EACH ROW EXECUTE FUNCTION public.purge_banned_user_community_posts();

CREATE OR REPLACE FUNCTION public.purge_chat_banned_user_community_posts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.target_user_id IS NOT NULL
     AND (NEW.expires_at IS NULL OR NEW.expires_at > now()) THEN
    DELETE FROM public.community_posts WHERE user_id = NEW.target_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purge_chat_banned_user_community_posts ON public.chat_bans;
CREATE TRIGGER purge_chat_banned_user_community_posts
  AFTER INSERT ON public.chat_bans
  FOR EACH ROW EXECUTE FUNCTION public.purge_chat_banned_user_community_posts();

CREATE OR REPLACE FUNCTION public.get_doctors_public()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  specialty text,
  bio text,
  rating numeric,
  rating_count integer,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT d.id, d.user_id, d.specialty, d.bio, d.rating, d.rating_count,
         d.is_verified, d.created_at, d.updated_at
  FROM public.doctors AS d
  WHERE auth.uid() IS NOT NULL
    AND d.is_verified = true
    AND NOT EXISTS (
      SELECT 1 FROM public.community_bans AS b WHERE b.user_id = d.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_bans AS cb
      WHERE cb.target_user_id = d.user_id
        AND (cb.expires_at IS NULL OR cb.expires_at > now())
    );
$$;

REVOKE ALL ON FUNCTION public.get_doctors_public() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_doctors_public() TO authenticated;

NOTIFY pgrst, 'reload schema';
