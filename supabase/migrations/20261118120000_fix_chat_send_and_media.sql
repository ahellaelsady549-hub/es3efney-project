-- Ensure community text posts continue working when video support is enabled.
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS video_url text;

-- Private chat media bucket for images, videos, voice notes, and common documents.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  false,
  52428800,
  ARRAY[
    'image/*', 'video/*', 'audio/*', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Chat participants upload during open sessions" ON storage.objects;
CREATE POLICY "Chat participants upload during open sessions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND name LIKE ((storage.foldername(name))[1] || '/' || auth.uid()::text || '-%')
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = c.doctor_id AND d.user_id = auth.uid())
      )
      AND public.can_chat(c.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Chat participants read message files" ON storage.objects;
CREATE POLICY "Chat participants read message files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.file_url = 'storage:' || storage.objects.name
      AND (
        c.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = c.doctor_id AND d.user_id = auth.uid())
      )
  )
);

CREATE OR REPLACE FUNCTION public.enforce_session_message_window()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
  v_doctor_user_id uuid;
BEGIN
  SELECT * INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  SELECT d.user_id INTO v_doctor_user_id
  FROM public.doctors d
  WHERE d.id = v_conversation.doctor_id;

  IF v_conversation.id IS NULL
     OR (v_conversation.user_id <> auth.uid() AND v_doctor_user_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'Conversation access denied';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.chat_bans cb
    WHERE (cb.expires_at IS NULL OR cb.expires_at > now())
      AND (
        cb.conversation_id = v_conversation.id
        OR cb.target_user_id IN (v_conversation.user_id, v_doctor_user_id)
      )
  ) THEN
    RAISE EXCEPTION 'Chat is blocked';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_bookings b
    WHERE b.doctor_id = v_conversation.doctor_id
      AND b.user_id = v_conversation.user_id
      AND b.status = 'confirmed'
      AND now() >= b.starts_at
      AND now() <= b.ends_at + interval '1 hour'
  ) THEN
    RAISE EXCEPTION 'Chat is outside the booked session window';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_session_message_window ON public.messages;
CREATE TRIGGER enforce_session_message_window
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_session_message_window();

CREATE OR REPLACE FUNCTION public.can_chat(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.doctor_bookings b
        ON b.doctor_id = c.doctor_id AND b.user_id = c.user_id
      WHERE c.id = _conversation_id
        AND (c.user_id = _user_id OR EXISTS (
          SELECT 1 FROM public.doctors d WHERE d.id = c.doctor_id AND d.user_id = _user_id
        ))
        AND b.status = 'confirmed'
        AND now() >= b.starts_at
        AND now() <= b.ends_at + interval '1 hour'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.chat_bans cb
      JOIN public.conversations c ON c.id = _conversation_id
      WHERE (cb.expires_at IS NULL OR cb.expires_at > now())
        AND (
          cb.conversation_id = c.id
          OR cb.target_user_id IN (
            c.user_id,
            (SELECT d.user_id FROM public.doctors d WHERE d.id = c.doctor_id)
          )
        )
    );
$$;
REVOKE ALL ON FUNCTION public.can_chat(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_chat(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
