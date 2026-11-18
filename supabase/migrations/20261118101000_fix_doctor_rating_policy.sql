CREATE OR REPLACE FUNCTION public.can_submit_doctor_rating()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (SELECT count(*) FROM public.doctor_ratings r
         WHERE r.user_id = auth.uid()
           AND r.created_at > now() - interval '1 hour') < 10;
$$;
REVOKE ALL ON FUNCTION public.can_submit_doctor_rating() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_submit_doctor_rating() TO authenticated;

DROP POLICY IF EXISTS "Users can rate doctors" ON public.doctor_ratings;
DROP POLICY IF EXISTS "Rate limit ratings" ON public.doctor_ratings;
CREATE POLICY "Rate limit ratings"
ON public.doctor_ratings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.can_submit_doctor_rating());
