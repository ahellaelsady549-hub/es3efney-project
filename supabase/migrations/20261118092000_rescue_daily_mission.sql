CREATE TABLE IF NOT EXISTS public.first_aid_daily_mission_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_day date NOT NULL,
  mission_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mission_day, mission_id)
);
ALTER TABLE public.first_aid_daily_mission_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.first_aid_daily_mission_claims TO authenticated;
DROP POLICY IF EXISTS "Users view their own daily mission claims" ON public.first_aid_daily_mission_claims;
CREATE POLICY "Users view their own daily mission claims" ON public.first_aid_daily_mission_claims
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_first_aid_daily_mission(p_answer text)
RETURNS TABLE(points integer, current_streak integer, claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_day date := (now() AT TIME ZONE 'UTC')::date;
  v_mission_day date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_claimed boolean := false;
  v_inserted integer := 0;
  v_points integer;
  v_streak integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;
  INSERT INTO public.first_aid_learning_stats (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  IF p_answer = 'cool-water-20m' THEN
    INSERT INTO public.first_aid_daily_mission_claims (user_id, mission_day, mission_id)
    VALUES (v_user_id, v_mission_day, 'kitchen-burn-cooling') ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    v_claimed := v_inserted > 0;
    IF v_claimed THEN
      UPDATE public.first_aid_learning_stats
      SET points = points + 100,
          current_streak = CASE WHEN last_active = v_day THEN current_streak WHEN last_active = v_day - 1 THEN current_streak + 1 ELSE 1 END,
          last_active = v_day, updated_at = now()
      WHERE user_id = v_user_id;
    END IF;
  END IF;
  SELECT stats.points, stats.current_streak INTO v_points, v_streak FROM public.first_aid_learning_stats stats WHERE stats.user_id = v_user_id;
  RETURN QUERY SELECT v_points, v_streak, v_claimed;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_first_aid_daily_mission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_aid_daily_mission(text) TO authenticated;
