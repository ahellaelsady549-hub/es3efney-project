-- Retain a tombstone for the other participant's open chat while removing
-- the message content and its reactions from the database.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.delete_own_chat_message(_message_id uuid)
RETURNS TABLE(message_id uuid, conversation_id uuid, storage_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  message_row public.messages%ROWTYPE;
  message_storage_path text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required'; END IF;

  SELECT * INTO message_row
  FROM public.messages AS message
  WHERE message.id = _message_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  IF message_row.sender_id IS DISTINCT FROM auth.uid()
     OR NOT EXISTS (
       SELECT 1
       FROM public.conversations AS conversation
       WHERE conversation.id = message_row.conversation_id
         AND (
           conversation.user_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.doctors AS doctor
             WHERE doctor.id = conversation.doctor_id
               AND doctor.user_id = auth.uid()
           )
         )
     ) THEN
    RAISE EXCEPTION 'You can only delete your own messages';
  END IF;

  IF message_row.deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT message_row.id, message_row.conversation_id, NULL::text;
    RETURN;
  END IF;

  IF message_row.file_url LIKE 'storage:%' THEN
    message_storage_path := substring(message_row.file_url FROM 9);
  END IF;

  UPDATE public.messages AS message
  SET content = NULL,
      file_url = NULL,
      file_type = NULL,
      deleted_at = now()
  WHERE message.id = message_row.id;

  DELETE FROM public.message_reactions AS reaction
  WHERE reaction.message_id = message_row.id;

  RETURN QUERY SELECT message_row.id, message_row.conversation_id, message_storage_path;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_chat_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_chat_message(uuid) TO authenticated;

DROP POLICY IF EXISTS "Chat participants delete their own message media" ON storage.objects;
CREATE POLICY "Chat participants delete their own message media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-files'
  AND name LIKE ((storage.foldername(name))[1] || '/' || auth.uid()::text || '-%')
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS conversation
    WHERE conversation.id::text = (storage.foldername(name))[1]
      AND (
        conversation.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doctors AS doctor
          WHERE doctor.id = conversation.doctor_id
            AND doctor.user_id = auth.uid()
        )
      )
  )
);

-- Add the runner game to the server-validated, once-per-day XP allowlist.
-- Create the claims table here as well so this migration also works when the
-- earlier gamification migration has not yet been applied to the Supabase DB.
CREATE TABLE IF NOT EXISTS public.first_aid_game_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_day date NOT NULL,
  game_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_day, game_id)
);

ALTER TABLE public.first_aid_game_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.first_aid_game_claims TO authenticated;
DROP POLICY IF EXISTS "Users view their own game claims" ON public.first_aid_game_claims;
CREATE POLICY "Users view their own game claims"
  ON public.first_aid_game_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.first_aid_game_claims
  DROP CONSTRAINT IF EXISTS first_aid_game_claims_game_id_check;
ALTER TABLE public.first_aid_game_claims
  ADD CONSTRAINT first_aid_game_claims_game_id_check
  CHECK (game_id IN (
    'runner', 'triage', 'kit', 'danger', 'rhythm', 'patient', 'detective', 'cards',
    'simulator-decision', 'simulator-sequence'
  ));

CREATE OR REPLACE FUNCTION public.claim_first_aid_game_xp(p_game_id text, p_activity_day date)
RETURNS TABLE(points integer, current_streak integer, last_active date, claimed boolean, xp_awarded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    'runner', 'triage', 'kit', 'danger', 'rhythm', 'patient', 'detective', 'cards',
    'simulator-decision', 'simulator-sequence'
  ) THEN RAISE EXCEPTION 'Invalid first-aid game'; END IF;
  IF p_activity_day IS NULL OR p_activity_day > v_today OR p_activity_day < v_today - 7 THEN
    RAISE EXCEPTION 'Invalid first-aid activity day';
  END IF;

  INSERT INTO public.first_aid_learning_stats (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.first_aid_game_claims (user_id, activity_day, game_id)
  VALUES (v_user_id, p_activity_day, p_game_id)
  ON CONFLICT DO NOTHING;
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
  FROM public.first_aid_learning_stats AS stats
  WHERE stats.user_id = v_user_id;

  RETURN QUERY SELECT v_points, v_streak, v_last_active, v_claimed, CASE WHEN v_claimed THEN 5 ELSE 0 END;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_first_aid_game_xp(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_aid_game_xp(text, date) TO authenticated;

NOTIFY pgrst, 'reload schema';
