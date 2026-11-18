import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { availableSlots, type AvailabilityRow, type BookingRow } from '@/lib/sessions';
import { CalendarClock } from 'lucide-react';

interface Props { doctorId: string; canBook: boolean; onBooked: () => void }

export function BookingPanel({ doctorId, canBook, onBooked }: Props) {
  const { L } = useLanguage();
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectionPrompt, setSelectionPrompt] = useState(false);
  const slotPickerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [{ data: hours, error: hoursError }, { data: busySlots, error: slotsError }] = await Promise.all([
      supabase.from('doctor_availability').select('weekday,start_time,end_time').eq('doctor_id', doctorId),
      supabase.rpc('get_doctor_busy_slots_v2', { _doctor_id: doctorId }),
    ]);
    if (hoursError) toast.error(hoursError.message);
    if (slotsError) toast.error(slotsError.message);
    setAvailability((hours || []) as AvailabilityRow[]);
    setBookings((busySlots as BookingRow[]) || []);
  };

  useEffect(() => {
    void load();
    const channel = supabase.channel(`booking-hours-${doctorId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'doctor_availability', filter: `doctor_id=eq.${doctorId}`,
      }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [doctorId]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + i);
    return day;
  }), []);
  const slots = availableSlots(days[dayOffset], availability, bookings);

  const book = async () => {
    if (!selectedSlot || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('request_doctor_booking', {
      _doctor_id: doctorId,
      _starts_at: selectedSlot.toISOString(),
    });
    setBusy(false);
    if (error) {
      const message = error.message.toLowerCase();
      toast.error(message.includes('already taken')
        ? L('الميعاد اتحجز قبلك مباشرة. اختار ميعاداً آخر.', 'That slot was just booked. Choose another time.')
        : message.includes('outside the doctor working hours')
          ? L('الميعاد خارج ساعات عمل الطبيب.', 'That time is outside the doctor’s working hours.')
          : message.includes('not accepting bookings')
            ? L('الطبيب لا يستقبل حجوزات حالياً.', 'This doctor is not accepting bookings right now.')
            : message.includes('schema cache') && message.includes('request_doctor_booking')
              ? L('خدمة الحجز لم تُحدّث على الخادم بعد. حاول مرة أخرى بعد تحديث النظام.', 'Booking is not ready on the server yet. Please try again after the server update.')
            : error.message);
      void load();
      return;
    }
    toast.success(L('تم إرسال طلب الحجز للطبيب، وسيتم تأكيد الجلسة بعد موافقته.', 'Booking request sent. Your session is confirmed after the doctor approves it.'));
    setSelectedSlot(null);
    onBooked();
    void load();
  };

  const handleBookingAction = () => {
    if (selectedSlot) {
      void book();
      return;
    }
    if (availability.length === 0) {
      toast.error(L('الطبيب لم يحدد ساعات عمل بعد.', 'The doctor has not set working hours yet.'));
      return;
    }
    setSelectionPrompt(true);
    slotPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2 font-semibold">
        <CalendarClock className="h-5 w-5 text-primary" />
        {L('المحادثة مقفولة — احجز جلسة', 'Chat is closed — book a session')}
      </div>
      <p className="text-sm text-muted-foreground">
        {L('المحادثة تفتح من بداية الجلسة وحتى ساعة بعد انتهائها.', 'Chat opens at session start and closes one hour after it ends.')}
      </p>

      <div className="space-y-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
        <p className="text-sm font-medium">
          {selectedSlot
            ? `${L('الموعد المختار:', 'Selected appointment:')} ${selectedSlot.toLocaleString(L('ar-EG', 'en-US'), { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
            : L('اختار اليوم والوقت المناسبين، ثم اضغط الزر لإرسال الطلب للطبيب.', 'Choose a day and time, then send your booking request to the doctor.')}
        </p>
        <Button
          className="h-12 w-full text-base font-bold shadow-md"
          disabled={busy || !canBook}
          onClick={handleBookingAction}
        >
          <CalendarClock className="me-2 h-5 w-5" />
          {busy
            ? L('جارٍ إرسال الطلب…', 'Sending request…')
            : selectedSlot
              ? L('إرسال طلب الحجز للطبيب', 'Send booking request to doctor')
              : L('حجز جلسة وإرسال طلب للطبيب', 'Book a session and send request to doctor')}
        </Button>
        {selectionPrompt && !selectedSlot && availability.length > 0 && (
          <p className="text-sm font-medium text-primary">{L('اختار يومًا ثم اضغط على موعد متاح بالأسفل.', 'Choose a day, then select an available time below.')}</p>
        )}
      </div>

      {!canBook ? null : availability.length === 0 ? (
        <p className="text-sm">{L('الطبيب لم يحدد ساعات عمل بعد.', 'The doctor has not set working hours yet.')}</p>
      ) : (
        <div ref={slotPickerRef} className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day, index) => (
              <Button
                key={index}
                size="sm"
                variant={index === dayOffset ? 'default' : 'outline'}
                onClick={() => { setDayOffset(index); setSelectedSlot(null); setSelectionPrompt(false); }}
                className="shrink-0"
              >
                {day.toLocaleDateString(L('ar-EG', 'en-US'), { weekday: 'short', day: 'numeric' })}
              </Button>
            ))}
          </div>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{L('لا توجد مواعيد متاحة في هذا اليوم.', 'No free slots this day.')}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <Button
                  key={slot.toISOString()}
                  variant={selectedSlot?.getTime() === slot.getTime() ? 'default' : 'outline'}
                  aria-pressed={selectedSlot?.getTime() === slot.getTime()}
                  disabled={busy}
                  onClick={() => { setSelectedSlot(slot); setSelectionPrompt(false); }}
                  className="h-11"
                >
                  {slot.toLocaleTimeString(L('ar-EG', 'en-US'), { hour: '2-digit', minute: '2-digit' })}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
