-- Prevent authenticated clients from probing another user's role through RPC.
-- All policy checks in this project ask about auth.uid(), so restricting the
-- helper to the current session preserves authorization behavior.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles AS roles
      WHERE roles.user_id = auth.uid()
        AND roles.role = _role
    );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.user_role) TO authenticated;

NOTIFY pgrst, 'reload schema';
