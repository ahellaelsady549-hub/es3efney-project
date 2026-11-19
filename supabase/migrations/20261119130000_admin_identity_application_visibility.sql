-- Ensure the identity queue exists even on projects where the earlier
-- identity setup migration was skipped.
CREATE TABLE IF NOT EXISTS public.identity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  national_id text NOT NULL CHECK (national_id ~ '^[0-9]{14}$'),
  governorate text NOT NULL,
  home_address text NOT NULL,
  id_front_path text NOT NULL,
  id_back_path text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('doctor', 'user')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ai_review text,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.identity_applications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.identity_applications TO authenticated;
DROP POLICY IF EXISTS "Users view own identity application" ON public.identity_applications;
CREATE POLICY "Users view own identity application"
ON public.identity_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users submit own identity application" ON public.identity_applications;
CREATE POLICY "Users submit own identity application"
ON public.identity_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "Admins view identity applications" ON public.identity_applications;
CREATE POLICY "Admins view identity applications"
ON public.identity_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));
DROP POLICY IF EXISTS "Admins review identity applications" ON public.identity_applications;
CREATE POLICY "Admins review identity applications"
ON public.identity_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- Identity images are private; only their owner and administrators can read them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('identity-documents', 'identity-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
DROP POLICY IF EXISTS "Users upload own identity documents" ON storage.objects;
CREATE POLICY "Users upload own identity documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Users view own identity documents" ON storage.objects;
CREATE POLICY "Users view own identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Admins view identity documents" ON storage.objects;
CREATE POLICY "Admins view identity documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'identity-documents' AND public.has_role(auth.uid(), 'admin'::public.user_role));

-- Let administrators see the applicant's display name and email in the queue.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Admins view applicant profiles" ON public.profiles;
CREATE POLICY "Admins view applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

NOTIFY pgrst, 'reload schema';
