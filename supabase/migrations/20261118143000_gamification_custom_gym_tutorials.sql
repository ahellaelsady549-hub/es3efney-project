-- First-aid rewards, saved custom workout plans, and admin-managed tutorials.
-- Safe to re-run: no user rows are deleted or overwritten.

CREATE TABLE IF NOT EXISTS public.first_aid_learning_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  current_streak integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  last_active date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.first_aid_lesson_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id integer NOT NULL CHECK (lesson_id BETWEEN 1 AND 450),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.first_aid_daily_mission_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_day date NOT NULL,
  mission_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mission_day, mission_id)
);

CREATE TABLE IF NOT EXISTS public.first_aid_game_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_day date NOT NULL,
  game_id text NOT NULL CHECK (game_id IN (
    'triage', 'kit', 'danger', 'rhythm', 'patient', 'detective', 'cards',
    'simulator-decision', 'simulator-sequence'
  )),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_day, game_id)
);

ALTER TABLE public.first_aid_learning_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_aid_lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_aid_daily_mission_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_aid_game_claims ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.first_aid_learning_stats, public.first_aid_lesson_completions,
  public.first_aid_daily_mission_claims, public.first_aid_game_claims TO authenticated;

DROP POLICY IF EXISTS "Users can view their own first-aid learning stats" ON public.first_aid_learning_stats;
CREATE POLICY "Users can view their own first-aid learning stats"
  ON public.first_aid_learning_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own first-aid lesson completions" ON public.first_aid_lesson_completions;
CREATE POLICY "Users can view their own first-aid lesson completions"
  ON public.first_aid_lesson_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users view their own daily mission claims" ON public.first_aid_daily_mission_claims;
CREATE POLICY "Users view their own daily mission claims"
  ON public.first_aid_daily_mission_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users view their own game claims" ON public.first_aid_game_claims;
CREATE POLICY "Users view their own game claims"
  ON public.first_aid_game_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_first_aid_game_xp(p_game_id text, p_activity_day date)
