ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS cv_link text,
  ADD COLUMN IF NOT EXISTS workplace_type text,
  ADD COLUMN IF NOT EXISTS workplace_name text,
  ADD COLUMN IF NOT EXISTS workplace_address text;

NOTIFY pgrst, 'reload schema';
