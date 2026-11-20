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

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
      <Timer className="h-3.5 w-3.5" />
      {remaining === 0
        ? L('موعد الجلسة الآن', 'Session starts now')
        : `${L('باقي', 'In')} ${days ? `${days}${L('ي ', 'd ')}` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
    </span>
  );
}