RETURNS TABLE(points integer, current_streak integer, last_active date, claimed boolean, xp_awarded integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_streak_day date := (now() AT TIME ZONE 'UTC')::date;
  v_claimed boolean := false;
  v_inserted integer := 0;
  v_points integer;
  v_streak integer;
  v_last_active date;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF p_game_id NOT IN (
    'triage', 'kit', 'danger', 'rhythm', 'patient', 'detective', 'cards',
    'simulator-decision', 'simulator-sequence'
  ) THEN RAISE EXCEPTION 'Invalid first-aid game'; END IF;
  IF p_activity_day IS NULL OR p_activity_day > v_today OR p_activity_day < v_today - 7 THEN
    RAISE EXCEPTION 'Invalid first-aid activity day';
  END IF;

  INSERT INTO public.first_aid_learning_stats (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.first_aid_game_claims (user_id, activity_day, game_id)
  VALUES (v_user_id, p_activity_day, p_game_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_claimed := v_inserted > 0;

  IF v_claimed THEN
    UPDATE public.first_aid_learning_stats AS stats
    SET points = stats.points + 5,
        current_streak = CASE
          WHEN stats.last_active = v_streak_day THEN stats.current_streak
          WHEN stats.last_active = v_streak_day - 1 THEN stats.current_streak + 1
          ELSE 1
        END,
        last_active = v_streak_day,
        updated_at = now()
    WHERE stats.user_id = v_user_id;
  END IF;

  SELECT stats.points, stats.current_streak, stats.last_active
    INTO v_points, v_streak, v_last_active
  FROM public.first_aid_learning_stats AS stats WHERE stats.user_id = v_user_id;
  RETURN QUERY SELECT v_points, v_streak, v_last_active, v_claimed, CASE WHEN v_claimed THEN 5 ELSE 0 END;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_first_aid_game_xp(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_aid_game_xp(text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_first_aid_daily_mission(p_mission_day date)
RETURNS TABLE(points integer, current_streak integer, last_active date, claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_streak_day date := (now() AT TIME ZONE 'UTC')::date;
  v_claimed boolean := false;
  v_inserted integer := 0;
  v_points integer;
  v_streak integer;
  v_last_active date;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  IF p_mission_day IS NULL OR p_mission_day > v_today OR p_mission_day < v_today - 7 THEN
    RAISE EXCEPTION 'Invalid first-aid mission day';
  END IF;

  INSERT INTO public.first_aid_learning_stats (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.first_aid_daily_mission_claims (user_id, mission_day, mission_id)
  VALUES (v_user_id, p_mission_day, 'kitchen-burn-cooling')
  ON CONFLICT (user_id, mission_day, mission_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_claimed := v_inserted > 0;

  IF v_claimed THEN
    UPDATE public.first_aid_learning_stats AS stats
    SET points = stats.points + 100,
        current_streak = CASE
          WHEN stats.last_active = v_streak_day THEN stats.current_streak
          WHEN stats.last_active = v_streak_day - 1 THEN stats.current_streak + 1
          ELSE 1
        END,
        last_active = v_streak_day,
        updated_at = now()
    WHERE stats.user_id = v_user_id;
  END IF;

  SELECT stats.points, stats.current_streak, stats.last_active
    INTO v_points, v_streak, v_last_active
  FROM public.first_aid_learning_stats AS stats WHERE stats.user_id = v_user_id;
  RETURN QUERY SELECT v_points, v_streak, v_last_active, v_claimed;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_first_aid_daily_mission(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_first_aid_daily_mission(date) TO authenticated;

CREATE TABLE IF NOT EXISTS public.gym_user_custom_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gym_user_custom_programs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_user_custom_programs TO authenticated;
GRANT ALL ON public.gym_user_custom_programs TO service_role;
DROP POLICY IF EXISTS "own custom gym program select" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program select" ON public.gym_user_custom_programs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own custom gym program insert" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program insert" ON public.gym_user_custom_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own custom gym program update" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program update" ON public.gym_user_custom_programs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own custom gym program delete" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program delete" ON public.gym_user_custom_programs FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP TRIGGER IF EXISTS gym_user_custom_program_updated ON public.gym_user_custom_programs;
CREATE TRIGGER gym_user_custom_program_updated BEFORE UPDATE ON public.gym_user_custom_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.platform_tutorial_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  video_url text,
  storage_path text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT platform_tutorial_videos_has_media CHECK (video_url IS NOT NULL OR storage_path IS NOT NULL),
  CONSTRAINT platform_tutorial_videos_youtube_only CHECK (
    video_url IS NULL OR video_url ~* '^https?://(www\.)?(youtube(-nocookie)?\.com|youtu\.be)/'
  ),
  CONSTRAINT platform_tutorial_videos_storage_owner_folder CHECK (
    storage_path IS NULL OR storage_path LIKE created_by::text || '/%'
  )
);
CREATE INDEX IF NOT EXISTS platform_tutorial_videos_sort_idx ON public.platform_tutorial_videos (sort_order, created_at DESC);
ALTER TABLE public.platform_tutorial_videos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.platform_tutorial_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_tutorial_videos TO authenticated;
DROP POLICY IF EXISTS "Tutorial videos are public to view" ON public.platform_tutorial_videos;
CREATE POLICY "Tutorial videos are public to view" ON public.platform_tutorial_videos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage tutorial videos" ON public.platform_tutorial_videos;
CREATE POLICY "Admins manage tutorial videos" ON public.platform_tutorial_videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('platform-guides', 'platform-guides', true, 314572800, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Public can view platform guide videos" ON storage.objects;
CREATE POLICY "Public can view platform guide videos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'platform-guides');
DROP POLICY IF EXISTS "Admins upload platform guide videos" ON storage.objects;
CREATE POLICY "Admins upload platform guide videos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'platform-guides' AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'admin'::public.user_role));
DROP POLICY IF EXISTS "Admins update platform guide videos" ON storage.objects;
CREATE POLICY "Admins update platform guide videos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'platform-guides' AND public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (bucket_id = 'platform-guides' AND public.has_role(auth.uid(), 'admin'::public.user_role));
DROP POLICY IF EXISTS "Admins delete platform guide videos" ON storage.objects;
CREATE POLICY "Admins delete platform guide videos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'platform-guides' AND public.has_role(auth.uid(), 'admin'::public.user_role));

NOTIFY pgrst, 'reload schema';
