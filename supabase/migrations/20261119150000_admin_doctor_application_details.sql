GRANT SELECT ON public.doctors TO authenticated;

DROP POLICY IF EXISTS "Admins view doctor applications" ON public.doctors;
CREATE POLICY "Admins view doctor applications"
ON public.doctors
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

NOTIFY pgrst, 'reload schema';
