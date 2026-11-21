import { useEffect, useRef, useState } from 'react';
import { Heart, Timer, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FirstAidGameId } from '@/hooks/useFirstAidProgress';

type Choice = { ar: string; en: string; correct: boolean };
type RunnerQuestion = {
  promptAr: string;
  promptEn: string;
  explanationAr: string;
  explanationEn: string;
  source: string;
  choices: Choice[];
};

const QUESTIONS: RunnerQuestion[] = [
  {
    promptAr: 'قبل ما تقرب من مصاب في الشارع، أول خطوة إيه؟',
    promptEn: 'Before approaching someone injured in the street, what comes first?',
    explanationAr: 'تأكد من أمان المكان لك وللمصاب، واطلب المساعدة. لا تدخل طريقًا أو مكانًا خطرًا.',
    explanationEn: 'Check that the scene is safe for you and the casualty, and call for help. Do not enter a dangerous area.',
    source: 'IFRC First Aid Guidelines',
    choices: [
      { ar: 'أتأكد من أمان المكان أولًا', en: 'Check the scene is safe first', correct: true },
      { ar: 'أجري للمصاب فورًا دون النظر حولي', en: 'Run straight to the person without looking around', correct: false },
      { ar: 'أحرك المصاب بعيدًا بنفسي', en: 'Move the injured person by myself', correct: false },
    ],
  },
  {
    promptAr: 'شخص اتعرض لحرق حراري بسيط. أعمل إيه أولًا؟',
    promptEn: 'Someone has a thermal burn. What should you do first?',
    explanationAr: 'برّد الحرق بمياه جارية نظيفة وباردة، ولا تضع الثلج أو الزبدة عليه. اطلب المساعدة للحروق الكبيرة أو الخطيرة.',
    explanationEn: 'Cool the burn with clean, cool running water. Do not use ice or butter. Seek help for large or serious burns.',
    source: 'American Red Cross: Burns',
    choices: [
      { ar: 'أضع زبدة أو معجون أسنان', en: 'Apply butter or toothpaste', correct: false },
      { ar: 'أضع الثلج مباشرة على الجلد', en: 'Put ice directly on the skin', correct: false },
      { ar: 'أمرر مياهًا جارية باردة ونظيفة', en: 'Use clean, cool running water', correct: true },
    ],
  },
  {
    promptAr: 'نزيف شديد من جرح في الذراع. ما التصرف الآمن؟',
    promptEn: 'There is severe bleeding from an arm wound. What is a safe action?',
    explanationAr: 'اضغط مباشرة وباستمرار على موضع النزيف بضمادة أو قطعة قماش نظيفة، واتصل بالإسعاف 123 للحالة الشديدة.',
    explanationEn: 'Apply firm, continuous direct pressure with a clean dressing or cloth, and call emergency services (123) for severe bleeding.',
    source: 'IFRC First Aid Guidelines',
    choices: [
      { ar: 'أضغط مباشرة على الجرح بضمادة نظيفة وأطلب المساعدة', en: 'Press the wound with a clean dressing and get help', correct: true },
      { ar: 'أرفع الضمادة كل ثوانٍ لأفحص النزيف', en: 'Lift the dressing every few seconds to check', correct: false },
      { ar: 'أغسل الجرح وأتركه ينزف', en: 'Rinse the wound and let it keep bleeding', correct: false },
    ],
  },
  {
    promptAr: 'شخص انهار ولا يستجيب ولا يتنفس طبيعيًا. ما أول تصرف؟',
    promptEn: 'A person collapses, is unresponsive, and is not breathing normally. What comes first?',
    explanationAr: 'اطلب من شخص الاتصال بالإسعاف 123 وإحضار جهاز AED إن توفر. ابدأ ضغطات الصدر واتبع تعليمات موظف الطوارئ.',
    explanationEn: 'Ask someone to call emergency services (123) and get an AED if available. Start chest compressions and follow the dispatcher.',
    source: 'American Heart Association: Hands-Only CPR',
    choices: [
      { ar: 'أتركه وحده وأبحث عن ماء', en: 'Leave them alone to find water', correct: false },
      { ar: 'أطلب الإسعاف 123 وأبدأ الاستجابة المناسبة', en: 'Call 123 and begin the appropriate response', correct: true },
      { ar: 'أنتظر دقائق لأرى إن كان سيستيقظ', en: 'Wait a few minutes to see if they wake', correct: false },
    ],
  },
  {
    promptAr: 'في حادث، فين تتصل لو الحالة خطيرة في مصر؟',
    promptEn: 'At a serious emergency in Egypt, what number should you call?',
    explanationAr: 'اتصل بالإسعاف المصري على 123، واذكر الموقع بوضوح واتبع تعليمات موظف الطوارئ.',
    explanationEn: 'Call the Egyptian ambulance service at 123, state the location clearly, and follow the dispatcher’s instructions.',
    source: 'Egyptian Ambulance Organization',
    choices: [
      { ar: '123 الإسعاف', en: '123 ambulance', correct: true },
      { ar: 'أنتظر حتى يتصرف المارّة', en: 'Wait for bystanders to decide', correct: false },
      { ar: 'أنقل المصاب بنفسي دائمًا', en: 'Always transport the person myself', correct: false },
    ],
  },
];

