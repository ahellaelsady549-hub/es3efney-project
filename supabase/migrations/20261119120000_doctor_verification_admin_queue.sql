-- Store administrator decisions and expose the doctor review queue only to admins.
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_doctor_requests()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  specialty text,
  bio text,
  cv_url text,
  portfolio_url text,
  verification_status text,
  is_verified boolean,
  ai_cv_review text,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    p.full_name,
    u.email::text,
    d.specialty,
    d.bio,
    d.cv_url,
    d.portfolio_url,
    d.verification_status,
    d.is_verified,
    d.ai_cv_review,
    d.rejection_reason,
    d.reviewed_at,
    d.created_at
  FROM public.doctors AS d
  LEFT JOIN public.profiles AS p ON p.user_id = d.user_id
  LEFT JOIN auth.users AS u ON u.id = d.user_id
  ORDER BY d.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_doctor_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_doctor_requests() TO authenticated;

NOTIFY pgrst, 'reload schema';
