-- Keep every doctor verification submission as an immutable application snapshot.
CREATE TABLE IF NOT EXISTS public.doctor_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_name text,
  applicant_email text,
  national_id text NOT NULL CHECK (national_id ~ '^[0-9]{14}$'),
  governorate text NOT NULL,
  home_address text NOT NULL,
  id_front_path text NOT NULL,
  id_back_path text NOT NULL,
  ai_identity_review text,
  specialty text NOT NULL,
  bio text,
  cv_url text NOT NULL,
  cv_link text,
  portfolio_url text,
  ai_cv_review text,
  workplace_type text,
  workplace_name text,
  workplace_address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctor_verification_requests_user_created_idx
  ON public.doctor_verification_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS doctor_verification_requests_status_created_idx
  ON public.doctor_verification_requests (status, created_at DESC);

ALTER TABLE public.doctor_verification_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.doctor_verification_requests TO authenticated;

DROP POLICY IF EXISTS "Doctors view own verification history" ON public.doctor_verification_requests;
CREATE POLICY "Doctors view own verification history"
ON public.doctor_verification_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view doctor verification history" ON public.doctor_verification_requests;
CREATE POLICY "Admins view doctor verification history"
ON public.doctor_verification_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Doctors submit own verification requests" ON public.doctor_verification_requests;
CREATE POLICY "Doctors submit own verification requests"
ON public.doctor_verification_requests FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid())
  AND status = 'pending'
  AND reviewed_at IS NULL
  AND rejection_reason IS NULL
);

DROP POLICY IF EXISTS "Admins review doctor verification requests" ON public.doctor_verification_requests;
CREATE POLICY "Admins review doctor verification requests"
ON public.doctor_verification_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- Preserve the current pending or answered application as the first history item on upgrade.
INSERT INTO public.doctor_verification_requests (
  doctor_id, user_id, applicant_name, applicant_email, national_id, governorate,
  home_address, id_front_path, id_back_path, ai_identity_review, specialty, bio,
  cv_url, cv_link, portfolio_url, ai_cv_review, workplace_type, workplace_name,
  workplace_address, status, rejection_reason, reviewed_at, created_at
)
SELECT d.id, d.user_id, p.full_name, u.email::text, i.national_id, i.governorate,
       i.home_address, i.id_front_path, i.id_back_path, i.ai_review, d.specialty, d.bio,
       d.cv_url, d.cv_link, d.portfolio_url, d.ai_cv_review, d.workplace_type,
       d.workplace_name, d.workplace_address,
       CASE WHEN d.verification_status IN ('approved', 'rejected') THEN d.verification_status ELSE 'pending' END,
       d.rejection_reason, d.reviewed_at, d.created_at
FROM public.doctors d
JOIN LATERAL (
  SELECT ia.* FROM public.identity_applications ia
  WHERE ia.user_id = d.user_id AND ia.account_type = 'doctor'
    AND ia.national_id ~ '^[0-9]{14}$'
  ORDER BY ia.created_at DESC LIMIT 1
) i ON true
LEFT JOIN public.profiles p ON p.user_id = d.user_id
LEFT JOIN auth.users u ON u.id = d.user_id
WHERE d.cv_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.doctor_verification_requests old WHERE old.doctor_id = d.id);

-- Separate application notifications from chat notifications, while using the same header bell.
CREATE TABLE IF NOT EXISTS public.doctor_application_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.doctor_verification_requests(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('doctor_request_submitted', 'doctor_request_approved', 'doctor_request_rejected')),
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doctor_application_notifications_recipient_created_idx
  ON public.doctor_application_notifications (recipient_user_id, created_at DESC);
ALTER TABLE public.doctor_application_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.doctor_application_notifications TO authenticated;
GRANT UPDATE (is_read) ON public.doctor_application_notifications TO authenticated;

DROP POLICY IF EXISTS "Users view own doctor application notifications" ON public.doctor_application_notifications;
CREATE POLICY "Users view own doctor application notifications"
ON public.doctor_application_notifications FOR SELECT TO authenticated
USING (auth.uid() = recipient_user_id);
DROP POLICY IF EXISTS "Users mark own doctor application notifications read" ON public.doctor_application_notifications;
CREATE POLICY "Users mark own doctor application notifications read"
ON public.doctor_application_notifications FOR UPDATE TO authenticated
USING (auth.uid() = recipient_user_id)
WITH CHECK (auth.uid() = recipient_user_id);

CREATE OR REPLACE FUNCTION public.notify_doctor_verification_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR admin_user IN
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'::public.user_role
    LOOP
      INSERT INTO public.doctor_application_notifications
        (recipient_user_id, request_id, event_type, title, body, href)
      VALUES
        (admin_user.user_id, NEW.id, 'doctor_request_submitted', 'طلب توثيق طبيب جديد',
         COALESCE(NEW.applicant_name, 'طبيب') || ' أرسل طلب توثيق تخصص ' || NEW.specialty,
         '/admin');
    END LOOP;
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.doctor_application_notifications
      (recipient_user_id, request_id, event_type, title, body, href)
    VALUES
      (NEW.user_id, NEW.id,
       CASE WHEN NEW.status = 'approved' THEN 'doctor_request_approved' ELSE 'doctor_request_rejected' END,
       CASE WHEN NEW.status = 'approved' THEN 'تم قبول طلب توثيق الطبيب' ELSE 'تم رفض طلب توثيق الطبيب' END,
       CASE WHEN NEW.status = 'approved' THEN 'تمت مراجعة طلبك وقبوله.'
            ELSE 'تمت مراجعة طلبك. السبب: ' || COALESCE(NEW.rejection_reason, 'راجع لوحة طلب التوثيق للمزيد.') END,
       '/doctor-application');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_doctor_verification_request() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS notify_doctor_verification_request ON public.doctor_verification_requests;
