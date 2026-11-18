import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface Appointment {
  id: string;
  starts_at: string;
}

interface Props {
  userId: string;
  doctorId: string | null;
}

export function UpcomingAppointmentCountdown({ userId, doctorId }: Props) {
  const { L } = useLanguage();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;

    const loadUpcomingAppointment = async () => {
      let query = supabase.from('doctor_bookings')
        .select('id,starts_at')
        .eq('status', 'confirmed')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1);

      query = doctorId
        ? query.or(`user_id.eq.${userId},doctor_id.eq.${doctorId}`)
        : query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) {
        console.error('Unable to load the next confirmed session:', error);
        return;
      }
      if (active) setAppointment((data?.[0] as Appointment | undefined) ?? null);
    };

    void loadUpcomingAppointment();
    const refreshId = window.setInterval(() => void loadUpcomingAppointment(), 30_000);
    const channel = supabase.channel(`dashboard-upcoming-booking-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_bookings' }, () => {
        void loadUpcomingAppointment();
      })
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(refreshId);
      void supabase.removeChannel(channel);
    };
  }, [userId, doctorId]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timerId);
  }, []);

  if (!appointment) return null;

  const remainingSeconds = Math.max(0, Math.floor((new Date(appointment.starts_at).getTime() - now) / 1_000));
  const days = Math.floor(remainingSeconds / 86_400);
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;
  const units = [
    { value: days, label: L('يوم', 'Days') },
    { value: hours, label: L('ساعة', 'Hours') },
    { value: minutes, label: L('دقيقة', 'Minutes') },
    { value: seconds, label: L('ثانية', 'Seconds') },
  ];

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">{L('العد التنازلي للجلسة القادمة', 'Countdown to your next session')}</h2>
            <p className="text-sm text-muted-foreground">
              {remainingSeconds === 0
                ? L('موعد الجلسة الآن', 'Your session is starting now')
                : new Date(appointment.starts_at).toLocaleString(L('ar-EG', 'en-US'), {
                  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2" dir="ltr">
          {units.map(({ value, label }) => (
            <div key={label} className="rounded-lg bg-background px-2 py-3 text-center shadow-sm">
              <div className="font-mono text-xl font-bold tabular-nums text-primary sm:text-2xl">
                {String(value).padStart(2, '0')}
              </div>
              <div className="mt-1 text-xs text-muted-foreground" dir={L('rtl', 'ltr')}>{label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