const SOURCES: Record<string, string> = {
  'IFRC First Aid Guidelines': 'https://www.ifrc.org/sites/default/files/2022-02/EN_GFARC_GUIDELINES_2020.pdf',
  'American Red Cross: Burns': 'https://www.redcross.org/take-a-class/resources/learn-first-aid/burns',
  'American Heart Association: Hands-Only CPR': 'https://cpr.heart.org/en/cpr-courses-and-kits/hands-only-cpr/',
  'Egyptian Ambulance Organization': 'https://eao.gov.eg/home',
};

const shuffleChoices = (choices: Choice[]) => [...choices].sort(() => Math.random() - 0.5);

export function FirstAidRunnerGame({ onComplete }: { onComplete: (gameId: FirstAidGameId) => Promise<unknown> }) {
  const { L } = useLanguage();
  const [phase, setPhase] = useState<'ready' | 'running' | 'feedback' | 'won' | 'lost'>('ready');
  const [round, setRound] = useState(0);
  const [choices, setChoices] = useState<Choice[]>(() => shuffleChoices(QUESTIONS[0].choices));
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(7);
  const [result, setResult] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const answerLocked = useRef(false);
  const rewardClaimed = useRef(false);
  const question = QUESTIONS[round];

  useEffect(() => {
    if (phase !== 'running') return;
    const deadline = Date.now() + 7000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !answerLocked.current) {
        answerLocked.current = true;
        setResult('timeout');
        setLives((current) => Math.max(0, current - 1));
        setPhase('feedback');
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, round]);

  const startRun = () => {
    answerLocked.current = false;
    rewardClaimed.current = false;
    setRound(0);
    setChoices(shuffleChoices(QUESTIONS[0].choices));
    setLives(3);
    setScore(0);
    setSeconds(7);
    setResult(null);
    setPhase('running');
  };

  const answer = (choice: Choice) => {
    if (phase !== 'running' || answerLocked.current) return;
    answerLocked.current = true;
    setResult(choice.correct ? 'correct' : 'wrong');
    if (choice.correct) {
      setScore((current) => current + 10);
      if (!rewardClaimed.current) {
        rewardClaimed.current = true;
        void onComplete('runner');
      }
    } else {
      setLives((current) => Math.max(0, current - 1));
    }
    setPhase('feedback');
  };

  const continueRun = () => {
    if (lives <= 0) {
      setPhase('lost');
      return;
    }
    if (round + 1 >= QUESTIONS.length) {
      setPhase('won');
      return;
    }
    const nextRound = round + 1;
    answerLocked.current = false;
    setRound(nextRound);
    setChoices(shuffleChoices(QUESTIONS[nextRound].choices));
    setSeconds(7);
    setResult(null);
    setPhase('running');
  };

  const ar = (textAr: string, textEn: string) => L(textAr, textEn);
  const isJumping = phase === 'feedback' && result === 'correct';

  return (
    <section className="space-y-4" aria-label={ar('لعبة عداء الإنقاذ', 'Rescue runner game')}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border bg-background/80 p-2"><span className="block text-xs text-muted-foreground">{ar('المسار', 'Course')}</span><b>{Math.min(round + (phase === 'won' ? 1 : 0), QUESTIONS.length)} / {QUESTIONS.length}</b></div>
        <div className="rounded-xl border bg-background/80 p-2"><span className="block text-xs text-muted-foreground">{ar('النقاط', 'Score')}</span><b className="inline-flex items-center gap-1 text-amber-600"><Zap className="h-4 w-4" />{score}</b></div>
        <div className="rounded-xl border bg-background/80 p-2"><span className="block text-xs text-muted-foreground">{ar('الحياة', 'Lives')}</span><span className="flex justify-center gap-1" aria-label={ar(`${lives} حيوات`, `${lives} lives`)}>{[0, 1, 2].map((heart) => <Heart key={heart} className={`h-5 w-5 ${heart < lives ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground/40'}`} />)}</span></div>
      </div>

      <div className={`runner-track relative overflow-hidden rounded-2xl border border-sky-300/40 bg-gradient-to-b from-sky-400/20 via-sky-200/10 to-amber-500/10 p-4 ${isJumping ? 'runner-track-jump' : ''}`}>
        <div className="absolute inset-x-0 bottom-5 h-1 rounded-full bg-amber-700/40" />
        <div className="runner-lane absolute inset-x-0 bottom-4 h-6 border-t-2 border-dashed border-amber-700/30" />
        <div className={`runner-character relative z-10 text-5xl ${phase === 'running' ? 'runner-character-running' : ''} ${isJumping ? 'runner-character-jump' : ''}`} aria-hidden="true">🏃</div>
        <div className={`runner-obstacle absolute bottom-6 end-[18%] text-4xl ${phase === 'running' ? 'runner-obstacle-moving' : ''}`} aria-hidden="true">🪨</div>
        <p className="relative z-10 mt-3 text-xs font-semibold text-muted-foreground">{ar('أجب قبل الاصطدام بالعقبة!', 'Answer before you hit the obstacle!')}</p>
      </div>

      {phase === 'ready' ? (
        <div className="rounded-2xl border bg-primary/5 p-5 text-center">
          <h3 className="text-xl font-black">{ar('عداء الإنقاذ', 'Rescue Runner')}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{ar('قبل كل قفزة يظهر سؤال بثلاثة اختيارات. لديك ٧ ثوانٍ. الإجابة الصحيحة تقفز بك وتضيف ١٠ نقاط، والخطأ أو انتهاء الوقت يخصم حياة ويشرح المعلومة.', 'A three-choice first-aid question appears before each jump. You have 7 seconds. A correct answer jumps over the obstacle and adds 10 points; a wrong answer or timeout costs a life and explains the fact.')}</p>
          <Button className="mt-4" onClick={startRun}><Zap className="me-2 h-4 w-4" />{ar('ابدأ الجري', 'Start running')}</Button>
        </div>
      ) : phase === 'won' || phase === 'lost' ? (
        <div className={`rounded-2xl border p-5 text-center ${phase === 'won' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`} role="status">
          <Trophy className={`mx-auto h-8 w-8 ${phase === 'won' ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <h3 className="mt-2 text-xl font-black">{phase === 'won' ? ar('وصلت لخط النهاية!', 'You reached the finish!') : ar('انتهت المحاولة', 'Run over')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ar(`جمعت ${score} نقطة في الجري.`, `You scored ${score} runner points.`)} {ar('النقاط اليومية للعبة تُحتسب مرة واحدة.', 'Daily game XP is awarded once.')}</p>
          <Button variant="outline" className="mt-4" onClick={startRun}>{ar('العب مرة أخرى', 'Run again')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <Timer className={`h-5 w-5 ${seconds <= 2 ? 'text-destructive' : 'text-primary'}`} />
            <div className="min-w-0 flex-1"><p className="font-bold">{ar(question.promptAr, question.promptEn)}</p><Progress value={(seconds / 7) * 100} className="mt-2 h-2" aria-label={ar('الوقت المتبقي للسؤال', 'Question time remaining')} /></div>
            <b className={`min-w-8 text-center text-2xl tabular-nums ${seconds <= 2 ? 'text-destructive' : ''}`}>{seconds}</b>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {choices.map((choice, index) => (
              <Button key={`${round}-${index}`} type="button" variant="outline" disabled={phase !== 'running'} className="h-auto min-h-16 justify-start whitespace-normal p-3 text-start" onClick={() => answer(choice)}>
                <span className="me-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary">{String.fromCharCode(65 + index)}</span>
                <span>{ar(choice.ar, choice.en)}</span>
              </Button>
            ))}
          </div>

          {phase === 'feedback' && result && (
            <div className={`rounded-xl border p-4 ${result === 'correct' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`} role="status">
              <p className="font-bold">{result === 'correct' ? ar('قفزة ناجحة! +١٠ نقاط', 'Great jump! +10 points') : result === 'timeout' ? ar('انتهى الوقت وخسرت حياة', 'Time ran out; you lost a life') : ar('إجابة غير صحيحة وخسرت حياة', 'Incorrect answer; you lost a life')}</p>
              <p className="mt-1 text-sm leading-6">{ar(question.explanationAr, question.explanationEn)}</p>
              {result !== 'correct' && (
                <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {ar('الإجابة الصحيحة: ', 'Correct answer: ')}
                  {ar(question.choices.find((choice) => choice.correct)?.ar ?? '', question.choices.find((choice) => choice.correct)?.en ?? '')}
                </p>
              )}
              <a className="mt-2 inline-block text-xs font-semibold text-primary underline" href={SOURCES[question.source]} target="_blank" rel="noreferrer">{ar(`المصدر: ${question.source}`, `Source: ${question.source}`)}</a>
              <div><Button className="mt-3" size="sm" onClick={continueRun}>{ar(lives <= 0 ? 'عرض النتيجة' : round + 1 === QUESTIONS.length ? 'إنهاء المسار' : 'تابع الجري', lives <= 0 ? 'See result' : round + 1 === QUESTIONS.length ? 'Finish course' : 'Keep running')}</Button></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
