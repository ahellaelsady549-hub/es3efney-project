-- A signed-in user may only notify the author of a post they actually replied
-- to; this prevents arbitrary notification spam and forged reply alerts.
DROP POLICY IF EXISTS "Auth users can create notifications"
  ON public.community_notifications;

CREATE POLICY "Auth users can create notifications"
ON public.community_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND type = 'reply'
  AND reply_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.community_posts AS reply
    JOIN public.community_posts AS target ON target.id = community_notifications.post_id
    WHERE reply.id = community_notifications.reply_id
      AND reply.parent_id = target.id
      AND reply.user_id = auth.uid()
      AND target.user_id = community_notifications.user_id
      AND target.user_id <> auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
