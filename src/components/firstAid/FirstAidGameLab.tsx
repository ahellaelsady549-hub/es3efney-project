import { useEffect, useMemo, useState } from 'react';
import { Activity, Backpack, Brain, Eye, HeartPulse, RotateCcw, Sparkles, Stethoscope, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { firstAidTips } from '@/data/firstAidTips';
import type { FirstAidGameId } from '@/hooks/useFirstAidProgress';
import { FirstAidRunnerGame } from '@/components/firstAid/FirstAidRunnerGame';

type Game = 'runner' | 'triage' | 'kit' | 'danger' | 'rhythm' | 'patient' | 'detective' | 'cards';
const patients = [
  { id: 'red', ar: 'مصاب لا يستجيب ولا يتنفس بشكل طبيعي', en: 'A person is unresponsive and not breathing normally', priority: 0 },
  { id: 'yellow', ar: 'مصاب بنزيف مستمر لكنه واعٍ ويتنفس', en: 'A person has ongoing bleeding but is alert and breathing', priority: 1 },
  { id: 'green', ar: 'مصاب بجرح بسيط ويمشي ويتحدث', en: 'A person has a minor cut and can walk and talk', priority: 2 },
];
const kitItems = [
  { id: 'gloves', ar: 'قفازات للاستعمال مرة واحدة', en: 'Disposable gloves', right: true },
  { id: 'gauze', ar: 'شاش وضمادات نظيفة', en: 'Clean gauze and dressings', right: true },
  { id: 'shears', ar: 'مقص إسعافات أولية', en: 'First aid shears', right: true },
  { id: 'candy', ar: 'حلوى لإعطائها لأي مصاب', en: 'Candy to give to any casualty', right: false },
  { id: 'medicine', ar: 'أدوية لإعطائها دون تقييم', en: 'Medication to give without assessment', right: false },
];
const dangerItems = [
  { id: 'traffic', ar: 'حركة مرور بجوار المصاب', en: 'Traffic moving beside the casualty' },
  { id: 'wire', ar: 'سلك كهرباء مكشوف', en: 'An exposed electrical wire' },
  { id: 'smoke', ar: 'دخان يقترب من المكان', en: 'Smoke moving toward the scene' },
  { id: 'glass', ar: 'زجاج مكسور على الأرض', en: 'Broken glass on the ground' },
];
const games: { id: Game; ar: string; en: string; icon: typeof Activity }[] = [
  { id: 'runner', ar: 'عداء الإنقاذ', en: 'Rescue runner', icon: Zap },
  { id: 'triage', ar: 'فرز المصابين', en: 'Mass casualty', icon: Activity },
  { id: 'kit', ar: 'حقيبة الإسعاف', en: 'Build a kit', icon: Backpack },
  { id: 'danger', ar: 'اكتشف الخطر', en: 'Spot danger', icon: Eye },
  { id: 'rhythm', ar: 'إيقاع الضغطات', en: 'CPR rhythm', icon: HeartPulse },
  { id: 'patient', ar: 'المريض الافتراضي', en: 'Virtual patient', icon: Stethoscope },
  { id: 'detective', ar: 'المحقق الطبي', en: 'Medical detective', icon: Brain },
  { id: 'cards', ar: 'بطاقات الذاكرة', en: 'Flashcards', icon: RotateCcw },
];

export function FirstAidGameLab({ onComplete }: { onComplete: (gameId: FirstAidGameId) => Promise<unknown> }) {
  const { L, language } = useLanguage();
  const ar = language === 'ar';
  const [game, setGame] = useState<Game>('triage');
  const [triage, setTriage] = useState<string[]>([]);
  const [kit, setKit] = useState<string[]>([]);
  const [danger, setDanger] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [patientQuestion, setPatientQuestion] = useState<string | null>(null);
  const [taps, setTaps] = useState(0);
  const [seconds, setSeconds] = useState(15);
  const [rhythmRunning, setRhythmRunning] = useState(false);
  const [rhythmRewarded, setRhythmRewarded] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [missedCards, setMissedCards] = useState<number[]>([]);
  const [cardResult, setCardResult] = useState<string | null>(null);
  const [detectiveAnswer, setDetectiveAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (!rhythmRunning) return;
    const end = Date.now() + 15000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setRhythmRunning(false);
    }, 150);
    return () => window.clearInterval(timer);
  }, [rhythmRunning]);

  useEffect(() => {
    if (!rhythmRunning && seconds === 0 && taps >= 25 && taps <= 30 && !rhythmRewarded) {
      setRhythmRewarded(true);
      void onComplete('rhythm');
    }
  }, [onComplete, rhythmRewarded, rhythmRunning, seconds, taps]);

  const cards = useMemo(() => firstAidTips.filter((tip) => tip.stepsAr.length > 0).slice(0, 20), []);
  const card = cards[cardIndex % cards.length];
  const resetGame = (next: Game) => { setGame(next); setChecked(false); setTriage([]); setKit([]); setDanger([]); setPatientQuestion(null); setDetectiveAnswer(null); setCardResult(null); setShowAnswer(false); setRhythmRunning(false); setRhythmRewarded(false); setSeconds(15); setTaps(0); };
  const orderCorrect = triage.length === 3 && triage.every((id, index) => id === patients[index].id);
  const kitScore = kitItems.filter((item) => kit.includes(item.id) === item.right).length;
  const dangerScore = danger.length;
  const finishRhythm = () => { setRhythmRunning(false); setSeconds(0); };

  return <Card id="first-aid-game-lab" className="rescue-game-shell mb-7 overflow-hidden border-primary/20 shadow-xl">
    <div className="rescue-game-hero relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-primary p-5 text-white md:p-7">
      <div className="rescue-game-orb rescue-game-orb-one" aria-hidden="true" />
      <div className="rescue-game-orb rescue-game-orb-two" aria-hidden="true" />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-300"><Sparkles className="h-4 w-4" />RESCUE WORLD · GAME LAB</p>
          <h2 className="text-2xl font-black md:text-3xl">{L('اتعلّم باللعب والتجربة', 'Learn through play and practice')}</h2>
          <p className="mt-2 max-w-xl text-sm text-white/75">{L('تدريبات قصيرة تشرح القرار الآمن خطوة بخطوة.', 'Short activities that explain safe choices step by step.')}</p>
        </div>
        <div className="rescue-xp-chip"><Trophy className="h-4 w-4 text-amber-300" /><span>{games.length} {L('ألعاب تفاعلية', 'interactive games')}</span><b>+5 XP</b></div>
      </div>
    </div>
    <div className="flex gap-2 overflow-x-auto border-b p-3" role="tablist" aria-label={L('ألعاب الإسعافات الأولية', 'First-aid games')}>
      {games.map(({ id, ar: labelAr, en, icon: Icon }) => <Button key={id} role="tab" aria-selected={game === id} variant={game === id ? 'default' : 'outline'} size="sm" className={`rescue-game-tab shrink-0 ${game === id ? 'rescue-game-tab-active' : ''}`} onClick={() => resetGame(id)}><Icon className="me-2 h-4 w-4" />{L(labelAr, en)}</Button>)}
    </div>
    <CardContent key={game} data-game={game} className="rescue-stage-enter min-h-72 p-4 md:p-6">
      {game === 'runner' && <FirstAidRunnerGame onComplete={onComplete} />}
      {game === 'triage' && <div className="space-y-4">
        <h3 className="text-lg font-bold">{L('رتّب الأولوية التعليمية للمصابين', 'Set an educational priority order')}</h3>
        <p className="text-sm text-muted-foreground">{L('اسحب ترتيبك بالضغط على المصابين بالتتابع. في حادث حقيقي اتصل بـ123 واتبع توجيهات الطوارئ؛ هذا تدريب مبسط وليس فرزًا طبيًا معتمدًا.', 'Select the people in priority order. In a real emergency call 123 and follow emergency services; this is simplified practice, not certified triage.')}</p>
        <div className="grid gap-2 md:grid-cols-3">{patients.map((item) => <Button key={item.id} variant={triage.includes(item.id) ? 'default' : 'outline'} disabled={checked || triage.includes(item.id)} className="h-auto min-h-24 justify-start whitespace-normal text-start" onClick={() => setTriage((old) => [...old, item.id])}>{triage.includes(item.id) && <span className="me-2">{triage.indexOf(item.id) + 1}.</span>}{L(item.ar, item.en)}</Button>)}</div>
        <Button disabled={triage.length !== 3 || checked} onClick={() => { setChecked(true); if (orderCorrect) void onComplete('triage'); }}>{L('تحقق من الترتيب', 'Check order')}</Button>
        {checked && <Feedback good={orderCorrect} text={L('ابدأ بمن لا يستجيب ولا يتنفس طبيعيًا، واطلب المساعدة فورًا. لا تؤخر الاتصال بالطوارئ.', 'Prioritize the person who is unresponsive and not breathing normally, and get help immediately. Do not delay contacting emergency services.')} />}
      </div>}

      {game === 'kit' && <div className="space-y-4">
        <h3 className="text-lg font-bold">{L('جهّز حقيبة إسعاف أساسية', 'Build a basic first-aid kit')}</h3><p className="text-sm text-muted-foreground">{L('اختر الأشياء المناسبة للتجهيز العام. لا تستخدم دواءً لمصاب دون توجيه مختص.', 'Choose suitable general supplies. Do not give medication without qualified guidance.')}</p>
        <div className="grid gap-2 sm:grid-cols-2">{kitItems.map((item) => <Button key={item.id} variant={kit.includes(item.id) ? 'default' : 'outline'} disabled={checked} className="h-auto min-h-12 justify-start whitespace-normal" onClick={() => setKit((old) => old.includes(item.id) ? old.filter((id) => id !== item.id) : [...old, item.id])}>{L(item.ar, item.en)}</Button>)}</div>
        <Button disabled={!kit.length || checked} onClick={() => { setChecked(true); if (kitScore === kitItems.length) void onComplete('kit'); }}>{L('راجع الحقيبة', 'Check the kit')}</Button>
        {checked && <Feedback good={kitScore === kitItems.length} text={L('الأساسيات المختارة هي القفازات والشاش والمقص. جهّز الحقيبة حسب الإرشادات المحلية وافحص صلاحية محتوياتها بانتظام.', 'Useful basics include gloves, gauze, and shears. Follow local guidance and check kit supplies regularly.')} />}
      </div>}

      {game === 'danger' && <div className="space-y-4">
        <h3 className="text-lg font-bold">{L('أمّن المكان قبل الاقتراب', 'Make the scene safe first')}</h3><p className="text-sm text-muted-foreground">{L('مشهد توضيحي: اختر كل ما قد يعرّضك أو يعرّض المصاب للخطر.', 'Illustrated scene: select anything that could endanger you or the casualty.')}</p>
        <div className="relative mx-auto min-h-56 max-w-2xl overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-b from-sky-100 to-stone-100 p-4 dark:from-sky-950 dark:to-stone-900">
          <div className="absolute inset-x-0 bottom-7 h-12 -rotate-2 bg-stone-400/30" /><div className="absolute bottom-16 left-1/2 h-5 w-14 -translate-x-1/2 rounded-full bg-rose-500/70" />
          {dangerItems.map((item, index) => <button key={item.id} type="button" disabled={checked} aria-label={L(item.ar, item.en)} aria-pressed={danger.includes(item.id)} onClick={() => setDanger((old) => old.includes(item.id) ? old.filter((id) => id !== item.id) : [...old, item.id])} className={`absolute z-10 rounded-full border px-3 py-2 text-xs font-black shadow ${danger.includes(item.id) ? 'border-rose-600 bg-rose-600 text-white' : 'border-background bg-background/90 hover:border-primary'}`} style={{ top: `${12 + Math.floor(index / 2) * 50}%`, left: index % 2 ? '58%' : '7%' }}>{danger.includes(item.id) ? L(item.ar, item.en) : '؟'}</button>)}
          <span className="absolute bottom-2 end-3 rounded bg-background/80 px-2 py-1 text-xs">{L('مشهد تدريبي', 'Practice scene')}</span>
        </div><Button disabled={!danger.length || checked} onClick={() => { setChecked(true); if (dangerScore === dangerItems.length) void onComplete('danger'); }}>{L('تحقق من المخاطر', 'Check hazards')}</Button>
        {checked && <Feedback good={dangerScore === dangerItems.length} text={L('الأخطار الأربعة هي المرور والكهرباء والدخان والزجاج. لا تدخل منطقة غير آمنة؛ ابتعد واتصل بالطوارئ.', 'The four hazards are traffic, electricity, smoke, and broken glass. Do not enter an unsafe area; move away and call emergency services.')} />}
      </div>}

      {game === 'rhythm' && <div className="space-y-4 text-center">
        <h3 className="text-lg font-bold">{L('تحدي إيقاع ضغطات الصدر', 'CPR rhythm challenge')}</h3><p className="text-sm text-muted-foreground">{L('جرّب الحفاظ على إيقاع 100–120 ضغطة في الدقيقة لمدة 15 ثانية. المؤقت يقيس النقرات فقط؛ لا يقيس العمق أو جودة الضغطات.', 'Try to keep 100–120 taps per minute for 15 seconds. The timer counts taps only; it does not measure depth or compression quality.')}</p>
        <div className="mx-auto max-w-md rounded-2xl border bg-muted/30 p-5"><div className="mb-2 flex justify-center gap-2 text-3xl font-black"><HeartPulse className="h-9 w-9 text-rose-500" />{taps}</div><p className="mb-4 text-sm">{L('ضغطة تدريبية', 'practice taps')} · {seconds}s</p><Progress value={(seconds / 15) * 100} className="mb-4 h-2" />
          {!rhythmRunning && seconds === 15 ? <Button onClick={() => { setTaps(0); setSeconds(15); setRhythmRunning(true); }}>{L('ابدأ التحدي', 'Start challenge')}</Button> : seconds > 0 ? <Button className="h-20 w-20 rounded-full text-xl" onClick={() => setTaps((count) => count + 1)}>{L('اضغط', 'Tap')}</Button> : <div><b>{taps >= 25 && taps <= 30 ? L('إيقاع مناسب للتدريب!', 'Practice rhythm in range!') : L('جرّب مرة أخرى', 'Try again')}</b><div className="mt-2"><Button variant="outline" onClick={() => { setSeconds(15); setTaps(0); }}>{L('إعادة', 'Restart')}</Button></div></div>}
        </div><p className="text-xs text-muted-foreground">{L('في طوارئ حقيقية اتصل بـ123 واتبع تعليمات موظف الطوارئ. هذه المحاكاة لا تستبدل التدريب العملي على دمية.', 'In a real emergency call 123 and follow the dispatcher. This simulation does not replace hands-on manikin training.')}</p>
      </div>}

      {game === 'patient' && <div className="space-y-4">
        <h3 className="text-lg font-bold">{L('اسأل المريض الافتراضي', 'Interview the virtual patient')}</h3><div className="rounded-xl bg-primary/5 p-4"><p className="font-semibold">{L('أنا واعٍ لكن عندي ضغط وألم في صدري بدأ فجأة.', 'I am conscious, but I have sudden chest pressure and pain.')}</p></div>
        <div className="grid gap-2 sm:grid-cols-2">{[
          { id: 'breath', ar: 'هل لديك صعوبة في التنفس؟', en: 'Are you having trouble breathing?', responseAr: 'نعم، أشعر بضيق في التنفس.', responseEn: 'Yes, I feel short of breath.' },
          { id: 'start', ar: 'متى بدأ الألم؟', en: 'When did the pain start?', responseAr: 'بدأ منذ دقائق قليلة.', responseEn: 'It started a few minutes ago.' },
          { id: 'call', ar: 'هل أتصل بالطوارئ؟', en: 'Should I call emergency services?', responseAr: 'نعم، اتصل بـ123 الآن ولا تتركني وحدي.', responseEn: 'Yes, call 123 now and stay with me.' },
        ].map((q) => <Button key={q.id} variant={patientQuestion === q.id ? 'default' : 'outline'} onClick={() => { setPatientQuestion(q.id); if (q.id === 'call') void onComplete('patient'); }}>{L(q.ar, q.en)}</Button>)}</div>
        {patientQuestion && <Feedback good={patientQuestion === 'call'} text={L(({ breath: 'ضيق التنفس معلومة مهمة.', start: 'توقيت الأعراض معلومة مهمة.', call: 'ألم الصدر المفاجئ قد يكون طارئًا: اطلب المساعدة الطبية فورًا عبر 123، ولا تحاول تشخيص الحالة.' } as Record<string,string>)[patientQuestion], ({ breath: 'Shortness of breath is important information.', start: 'Symptom timing is important information.', call: 'Sudden chest pain may be an emergency: seek help now by calling 123. Do not try to diagnose.' } as Record<string,string>)[patientQuestion])} />}
      </div>}

      {game === 'detective' && <div className="space-y-4">
        <h3 className="text-lg font-bold">{L('المحقق الطبي: لاحظ العلامات', 'Medical detective: notice the signs')}</h3><div className="rounded-xl border p-4"><p>{L('شخص لديه ضعف مفاجئ في أحد جانبي الوجه والذراع، وبدأ كلامه متثاقلاً منذ دقائق.', 'A person has sudden weakness on one side of the face and arm, and their speech became slurred minutes ago.')}</p></div>
        <p className="text-sm font-semibold">{L('ما التصرف الأكثر أمانًا؟', 'What is the safest response?')}</p><div className="grid gap-2 sm:grid-cols-2">{[
          { id: 'emergency', ar: 'اتصل بـ123 فورًا وسجّل وقت بدء الأعراض', en: 'Call 123 immediately and note when symptoms began' },
          { id: 'wait', ar: 'انتظر لترى هل تختفي الأعراض', en: 'Wait to see if symptoms go away' },
          { id: 'food', ar: 'أعطه طعامًا أو شرابًا', en: 'Give food or drink' },
        ].map((choice) => <Button key={choice.id} variant={detectiveAnswer === choice.id ? 'default' : 'outline'} onClick={() => { setDetectiveAnswer(choice.id); if (choice.id === 'emergency') void onComplete('detective'); }}>{L(choice.ar, choice.en)}</Button>)}</div>
        {detectiveAnswer && <Feedback good={detectiveAnswer === 'emergency'} text={L('هذه علامات محتملة لسكتة دماغية. اتصل بالطوارئ فورًا ولا تعطِ المصاب طعامًا أو شرابًا. هذا تمرين استجابة وليس تشخيصًا.', 'These may be signs of a stroke. Call emergency services immediately and do not give food or drink. This is a response exercise, not a diagnosis.')} />}
      </div>}

      {game === 'cards' && <div className="space-y-4">
        <h3 className="text-lg font-bold">{L('بطاقات ذاكرة بمراجعة ذكية', 'Smart review flashcards')}</h3><p className="text-sm text-muted-foreground">{L(`بطاقة ${cardIndex + 1} من ${cards.length} · البطاقات التي تخطئ فيها ستعود في نهاية الجولة.`, `Card ${cardIndex + 1} of ${cards.length} · missed cards return at the end of the round.`)}</p>
        <button type="button" className="min-h-44 w-full rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-amber-500/10 p-6 text-start" onClick={() => setShowAnswer((value) => !value)}><p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{showAnswer ? L('الإجابة', 'Answer') : L('السؤال · اضغط لقلب البطاقة', 'Question · tap to flip')}</p><p className="text-lg font-bold">{showAnswer ? (ar ? card.stepsAr[0] : card.stepsEn[0]) : (ar ? `ما أول إجراء في درس: ${card.titleAr}؟` : `What is the first action in: ${card.titleEn}?`)}</p></button>
        {showAnswer && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setMissedCards((old) => [...old, cardIndex]); setCardResult('review'); }}>{L('أعدها لاحقًا', 'Review again')}</Button><Button onClick={() => { setCardResult('known'); void onComplete('cards'); }}>{L('أتقنتها', 'I know it')}</Button></div>}
        {cardResult && <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{cardResult === 'review' ? L('سنراجع هذه البطاقة ثانيةً.', 'This card will return for review.') : L('أحسنت! راجع المصدر المرتبط بالدرس.', 'Great! Review the lesson source.')}</span><Button size="sm" onClick={() => { const next = cardIndex + 1; if (next >= cards.length && missedCards.length) { setCardIndex(missedCards[0]); setMissedCards((old) => old.slice(1)); } else setCardIndex(next % cards.length); setShowAnswer(false); setCardResult(null); }}>{L('البطاقة التالية', 'Next card')}</Button></div>}
      </div>}
    </CardContent>
  </Card>;
}

function Feedback({ good, text }: { good: boolean; text: string }) {
  return <div className={`rescue-feedback rounded-xl border bg-muted/30 p-4 ${good ? 'rescue-feedback-good' : ''}`} role="status"><b>{good ? '✓ ' : '↻ '}{good ? 'أحسنت · Good job' : 'راجع الاختيارات · Review your choice'}</b><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}
