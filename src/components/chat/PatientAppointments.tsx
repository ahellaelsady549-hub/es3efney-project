import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { SessionCountdown } from '@/components/chat/SessionCountdown';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  doctor_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  consultation_reason: string;
}

interface PublicDoctor { id: string; user_id: string; specialty: string }

export function PatientAppointments({ userId }: { userId: string }) {
  const { L } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorNames, setDoctorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data, error }, { data: doctors, error: doctorsError }] = await Promise.all([
      supabase.from('doctor_bookings')
        .select('id,doctor_id,starts_at,ends_at,status,consultation_reason')
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed'])
        .gte('ends_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true }),
      supabase.rpc('get_doctors_public'),
    ]);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (doctorsError) console.error('Unable to load doctors for the appointment list:', doctorsError);

    const rows = (data || []) as Appointment[];
    setAppointments(rows);
    const doctorById = new Map(((doctors || []) as PublicDoctor[]).map((doctor) => [doctor.id, doctor]));
    const doctorUsers = [...new Set(rows.map((appointment) => doctorById.get(appointment.doctor_id)?.user_id).filter((id): id is string => Boolean(id)))];
    const names = await Promise.all(doctorUsers.map(async (doctorUserId) => {
      const { data: profile } = await supabase.rpc('get_profile_public', { profile_user_id: doctorUserId });
      return [doctorUserId, profile?.[0]?.full_name || L('الطبيب', 'Doctor')] as const;
    }));
    const nameByUser = Object.fromEntries(names);
    setDoctorNames(Object.fromEntries(rows.map((appointment) => [appointment.doctor_id, nameByUser[doctorById.get(appointment.doctor_id)?.user_id || ''] || L('الطبيب', 'Doctor')])));
    setLoading(false);
  }, [userId, L]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`patient-appointments-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_bookings', filter: `user_id=eq.${userId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" />{L('مواعيد الطبيب', 'Doctor appointments')}</CardTitle>
        <CardDescription>{L('طلبات الحجز والجلسات القادمة ومعلومات الاستشارة.', 'Booking requests, upcoming sessions, and consultation details.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">{L('جاري تحميل المواعيد…', 'Loading appointments…')}</p>
          : appointments.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{L('لا توجد مواعيد قادمة. احجز جلسة من صفحة البحث عن طبيب.', 'No upcoming appointments. Book a session from Find a Doctor.')}</p>
            : appointments.map((appointment) => (
              <article key={appointment.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold"><Stethoscope className="h-4 w-4 text-primary" />{L('د. ', 'Dr. ')}{doctorNames[appointment.doctor_id] || L('الطبيب', 'Doctor')}</div>
                  <Badge variant={appointment.status === 'pending' ? 'secondary' : 'default'}>{appointment.status === 'pending' ? L('بانتظار موافقة الطبيب', 'Waiting for doctor approval') : L('تم تأكيد الجلسة', 'Session confirmed')}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>{new Date(appointment.starts_at).toLocaleDateString(L('ar-EG', 'en-US'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div>{new Date(appointment.starts_at).toLocaleTimeString(L('ar-EG', 'en-US'), { hour: '2-digit', minute: '2-digit' })} – {new Date(appointment.ends_at).toLocaleTimeString(L('ar-EG', 'en-US'), { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="rounded-lg bg-muted/60 p-3 text-sm"><span className="font-semibold">{L('سبب الاستشارة:', 'Consultation reason:')}</span> {appointment.consultation_reason}</div>
                {appointment.status === 'confirmed' && new Date(appointment.starts_at) > new Date() && <SessionCountdown startsAt={appointment.starts_at} />}
              </article>
            ))}
      </CardContent>
    </Card>
  );
}

export function DoctorBioEditor({ doctorId, userId }: { doctorId: string; userId: string }) {
  const { L } = useLanguage();
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.from('doctors').select('bio').eq('id', doctorId).eq('user_id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (active) {
          setBio(data?.bio || '');
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [doctorId, userId]);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('doctors')
      .update({ bio: bio.trim() || null })
      .eq('id', doctorId)
      .eq('user_id', userId)
      .select('bio')
      .single();
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setBio(data.bio || '');
      toast.success(L('تم تحديث النبذة المهنية', 'Professional bio updated'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{L('النبذة المهنية', 'Professional bio')}</CardTitle>
        <CardDescription>{L('حدّث نبذتك التي تظهر للمرضى في البحث عن طبيب.', 'Update the bio patients see in Find a Doctor.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          aria-label={L('النبذة المهنية', 'Professional bio')}
          value={bio}
          onChange={(event) => setBio(event.target.value.slice(0, 1000))}
          maxLength={1000}
          rows={4}
          disabled={loading || saving}
          placeholder={L('أضف خبراتك ومجالات اهتمامك…', 'Add your experience and areas of focus…')}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{bio.length}/1000</span>
          <Button type="button" onClick={() => void save()} disabled={loading || saving}>
            {saving ? L('جارٍ الحفظ…', 'Saving…') : L('حفظ النبذة', 'Save bio')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
