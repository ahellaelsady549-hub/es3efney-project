import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function SessionCountdown({ startsAt }: { startsAt: string }) {
  const { L } = useLanguage();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, Math.floor((new Date(startsAt).getTime() - now) / 1_000));
  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor((remaining % 86_400) / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const seconds = remaining % 60;
  const units = [
    { value: days, label: L('يوم', 'Days') },
    { value: hours, label: L('ساعة', 'Hours') },
    { value: minutes, label: L('دقيقة', 'Minutes') },
    { value: seconds, label: L('ثانية', 'Seconds') },
  ];

  return (
    <div
      role="timer"
      aria-label={remaining === 0 ? L('بدأ موعد الجلسة الآن', 'The session starts now') : L('العد التنازلي لموعد الجلسة', 'Countdown to the session')}
      className="w-full rounded-xl border border-primary/40 bg-primary/10 p-3 shadow-sm"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Timer className="h-5 w-5 text-primary" />
        <span>{L('العد التنازلي للجلسة', 'Session countdown')}</span>
      </div>
      {remaining === 0 ? (
        <div className="mt-3 rounded-lg bg-primary px-3 py-2 text-center text-sm font-bold text-primary-foreground">
          {L('بدأ موعد الجلسة الآن', 'The session starts now')}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-2" dir="ltr">
          {units.map(({ value, label }) => (
            <div key={label} className="rounded-lg border border-border bg-background px-1.5 py-2 text-center shadow-sm">
              <div className="font-mono text-lg font-bold leading-none tabular-nums text-primary sm:text-xl">
                {String(value).padStart(2, '0')}
              </div>
              <div className="mt-1 text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
