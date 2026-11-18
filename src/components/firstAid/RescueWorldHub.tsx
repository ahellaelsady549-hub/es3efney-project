import { useState } from 'react';
import { Activity, ArrowRight, BookOpenCheck, Flame, HeartPulse, Medal, ShieldAlert, Sparkles, Backpack, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { allFirstAidLessons } from '@/data/firstAidPracticeLessons';
import { toast } from 'sonner';

type Props = { xp: number; streak: number; completed: number; total: number; onOpenLesson: (id: number) => void; onOpenQuiz: (id: number) => void; completeMission: (answer: string) => Promise<{ claimed: boolean; error: unknown | null; local?: boolean }>; };
const options = [
  { id: 'cool-water-20m', ar: 'برّد الحرق بماء جارٍ بارد لمدة 20 دقيقة.', en: 'Cool the burn under cool running water for 20 minutes.' },
  { id: 'ice', ar: 'ضع الثلج مباشرة على الحرق.', en: 'Apply ice directly to the burn.' },
  { id: 'butter', ar: 'ادهن الحرق بالزبدة أو الزيت.', en: 'Apply butter or oil.' },
  { id: 'blisters', ar: 'افقع الفقاعات لتخفيف الضغط.', en: 'Pop blisters to relieve pressure.' },
];

export function RescueWorldHub({ xp, streak, completed, total, onOpenLesson, onOpenQuiz, completeMission }: Props) {
  const { L, language } = useLanguage();
  const { user } = useAuth();
  const [missionOpen, setMissionOpen] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const level = xp >= 1000 ? 4 : xp >= 600 ? 3 : xp >= 300 ? 2 : xp >= 100 ? 1 : 0;
  const levelNames = [['مسعف مبتدئ', 'Beginner Rescuer'], ['مستكشف الطوارئ', 'Emergency Explorer'], ['مساعد إنقاذ', 'Rescue Assistant'], ['مستجيب متقدم', 'Advanced Responder'], ['بطل الإنقاذ', 'Rescue Hero']];
  const thresholds = [0, 100, 300, 600, 1000];
  const next = thresholds[level + 1];
  const firstScenarioLessonId = allFirstAidLessons.find((lesson) => lesson.scenario)?.id ?? 1;

  const choose = async (id: string) => {
    if (answer || sending) return;
    setAnswer(id);
    if (id !== 'cool-water-20m' || !user) return;
    setSending(true);
    const result = await completeMission(id);
    setSending(false);
    if (result.error) { setAnswer(null); toast.error(L('تعذر حفظ المكافأة. حاول مرة أخرى.', 'Could not save XP. Please try again.')); return; }
    if (result.claimed) { setClaimed(true); toast.success(result.local ? L('حُفظت 100 XP على هذا الجهاز لحين عودة المزامنة.', '100 XP saved on this device until sync is available.') : L('كسبت 100 XP!', 'You earned 100 XP!')); }
    else { setClaimed(true); toast.message(L('أكملت مهمة اليوم مسبقًا.', 'Today’s mission is already claimed.')); }
  };
  const cards = [
    { title: L('محاكي الإنقاذ', 'Rescue Simulator'), subtitle: L('عش مواقف حقيقية افتراضيًا', 'Practice real-life scenarios'), icon: ShieldAlert, action: () => { setMissionOpen(true); document.getElementById('daily-rescue-mission')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, accent: 'from-rose-500/20 to-orange-500/5' },
    { title: L('تحدي المعلومات', 'Knowledge Challenge'), subtitle: L('اختبر معلوماتك واكسب XP', 'Test your knowledge and earn XP'), icon: Trophy, action: () => onOpenQuiz(4), accent: 'from-amber-500/20 to-yellow-500/5' },
    { title: L('قصص الإنقاذ', 'Rescue Stories'), subtitle: L('اختر ماذا سيحدث بعد ذلك', 'Choose what happens next'), icon: BookOpenCheck, action: () => onOpenLesson(firstScenarioLessonId), accent: 'from-sky-500/20 to-cyan-500/5' },
    { title: L('معمل الإسعافات', 'First Aid Lab'), subtitle: L('تدرّب على الخطوات والمعدات', 'Practice first-aid steps and tools'), icon: Backpack, action: () => onOpenLesson(4), accent: 'from-emerald-500/20 to-teal-500/5' },
  ];

  return <section className="mb-7 space-y-4" aria-label={L('عالم الإنقاذ', 'Rescue World')}>
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/70 p-5 text-white shadow-lg md:p-7">
      <div className="pointer-events-none absolute -end-10 -top-16 h-56 w-56 rounded-full border-[24px] border-white/5" />
      <div className="relative grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div><div className="mb-2 flex items-center gap-2 text-amber-300"><Sparkles className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-widest">ES3EFNY · RESCUE WORLD</span></div>
          <h2 className="text-2xl font-black md:text-3xl">{L('مستعد تنقذ الموقف؟', 'Ready to rescue?')}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{L('تعلّم بالاختيار والتجربة. كل مرحلة تقرّبك من استجابة أهدأ وأوعى.', 'Learn by choosing and practicing. Each stage builds calmer, more informed responses.')}</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center"><Trophy className="mx-auto mb-1 h-5 w-5 text-amber-300" /><strong className="block text-xl">{xp}</strong><span className="text-xs text-white/70">XP</span></div>
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-center"><Flame className="mx-auto mb-1 h-5 w-5 text-orange-300" /><strong className="block text-xl">{streak}</strong><span className="text-xs text-white/70">{L('يوم', 'day streak')}</span></div>
        </div>
      </div>
      <div className="relative mt-5 rounded-xl bg-white/10 p-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-sm"><span className="font-bold">{language === 'ar' ? levelNames[level][0] : levelNames[level][1]}</span><span className="text-white/70">{completed}/{total} {L('مرحلة', 'stages')}</span></div>
        <Progress value={next ? Math.max(0, Math.min(100, ((xp - thresholds[level]) / (next - thresholds[level])) * 100)) : 100} className="h-2 bg-white/20 [&>div]:bg-amber-300" />
        <div className="mt-2 flex flex-wrap gap-1.5">{levelNames.map(([ar, en], i) => <span key={en} className={`rounded-full px-2 py-1 text-[10px] ${i <= level ? 'bg-amber-300/20 text-amber-100' : 'bg-white/5 text-white/45'}`}>{language === 'ar' ? ar : en}</span>)}</div>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ title, subtitle, icon: Icon, action, accent }) => <button key={title} type="button" onClick={action} className={`group relative min-h-36 overflow-hidden rounded-xl border bg-gradient-to-br ${accent} p-4 text-start transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
        <Icon className="mb-4 h-8 w-8 text-primary transition group-hover:scale-110" />
        <span className="block font-bold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span>
        <ArrowRight className="absolute bottom-4 end-4 h-4 w-4 text-muted-foreground rtl:rotate-180" />
      </button>)}
    </div>

    <Card id="daily-rescue-mission" className="overflow-hidden border-amber-500/30">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center md:p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-rose-500/20"><Activity className="h-9 w-9 text-orange-600" /></div>
        <div><div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">{L('متاحة اليوم', 'Available today')}</span><span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300"><Medal className="h-3.5 w-3.5" />+100 XP</span></div>
          <h3 className="font-bold">{L('مهمة اليوم: حرق في المطبخ', 'Today’s mission: Kitchen burn')}</h3>
          <p className="text-sm text-muted-foreground">{L('شخص تعرّض لحرق في المطبخ. بعد إبعاده عن مصدر الحرارة، ما التصرف التالي؟', 'Someone has a kitchen burn. After moving them away from the heat source, what should you do next?')}</p>
        </div>
        <Button variant={missionOpen ? 'outline' : 'default'} onClick={() => setMissionOpen((open) => !open)}>{missionOpen ? L('إخفاء المهمة', 'Hide mission') : L('ابدأ السيناريو', 'Start scenario')}</Button>
      </CardContent>
      {missionOpen && <div className="border-t bg-muted/30 p-4 md:p-5">
        <p className="mb-3 text-sm font-semibold">{L('اختر التصرف الأكثر أمانًا:', 'Choose the safest next action:')}</p>
        <div className="grid gap-2 sm:grid-cols-2">{options.map((item) => <Button key={item.id} variant={answer === null ? 'outline' : item.id === 'cool-water-20m' ? 'default' : answer === item.id ? 'destructive' : 'outline'} className="h-auto min-h-12 justify-start whitespace-normal py-3 text-start" disabled={answer !== null || sending || claimed} onClick={() => void choose(item.id)}>{L(item.ar, item.en)}</Button>)}</div>
        {answer && <div className="mt-3 rounded-lg border bg-background p-3 text-sm leading-6" role="status"><b>{answer === 'cool-water-20m' ? L(user ? 'إجابة صحيحة!' : 'إجابة صحيحة — سجّل الدخول لكسب XP', user ? 'Correct!' : 'Correct — sign in to earn XP') : L('مش الاختيار الآمن — جرّب تاني', 'That is not the safest option — try again')}</b><p className="mt-1">{answer === 'cool-water-20m' ? L('برّد الحرق بماء جارٍ بارد لمدة 20 دقيقة. لا تستخدم الثلج أو الزيوت ولا تفقع الفقاعات. المكافأة مرة واحدة يوميًا للحساب المسجل.', 'Cool the burn under cool running water for 20 minutes. Do not use ice or oils or pop blisters. XP is claimable once per day by signed-in users.') : L('الثلج والزيوت وفقع الفقاعات قد يسببون مزيدًا من الضرر. اختر الماء الجاري البارد.', 'Ice, oils, and popping blisters can cause more harm. Choose cool running water.')}</p><a className="mt-2 inline-block text-primary underline" href="https://www.nhs.uk/conditions/burns-and-scalds/" target="_blank" rel="noreferrer">NHS — Burns and scalds</a>{answer !== 'cool-water-20m' && <Button size="sm" variant="outline" className="ms-3" onClick={() => setAnswer(null)}>{L('حاول مجددًا', 'Try again')}</Button>}</div>}
      </div>}
      <p className="px-4 pb-4 text-xs text-muted-foreground">{L('تدريب توعوي فقط؛ الحالات الكبيرة أو العميقة أو الكيميائية أو الكهربائية تستلزم إسعافًا عاجلًا — 123.', 'For learning only; large, deep, chemical, or electrical burns need urgent care — call 123.')}</p>
    </Card>
  </section>;
}
