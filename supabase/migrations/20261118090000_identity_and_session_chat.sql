ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS governorate text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_address text;

-- Ensure the booking and chat tables exist before later RPC and trigger migrations.
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  UNIQUE (doctor_id, weekday, start_time, end_time)
);
CREATE TABLE IF NOT EXISTS public.doctor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS doctor_bookings_doctor_start_idx ON public.doctor_bookings (doctor_id, starts_at);
CREATE INDEX IF NOT EXISTS doctor_bookings_user_start_idx ON public.doctor_bookings (user_id, starts_at);
CREATE TABLE IF NOT EXISTS public.chat_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  reason text,
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_user_id IS NOT NULL OR conversation_id IS NOT NULL)
);

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.doctor_availability TO authenticated;
GRANT SELECT, UPDATE ON public.doctor_bookings TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_bans TO authenticated;
DROP POLICY IF EXISTS "Authenticated users can view doctor working hours" ON public.doctor_availability;
CREATE POLICY "Authenticated users can view doctor working hours" ON public.doctor_availability FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Doctors manage their own working hours" ON public.doctor_availability;
CREATE POLICY "Doctors manage their own working hours" ON public.doctor_availability FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_availability.doctor_id AND d.user_id = auth.uid() AND d.is_verified = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_availability.doctor_id AND d.user_id = auth.uid() AND d.is_verified = true));
DROP POLICY IF EXISTS "Booking participants view their sessions" ON public.doctor_bookings;
CREATE POLICY "Booking participants view their sessions" ON public.doctor_bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_bookings.doctor_id AND d.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage chat bans" ON public.chat_bans;
CREATE POLICY "Admins manage chat bans" ON public.chat_bans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TABLE IF NOT EXISTS public.identity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  national_id text NOT NULL CHECK (national_id ~ '^[0-9]{14}$'),
  governorate text NOT NULL,
  home_address text NOT NULL,
  id_front_path text NOT NULL,
  id_back_path text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('doctor','user')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  ai_review text,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.identity_applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.identity_applications TO authenticated;
DROP POLICY IF EXISTS "Users view own identity application" ON public.identity_applications;
CREATE POLICY "Users view own identity application" ON public.identity_applications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users submit own identity application" ON public.identity_applications;
CREATE POLICY "Users submit own identity application" ON public.identity_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "Admins review identity applications" ON public.identity_applications;
CREATE POLICY "Admins review identity applications" ON public.identity_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('identity-documents','identity-documents',false,10485760,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
DROP POLICY IF EXISTS "Users upload own identity documents" ON storage.objects;
CREATE POLICY "Users upload own identity documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='identity-documents' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS "Users view own identity documents" ON storage.objects;
CREATE POLICY "Users view own identity documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='identity-documents' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'admin')));

UPDATE storage.buckets SET file_size_limit=314572800,allowed_mime_types=ARRAY['application/pdf'] WHERE id='doctor-cvs';

CREATE OR REPLACE FUNCTION public.enforce_session_message_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.conversations%ROWTYPE; d uuid;
BEGIN
 SELECT * INTO c FROM public.conversations WHERE id=NEW.conversation_id;
 IF c.id IS NULL OR (c.user_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM public.doctors WHERE id=c.doctor_id AND user_id=auth.uid())) THEN RAISE EXCEPTION 'Conversation access denied'; END IF;
 IF EXISTS (SELECT 1 FROM public.chat_bans b WHERE b.expires_at IS NULL OR b.expires_at > now() AND (b.conversation_id=c.id OR b.target_user_id IN (c.user_id,(SELECT user_id FROM public.doctors WHERE id=c.doctor_id)))) THEN RAISE EXCEPTION 'Chat is blocked'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.doctor_bookings s WHERE s.doctor_id=c.doctor_id AND s.user_id=c.user_id AND s.status='confirmed' AND now() >= s.starts_at AND now() <= s.ends_at + interval '1 hour') THEN RAISE EXCEPTION 'Chat is outside the booked session window'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_session_message_window ON public.messages;
CREATE TRIGGER enforce_session_message_window BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.enforce_session_message_window();

CREATE OR REPLACE FUNCTION public.can_chat(_conversation_id uuid,_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.conversations c JOIN public.doctor_bookings b ON b.doctor_id=c.doctor_id AND b.user_id=c.user_id WHERE c.id=_conversation_id AND c.user_id=_user_id AND b.status='confirmed' AND now() >= b.starts_at AND now() <= b.ends_at + interval '1 hour')
 AND NOT EXISTS (SELECT 1 FROM public.chat_bans cb JOIN public.conversations c ON c.id=_conversation_id WHERE cb.expires_at IS NULL OR cb.expires_at > now() AND (cb.conversation_id=c.id OR cb.target_user_id IN (c.user_id,(SELECT d.user_id FROM public.doctors d WHERE d.id=c.doctor_id))))
$$;
