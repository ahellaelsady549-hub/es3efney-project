-- Create the push tables when the earlier web-push migration has not been run.
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  subscription jsonb NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  medication_reminders boolean NOT NULL DEFAULT true,
  appointment_reminders boolean NOT NULL DEFAULT true,
  chat_messages boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_push_subscriptions TO authenticated;
GRANT ALL ON public.web_push_subscriptions TO service_role;

DROP POLICY IF EXISTS "users manage their own web push subscriptions" ON public.web_push_subscriptions;
CREATE POLICY "users manage their own web push subscriptions"
ON public.web_push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.web_push_reminder_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.web_push_subscriptions(id) ON DELETE CASCADE,
  reminder_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, reminder_key)
);

ALTER TABLE public.web_push_reminder_deliveries ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.web_push_reminder_deliveries TO service_role;

CREATE TABLE IF NOT EXISTS public.chat_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  preview text NOT NULL DEFAULT 'رسالة جديدة',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_notifications_recipient_created_idx
  ON public.chat_notifications (recipient_user_id, created_at DESC);

ALTER TABLE public.web_push_subscriptions
  ADD COLUMN IF NOT EXISTS chat_messages boolean NOT NULL DEFAULT true;

ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.chat_notifications TO authenticated;

DROP POLICY IF EXISTS "Users view own chat notifications" ON public.chat_notifications;
CREATE POLICY "Users view own chat notifications"
ON public.chat_notifications
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users mark own chat notifications read" ON public.chat_notifications;
CREATE POLICY "Users mark own chat notifications read"
ON public.chat_notifications
FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_chat_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_doctor_user_id uuid;
  v_recipient_user_id uuid;
  v_preview text;
BEGIN
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_conversation.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT d.user_id INTO v_doctor_user_id
  FROM public.doctors AS d
  WHERE d.id = v_conversation.doctor_id;

  IF NEW.sender_id = v_conversation.user_id THEN
    v_recipient_user_id := v_doctor_user_id;
  ELSIF NEW.sender_id = v_doctor_user_id THEN
    v_recipient_user_id := v_conversation.user_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient_user_id IS NULL OR v_recipient_user_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  v_preview := COALESCE(
    NULLIF(LEFT(BTRIM(NEW.content), 160), ''),
    CASE
      WHEN NEW.file_type LIKE 'image/%' THEN 'صورة مرفقة'
      WHEN NEW.file_type LIKE 'video/%' THEN 'فيديو مرفق'
      WHEN NEW.file_type LIKE 'audio/%' THEN 'رسالة صوتية'
      WHEN NEW.file_url IS NOT NULL THEN 'ملف مرفق'
      ELSE 'رسالة جديدة'
    END
  );

  INSERT INTO public.chat_notifications (
    recipient_user_id,
    conversation_id,
    sender_user_id,
    message_id,
    preview
  ) VALUES (
    v_recipient_user_id,
    NEW.conversation_id,
    NEW.sender_id,
    NEW.id,
    v_preview
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_chat_message_recipient() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_chat_message_recipient ON public.messages;
CREATE TRIGGER notify_chat_message_recipient
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message_recipient();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'chat_notifications'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_notifications';
  END IF;
END;
$$;

-- Never return the signed-in doctor's own profile from public doctor search.
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
    AND d.user_id <> auth.uid()
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
