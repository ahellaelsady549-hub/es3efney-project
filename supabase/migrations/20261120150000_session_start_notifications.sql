-- A confirmed booking must have a chat route before the session-start notice
-- is sent. Backfill conversations for existing bookings as well.
INSERT INTO public.conversations (user_id, doctor_id)
SELECT DISTINCT booking.user_id, booking.doctor_id
FROM public.doctor_bookings AS booking
WHERE booking.status::text IN ('pending', 'confirmed')
ON CONFLICT (user_id, doctor_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_booking_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status::text IN ('pending', 'confirmed') THEN
    INSERT INTO public.conversations (user_id, doctor_id)
    VALUES (NEW.user_id, NEW.doctor_id)
    ON CONFLICT (user_id, doctor_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_booking_conversation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS ensure_booking_conversation ON public.doctor_bookings;
CREATE TRIGGER ensure_booking_conversation
AFTER INSERT OR UPDATE OF status ON public.doctor_bookings
FOR EACH ROW
EXECUTE FUNCTION public.ensure_booking_conversation();

CREATE TABLE IF NOT EXISTS public.appointment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.doctor_bookings(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type = 'session_started'),
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, recipient_user_id, event_type)
);

CREATE INDEX IF NOT EXISTS appointment_notifications_recipient_created_idx
  ON public.appointment_notifications (recipient_user_id, created_at DESC);

ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.appointment_notifications TO authenticated;
GRANT UPDATE (is_read) ON public.appointment_notifications TO authenticated;
GRANT ALL ON public.appointment_notifications TO service_role;

DROP POLICY IF EXISTS "Users view own appointment notifications" ON public.appointment_notifications;
CREATE POLICY "Users view own appointment notifications"
ON public.appointment_notifications FOR SELECT TO authenticated
USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users mark own appointment notifications read" ON public.appointment_notifications;
CREATE POLICY "Users mark own appointment notifications read"
ON public.appointment_notifications FOR UPDATE TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'appointment_notifications'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_notifications';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
