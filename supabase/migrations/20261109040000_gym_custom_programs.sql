-- Saved custom workout plans. Safe to run repeatedly and preserves existing plans.
CREATE TABLE IF NOT EXISTS public.gym_user_custom_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_user_custom_programs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_user_custom_programs TO authenticated;
GRANT ALL ON public.gym_user_custom_programs TO service_role;

DROP POLICY IF EXISTS "own custom gym program select" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program select"
  ON public.gym_user_custom_programs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own custom gym program insert" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program insert"
  ON public.gym_user_custom_programs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own custom gym program update" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program update"
  ON public.gym_user_custom_programs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own custom gym program delete" ON public.gym_user_custom_programs;
CREATE POLICY "own custom gym program delete"
  ON public.gym_user_custom_programs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS gym_user_custom_program_updated ON public.gym_user_custom_programs;
CREATE TRIGGER gym_user_custom_program_updated
  BEFORE UPDATE ON public.gym_user_custom_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
