-- Keep a doctor's weekly hours in the database and reserve each requested slot
-- atomically. Pending requests occupy the time until the doctor responds.

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view doctor working hours" ON public.doctor_availability;
CREATE POLICY "Authenticated users can view doctor working hours"
ON public.doctor_availability FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Doctors manage their own working hours" ON public.doctor_availability;
CREATE POLICY "Doctors manage their own working hours"
ON public.doctor_availability FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_availability.doctor_id
      AND d.user_id = auth.uid()
      AND d.is_verified = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_availability.doctor_id
      AND d.user_id = auth.uid()
      AND d.is_verified = true
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_availability TO authenticated;

-- Doctors can change a request's status, but cannot move it to another slot.
REVOKE UPDATE ON public.doctor_bookings FROM authenticated;
GRANT UPDATE (status) ON public.doctor_bookings TO authenticated;

DROP POLICY IF EXISTS "Doctors respond to booking requests" ON public.doctor_bookings;
CREATE POLICY "Doctors respond to booking requests"
ON public.doctor_bookings FOR UPDATE TO authenticated
USING (
  status IN ('pending', 'confirmed')
  AND EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_bookings.doctor_id
      AND d.user_id = auth.uid()
      AND d.is_verified = true
  )
)
WITH CHECK (
  status IN ('confirmed', 'rejected', 'cancelled')
  AND EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = doctor_bookings.doctor_id
      AND d.user_id = auth.uid()
      AND d.is_verified = true
  )
);

CREATE OR REPLACE FUNCTION public.get_doctor_busy_slots_v2(_doctor_id uuid)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.starts_at, b.ends_at, b.status::text
  FROM public.doctor_bookings b
  WHERE b.doctor_id = _doctor_id
    AND b.status::text IN ('pending', 'confirmed')
    AND b.ends_at >= now();
$$;
REVOKE ALL ON FUNCTION public.get_doctor_busy_slots_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_doctor_busy_slots_v2(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_doctor_booking(_doctor_id uuid, _starts_at timestamptz)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_local_start timestamp;
  v_local_end timestamp;
  v_booking_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in is required'; END IF;
  IF _starts_at IS NULL OR _starts_at <= now() THEN RAISE EXCEPTION 'Choose a future time'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.id = _doctor_id
      AND d.is_verified = true
      AND d.verification_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Doctor is not accepting bookings';
  END IF;

  -- Serialize all booking requests for this doctor. The first request to get
  -- the lock reserves its slot; later simultaneous requests see that row.
  PERFORM pg_advisory_xact_lock(hashtextextended('doctor-booking:' || _doctor_id::text, 0));

  v_local_start := _starts_at AT TIME ZONE 'Africa/Cairo';
  v_local_end := (_starts_at + interval '30 minutes') AT TIME ZONE 'Africa/Cairo';
  IF v_local_start::date <> v_local_end::date
     OR date_part('second', v_local_start) <> 0 THEN
    RAISE EXCEPTION 'Choose a valid 30-minute appointment slot';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.doctor_availability a
    WHERE a.doctor_id = _doctor_id
      AND a.weekday = date_part('dow', v_local_start)::int
      AND v_local_start::time >= a.start_time
      AND v_local_end::time <= a.end_time
      AND mod(
        extract(epoch FROM (v_local_start - (v_local_start::date + a.start_time)))::integer,
        1800
      ) = 0
  ) THEN
    RAISE EXCEPTION 'This time is outside the doctor working hours';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.doctor_bookings b
    WHERE b.doctor_id = _doctor_id
      AND b.status::text IN ('pending', 'confirmed')
      AND b.starts_at < _starts_at + interval '30 minutes'
      AND b.ends_at > _starts_at
  ) THEN
    RAISE EXCEPTION 'This appointment slot is already taken';
  END IF;

  INSERT INTO public.doctor_bookings (doctor_id, user_id, starts_at, ends_at, status)
  VALUES (_doctor_id, v_user_id, _starts_at, _starts_at + interval '30 minutes', 'pending')
  RETURNING id INTO v_booking_id;
  RETURN v_booking_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_doctor_booking(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_doctor_booking(uuid, timestamptz) TO authenticated;
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'doctor_availability'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_availability;
    END IF;
  END IF;
END;
$$;