CREATE TRIGGER notify_doctor_verification_request
AFTER INSERT OR UPDATE OF status ON public.doctor_verification_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_doctor_verification_request();

-- Atomic admin decision: preserve the request history and only update the live doctor profile
-- when this is still the doctor's latest submitted application.
CREATE OR REPLACE FUNCTION public.review_doctor_verification_request(
  _request_id uuid,
  _approved boolean,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.doctor_verification_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF NOT _approved AND length(trim(COALESCE(_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'A rejection reason of at least 5 characters is required';
  END IF;

  SELECT * INTO request_row
  FROM public.doctor_verification_requests
  WHERE id = _request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Doctor verification request not found'; END IF;
  IF request_row.status <> 'pending' THEN RAISE EXCEPTION 'This request has already been answered'; END IF;

  UPDATE public.doctor_verification_requests
  SET status = CASE WHEN _approved THEN 'approved' ELSE 'rejected' END,
      rejection_reason = CASE WHEN _approved THEN NULL ELSE trim(_reason) END,
      reviewed_at = now()
  WHERE id = request_row.id;

  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_verification_requests newer
    WHERE newer.user_id = request_row.user_id
      AND (newer.created_at, newer.id) > (request_row.created_at, request_row.id)
  ) THEN
    UPDATE public.doctors
    SET is_verified = _approved,
        verification_status = CASE WHEN _approved THEN 'approved' ELSE 'rejected' END,
        rejection_reason = CASE WHEN _approved THEN NULL ELSE trim(_reason) END,
        reviewed_at = now()
    WHERE id = request_row.doctor_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_doctor_verification_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_doctor_verification_request(uuid, boolean, text) TO authenticated;

-- Trigger writes the aggregate under its own privileges; rating writes no longer fail on doctors RLS.
CREATE OR REPLACE FUNCTION public.update_doctor_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_doctor_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    changed_doctor_id := OLD.doctor_id;
  ELSE
    changed_doctor_id := NEW.doctor_id;
  END IF;

  UPDATE public.doctors d
  SET rating = COALESCE((SELECT AVG(r.rating)::numeric FROM public.doctor_ratings r WHERE r.doctor_id = changed_doctor_id), 0),
      rating_count = (SELECT count(*)::integer FROM public.doctor_ratings r WHERE r.doctor_id = changed_doctor_id)
  WHERE d.id = changed_doctor_id;

  IF TG_OP = 'UPDATE' AND OLD.doctor_id IS DISTINCT FROM NEW.doctor_id THEN
    UPDATE public.doctors d
    SET rating = COALESCE((SELECT AVG(r.rating)::numeric FROM public.doctor_ratings r WHERE r.doctor_id = OLD.doctor_id), 0),
        rating_count = (SELECT count(*)::integer FROM public.doctor_ratings r WHERE r.doctor_id = OLD.doctor_id)
    WHERE d.id = OLD.doctor_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.update_doctor_rating() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_rating_change ON public.doctor_ratings;
CREATE TRIGGER on_rating_change
AFTER INSERT OR UPDATE OR DELETE ON public.doctor_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_doctor_rating();

CREATE OR REPLACE FUNCTION public.submit_doctor_rating(_doctor_id uuid, _rating integer, _review text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in is required to rate a doctor'; END IF;
  IF _rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = _doctor_id AND d.is_verified = true
      AND d.verification_status = 'approved' AND d.user_id <> auth.uid()
  ) THEN RAISE EXCEPTION 'Doctor is not available for rating'; END IF;
  IF (SELECT count(*) FROM public.doctor_ratings r
      WHERE r.user_id = auth.uid() AND r.created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Rating limit reached; try again later';
  END IF;

  INSERT INTO public.doctor_ratings (doctor_id, user_id, rating, review)
  VALUES (_doctor_id, auth.uid(), _rating, NULLIF(trim(COALESCE(_review, '')), ''))
  ON CONFLICT (doctor_id, user_id) DO UPDATE
    SET rating = EXCLUDED.rating, review = EXCLUDED.review, created_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.submit_doctor_rating(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_doctor_rating(uuid, integer, text) TO authenticated;

UPDATE public.doctors d
SET rating = COALESCE((SELECT AVG(r.rating)::numeric FROM public.doctor_ratings r WHERE r.doctor_id = d.id), 0),
    rating_count = (SELECT count(*)::integer FROM public.doctor_ratings r WHERE r.doctor_id = d.id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'doctor_application_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_application_notifications;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
