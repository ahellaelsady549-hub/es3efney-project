-- Reflect a doctor's latest verification request in the status shown on the
-- dashboard. This also resets the status to pending when a rejected request
-- is resubmitted through DoctorApplication.
CREATE OR REPLACE FUNCTION public.sync_doctor_review_to_identity_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  synced_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    synced_status := 'pending';
  ELSE
    synced_status := NEW.status;
  END IF;

  UPDATE public.identity_applications AS application
  SET status = synced_status,
      rejection_reason = CASE WHEN synced_status = 'rejected' THEN NEW.rejection_reason ELSE NULL END,
      reviewed_at = CASE
        WHEN synced_status = 'pending' THEN NULL
        ELSE COALESCE(NEW.reviewed_at, now())
      END
  WHERE application.id = (
    SELECT candidate.id
    FROM public.identity_applications AS candidate
    WHERE candidate.user_id = NEW.user_id
      AND candidate.account_type = 'doctor'
      AND candidate.national_id = NEW.national_id
      AND candidate.id_front_path = NEW.id_front_path
      AND candidate.id_back_path = NEW.id_back_path
    ORDER BY candidate.created_at DESC
    LIMIT 1
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_doctor_review_to_identity_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_doctor_review_to_identity_status ON public.doctor_verification_requests;
CREATE TRIGGER sync_doctor_review_to_identity_status
AFTER INSERT OR UPDATE OF status ON public.doctor_verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_doctor_review_to_identity_status();

-- Publish status changes so an open dashboard updates without requiring reload.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'identity_applications'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.identity_applications';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'doctor_verification_requests'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_verification_requests';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'doctors'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
