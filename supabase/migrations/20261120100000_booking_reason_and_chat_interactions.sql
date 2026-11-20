BEGIN;

-- A booking stores the patient's short consultation request for the doctor.
ALTER TABLE public.doctor_bookings
  ADD COLUMN IF NOT EXISTS consultation_reason text;

UPDATE public.doctor_bookings
SET consultation_reason = 'لم يذكر المستخدم سبب الاستشارة'
WHERE consultation_reason IS NULL OR BTRIM(consultation_reason) = '';

ALTER TABLE public.doctor_bookings
  ALTER COLUMN consultation_reason SET NOT NULL;

GRANT UPDATE (bio) ON public.doctors TO authenticated;

CREATE OR REPLACE FUNCTION public.request_doctor_booking(
  _doctor_id uuid,
  _starts_at timestamptz,
  _consultation_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_local_start timestamp;
  v_local_end timestamp;
  v_booking_id uuid;
  v_reason text := BTRIM(COALESCE(_consultation_reason, ''));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  IF _starts_at IS NULL OR _starts_at <= now() THEN RAISE EXCEPTION 'Choose a future time'; END IF;
  IF char_length(v_reason) < 5 OR char_length(v_reason) > 1000 THEN
    RAISE EXCEPTION 'Consultation reason must be between 5 and 1000 characters';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = _doctor_id
      AND d.is_verified = true
      AND d.verification_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Doctor is not accepting bookings';
  END IF;

  -- Serialize requests for this doctor so the earliest request reserves a slot.
  PERFORM pg_advisory_xact_lock(hashtextextended('doctor-booking:' || _doctor_id::text, 0));

  v_local_start := _starts_at AT TIME ZONE 'Africa/Cairo';
  v_local_end := (_starts_at + interval '30 minutes') AT TIME ZONE 'Africa/Cairo';
  IF v_local_start::date <> v_local_end::date
     OR date_part('second', v_local_start) <> 0 THEN
    RAISE EXCEPTION 'Choose a valid 30-minute appointment slot';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_availability a
    WHERE a.doctor_id = _doctor_id
      AND a.weekday = date_part('dow', v_local_start)::int
      AND v_local_start::time >= a.start_time
      AND v_local_end::time <= a.end_time
      AND mod(
        extract(epoch FROM (v_local_start - (v_local_start::date + a.start_time)))::integer,
        1800
      ) = 0
  ) THEN
    RAISE EXCEPTION 'This time is outside the doctor working hours';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.doctor_bookings b
    WHERE b.doctor_id = _doctor_id
      AND b.status::text IN ('pending', 'confirmed')
      AND b.starts_at < _starts_at + interval '30 minutes'
      AND b.ends_at > _starts_at
  ) THEN
    RAISE EXCEPTION 'This appointment slot is already taken';
  END IF;

  INSERT INTO public.doctor_bookings (
    doctor_id, user_id, starts_at, ends_at, status, consultation_reason
  ) VALUES (
    _doctor_id, v_user_id, _starts_at, _starts_at + interval '30 minutes', 'pending', v_reason
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- Preserve clients that still call the original two-argument RPC.
CREATE OR REPLACE FUNCTION public.request_doctor_booking(_doctor_id uuid, _starts_at timestamptz)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.request_doctor_booking(_doctor_id, _starts_at, 'استشارة عامة');
$$;

REVOKE ALL ON FUNCTION public.request_doctor_booking(uuid, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_doctor_booking(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_doctor_booking(uuid, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_doctor_booking(uuid, timestamptz) TO authenticated;

-- Replies stay attached to messages in the same conversation.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_reply_to_message_id_idx
  ON public.messages (reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_message_reply_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reply_to_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.messages replied
    WHERE replied.id = NEW.reply_to_message_id
      AND replied.conversation_id = NEW.conversation_id
  ) THEN
    RAISE EXCEPTION 'Reply target must belong to this conversation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_message_reply_target() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_message_reply_target ON public.messages;
CREATE TRIGGER validate_message_reply_target
BEFORE INSERT OR UPDATE OF reply_to_message_id, conversation_id ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_message_reply_target();

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '😮', '🙏', '👏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_reactions_conversation_idx
  ON public.message_reactions (conversation_id, message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;

DROP POLICY IF EXISTS "Participants read conversation reactions" ON public.message_reactions;
CREATE POLICY "Participants read conversation reactions"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = message_reactions.conversation_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = c.doctor_id AND d.user_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Participants create own reactions during sessions" ON public.message_reactions;
CREATE POLICY "Participants create own reactions during sessions"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.can_chat(conversation_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND m.conversation_id = message_reactions.conversation_id
  )
);

DROP POLICY IF EXISTS "Participants update own reactions during sessions" ON public.message_reactions;
CREATE POLICY "Participants update own reactions during sessions"
ON public.message_reactions FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND public.can_chat(conversation_id, auth.uid()))
WITH CHECK (
  user_id = auth.uid()
  AND public.can_chat(conversation_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND m.conversation_id = message_reactions.conversation_id
  )
);

DROP POLICY IF EXISTS "Participants remove own reactions during sessions" ON public.message_reactions;
CREATE POLICY "Participants remove own reactions during sessions"
ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid() AND public.can_chat(conversation_id, auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'message_reactions'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
