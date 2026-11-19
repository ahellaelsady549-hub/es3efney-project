-- The old rate-limit policy queried public.messages from its own INSERT
-- policy, causing PostgreSQL to recursively evaluate the messages policies.
-- Move the count into a SECURITY DEFINER helper so that query bypasses RLS.
CREATE OR REPLACE FUNCTION public.message_rate_limit_allows(_sender_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT _sender_id = auth.uid()
    AND (
      SELECT count(*)
      FROM public.messages AS existing_message
      WHERE existing_message.sender_id = _sender_id
        AND existing_message.created_at > statement_timestamp() - interval '1 minute'
    ) < 20;
$$;

REVOKE ALL ON FUNCTION public.message_rate_limit_allows(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.message_rate_limit_allows(uuid) TO authenticated;

-- Recreate the participant policy without querying messages from itself.
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations AS c
    WHERE c.id = messages.conversation_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.doctors AS d
          WHERE d.id = c.doctor_id AND d.user_id = auth.uid()
        )
      )
  )
);

-- Add a restrictive policy so rate limiting applies even if other permissive
-- INSERT policies exist, without selecting from messages inside the policy.
DROP POLICY IF EXISTS "Rate limit messages" ON public.messages;
DROP POLICY IF EXISTS "Rate limit messages safely" ON public.messages;
CREATE POLICY "Rate limit messages safely"
ON public.messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.message_rate_limit_allows(auth.uid())
);

NOTIFY pgrst, 'reload schema';
