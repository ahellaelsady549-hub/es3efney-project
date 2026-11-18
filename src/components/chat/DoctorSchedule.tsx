import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, Trash2, X } from 'lucide-react';

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Availability { id: string; weekday: number; start_time: string; end_time: string }
interface Booking { id: string; starts_at: string; ends_at: string; status: string; user_id: string }

export function DoctorSchedule({ doctorId }: { doctorId: string }) {
  const { L } = useLanguage();
  const [rows, setRows] = useState<Availability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: hours, error: hoursError }, { data: upcoming, error: bookingError }] = await Promise.all([
      supabase.from('doctor_availability').select('id,weekday,start_time,end_time').eq('doctor_id', doctorId).order('weekday'),
      supabase.from('doctor_bookings').select('id,starts_at,ends_at,status,user_id').eq('doctor_id', doctorId).in('status', ['pending', 'confirmed']).gte('ends_at', new Date().toISOString()).order('starts_at'),
    ]);
    if (hoursError) toast.error(hoursError.message);
    if (bookingError) toast.error(bookingError.message);
    setRows((hours || []) as Availability[]);
    const sessions = (upcoming || []) as Booking[];
    setBookings(sessions);
    const ids = [...new Set(sessions.map((b) => b.user_id))];
    if (ids.length) {
      const profiles = await Promise.all(ids.map(async (id) => {
        const { data } = await supabase.rpc('get_profile_public', { profile_user_id: id });
        return [id, data?.[0]?.full_name || L('مستخدم', 'Patient')] as const;
      }));
      setPatientNames(Object.fromEntries(profiles));
    } else setPatientNames({});
  }, [doctorId, L]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`doctor-bookings-${doctorId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doctor_bookings', filter: `doctor_id=eq.${doctorId}` }, (payload) => {
        const booking = payload.new as Booking;
        if (booking.status !== 'pending') return;
        toast.info(L('وصلك طلب حجز جديد. افتح لوحة التحكم للموافقة أو الرفض.', 'New booking request. Open your dashboard to approve or reject it.'));
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(L('طلب حجز جديد', 'New booking request'), { body: new Date(booking.starts_at).toLocaleString() });
        }
        void load();
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [doctorId, load, L]);

  const add = async () => {
    if (end <= start) { toast.error(L('وقت النهاية لازم يكون بعد البداية', 'End must be after start')); return; }
    const overlapsSavedHours = rows.some((row) =>
      row.weekday === weekday && start < row.end_time.slice(0, 5) && end > row.start_time.slice(0, 5),
    );
    if (overlapsSavedHours) {
      toast.error(L('تتداخل ساعات العمل مع فترة محفوظة لهذا اليوم.', 'These hours overlap an existing work period.'));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('doctor_availability')
      .insert({ doctor_id: doctorId, weekday, start_time: start, end_time: end })
      .select('id')
      .single();
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success(L('تم حفظ ساعات العمل', 'Working hours saved')); await load(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('doctor_availability').delete().eq('id', id);
    if (error) toast.error(error.message); else await load();
  };
  const respond = async (booking: Booking, status: 'confirmed' | 'rejected' | 'cancelled') => {
    const { error } = await supabase.from('doctor_bookings').update({ status }).eq('id', booking.id).eq('status', booking.status);
    if (error) toast.error(error.message);
    else { toast.success(status === 'confirmed' ? L('تم تأكيد الحجز', 'Booking confirmed') : status === 'rejected' ? L('تم رفض طلب الحجز', 'Booking request rejected') : L('تم إلغاء الجلسة', 'Session cancelled')); await load(); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>{L('ساعات العمل وطلبات الجلسات', 'Working hours & session requests')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select aria-label={L('يوم العمل', 'Work day')} className="h-11 rounded-md border border-input bg-background px-3" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {DAYS_AR.map((day, i) => <option key={i} value={i}>{L(day, DAYS_EN[i])}</option>)}
          </select>
          <Input aria-label={L('من الساعة', 'Start time')} type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-11" />
          <Input aria-label={L('إلى الساعة', 'End time')} type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-11" />
          <Button onClick={() => void add()} disabled={saving} className="h-11">{L('إضافة ساعات', 'Add hours')}</Button>
        </div>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{L('لم تحدد ساعات العمل بعد؛ لن يستطيع المرضى الحجز.', 'No working hours set. Patients cannot book yet.')}</p> : rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span>{L(DAYS_AR[row.weekday], DAYS_EN[row.weekday])}: {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}</span>
            <Button size="icon" variant="ghost" onClick={() => void remove(row.id)} aria-label={L('حذف ساعات العمل', 'Delete working hours')}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <h3 className="border-t pt-4 font-semibold">{L('طلبات الحجز والجلسات القادمة', 'Booking requests & upcoming sessions')}</h3>
        {bookings.length === 0 ? <p className="text-sm text-muted-foreground">{L('لا توجد طلبات أو جلسات قادمة.', 'No requests or upcoming sessions.')}</p> : bookings.map((booking) => (
          <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <div className="space-y-1">
              <div className="font-medium">{patientNames[booking.user_id] || L('مستخدم', 'Patient')}</div>
              <div>{new Date(booking.starts_at).toLocaleString(L('ar-EG', 'en-US'), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              <Badge variant={booking.status === 'pending' ? 'secondary' : 'default'}>{booking.status === 'pending' ? L('بانتظار موافقتك', 'Waiting for your approval') : L('مؤكدة', 'Confirmed')}</Badge>
            </div>
            <div className="flex gap-2">
              {booking.status === 'pending' ? <>
                <Button size="sm" variant="destructive" onClick={() => void respond(booking, 'rejected')}><X className="me-1 h-4 w-4" />{L('رفض', 'Reject')}</Button>
                <Button size="sm" onClick={() => void respond(booking, 'confirmed')}><Check className="me-1 h-4 w-4" />{L('موافقة', 'Approve')}</Button>
              </> : <Button size="sm" variant="outline" onClick={() => void respond(booking, 'cancelled')}>{L('إلغاء', 'Cancel')}</Button>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
