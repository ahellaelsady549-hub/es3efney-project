import { useEffect, useRef, useState } from 'react';
import { Heart, Timer, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FirstAidGameId } from '@/hooks/useFirstAidProgress';

type Choice = { ar: string; en: string; correct: boolean };
type ObstacleKind = 'barrier' | 'flame' | 'medical-crate' | 'debris' | 'cone';
type RunnerQuestion = {
  promptAr: string;
  promptEn: string;
  explanationAr: string;
  explanationEn: string;
  source: string;
  obstacle: ObstacleKind;
  choices: Choice[];
};

const QUESTIONS: RunnerQuestion[] = [
  {
    promptAr: 'قبل ما تقرب من مصاب في الشارع، أول خطوة إيه؟',
    promptEn: 'Before approaching someone injured in the street, what comes first?',
    explanationAr: 'تأكد من أمان المكان لك وللمصاب، واطلب المساعدة. لا تدخل طريقًا أو مكانًا خطرًا.',
    explanationEn: 'Check that the scene is safe for you and the casualty, and call for help. Do not enter a dangerous area.',
    source: 'IFRC First Aid Guidelines',
    obstacle: 'barrier',
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
    obstacle: 'flame',
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
    obstacle: 'medical-crate',
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
    obstacle: 'debris',
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
    obstacle: 'cone',
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

const ObstacleModel = ({ kind }: { kind: ObstacleKind }) => {
  if (kind === 'barrier') return (
    <svg viewBox="0 0 140 104" className="runner-obstacle-model" role="img" aria-label="Road barrier">
      <ellipse cx="70" cy="94" rx="59" ry="8" fill="#0f172a" opacity=".42" />
      <path d="M28 61h12v25H28zM100 61h12v25h-12z" fill="#334155" stroke="#0f172a" strokeWidth="3" />
      <path d="M18 82h31v8H15zM91 82h31v8H91z" fill="#475569" />
      <path d="m17 32 11-10h87v36l-10 10H17z" fill="#c2410c" stroke="#7c2d12" strokeWidth="4" />
      <path d="m28 22 87 0v36H28z" fill="#f97316" />
      <path d="m34 56 21-34h17L51 56zM70 58l21-36h17L87 58z" fill="#fef3c7" />
      <path d="m115 22 12 10v35l-12-9z" fill="#9a3412" stroke="#7c2d12" strokeWidth="3" />
      <path d="M24 32h7M49 32h7M74 32h7M99 32h7" stroke="#fef08a" strokeWidth="5" strokeLinecap="round" />
      <circle cx="31" cy="58" r="3" fill="#7c2d12" /><circle cx="109" cy="58" r="3" fill="#7c2d12" />
    </svg>
  );
  if (kind === 'flame') return (
    <svg viewBox="0 0 100 100" className="runner-obstacle-model" role="img" aria-label="Flames">
      <ellipse cx="50" cy="88" rx="36" ry="7" fill="#0f172a" opacity=".35" />
      <path d="M50 10c5 18-12 21-3 36 4-10 12-11 12-23 17 18 25 29 21 44-3 15-15 24-30 24S21 82 20 67c-1-13 7-23 17-35-2 15 5 17 9 18 8-11 3-24 4-40Z" fill="#ef4444" />
      <path d="M52 42c2 12-8 17-4 27 2-5 8-6 8-14 8 10 11 16 8 23-2 7-8 11-15 11-8 0-14-5-15-12-1-7 4-13 10-19 0 7 4 9 6 9 4-7 1-15 2-25Z" fill="#fbbf24" />
      <path d="M49 66c5 5 8 9 7 14-1 4-4 6-8 6s-7-3-7-7c0-4 3-8 8-13Z" fill="#fff7ed" />
    </svg>
  );
  if (kind === 'medical-crate') return (
    <svg viewBox="0 0 110 100" className="runner-obstacle-model" role="img" aria-label="Medical supply box">
      <ellipse cx="54" cy="89" rx="39" ry="7" fill="#0f172a" opacity=".35" />
      <path d="m20 29 15-12h57L78 29z" fill="#a7f3d0" stroke="#047857" strokeWidth="3" />
      <path d="M20 29h58v52H20z" fill="#10b981" stroke="#047857" strokeWidth="3" />
      <path d="m78 29 14-12v51L78 81z" fill="#047857" stroke="#065f46" strokeWidth="3" />
      <path d="M43 38h13v10h10v13H56v10H43V61H33V48h10z" fill="#f8fafc" />
    </svg>
  );
  if (kind === 'debris') return (
    <svg viewBox="0 0 120 90" className="runner-obstacle-model" role="img" aria-label="Road debris">
      <ellipse cx="60" cy="79" rx="48" ry="7" fill="#0f172a" opacity=".35" />
      <path d="m12 62 12-22 20-5 9-20 18 8 11-8 23 20 3 24-18 10-28-4-20 9-21-4z" fill="#64748b" stroke="#334155" strokeWidth="4" />
      <path d="m44 35 9 10-8 10-14-5zM70 26l11 8-7 12-13-4zM82 57l15-3 2 11-17 6z" fill="#94a3b8" opacity=".8" />
      <path d="m23 61 15 3M59 66l12-6" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 90 110" className="runner-obstacle-model" role="img" aria-label="Road cone">
      <ellipse cx="45" cy="98" rx="33" ry="7" fill="#0f172a" opacity=".35" />
      <path d="m29 78 15-57 17 57z" fill="#f97316" stroke="#9a3412" strokeWidth="4" />
      <path d="m34 60 22 2-4 13H31z" fill="#f8fafc" />
      <path d="M18 78h54v14H18z" fill="#ea580c" stroke="#9a3412" strokeWidth="4" />
      <path d="m44 30 5 0" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

const HospitalBuilding = ({ side }: { side: 'left' | 'right' }) => (
  <svg viewBox="0 0 180 150" className={`runner-hospital runner-hospital-${side}`} aria-hidden="true">
    <ellipse cx="90" cy="142" rx="80" ry="6" fill="#0f172a" opacity=".23" />
    <path d="M22 45 48 28h111v99H22z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />
    <path d="m22 45 26-17v99l-26-6z" fill="#cbd5e1" />
    <path d="M48 28h111v18H48z" fill="#0ea5e9" />
    <path d="M63 19h77v9H63z" fill="#0369a1" />
    <rect x="80" y="55" width="49" height="25" rx="4" fill="#fff" stroke="#bae6fd" strokeWidth="2" />
    <path d="M99 59h10v7h7v9h-7v7H99v-7h-7v-9h7z" fill="#ef4444" />
    <path d="M57 57h14v18H57zM137 57h13v18h-13zM57 88h14v18H57zM137 88h13v18h-13z" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="2" />
    <path d="M86 98h26v29H86z" fill="#0f766e" />
    <path d="M89 101h20v7H89z" fill="#ccfbf1" />
    <path d="M43 119h117" stroke="#e2e8f0" strokeWidth="5" />
    <text x="103" y="96" textAnchor="middle" fontSize="7" fontWeight="800" fill="#0f172a">HOSPITAL</text>
  </svg>
);

const RunnerAvatar = ({ lane, className = '' }: { lane: number; className?: string }) => (
  <svg viewBox="0 0 100 150" className={`runner-avatar ${className}`} style={{ left: `${50 + lane * 18}%` }} aria-hidden="true">
    <ellipse cx="50" cy="143" rx="26" ry="5" fill="#0f172a" opacity=".38" />
    <g className="runner-leg runner-leg-left">
      <path d="M39 99 36 122 27 137q-1 5 5 5h18l5-8-7-13 8-18z" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
      <path d="M30 136h18l6 5q1 4-3 5H26q-4-2 0-7z" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
      <path d="M28 143h23" stroke="#0ea5e9" strokeWidth="3" />
    </g>
    <g className="runner-leg runner-leg-right">
      <path d="m59 99 6 21 12 13q4 5-2 8H57l-8-8 5-13-8-20z" fill="#334155" stroke="#0f172a" strokeWidth="3" />
      <path d="M58 135h18l9 5q2 4-3 5H59q-5-2-1-7z" fill="#f8fafc" stroke="#334155" strokeWidth="3" />
      <path d="M59 142h25" stroke="#0ea5e9" strokeWidth="3" />
    </g>
    <path d="M35 56q15-10 31 0l8 40q-22 14-48 0z" fill="#0ea5e9" stroke="#075985" strokeWidth="4" />
    <path d="m42 63 8 8 8-8M50 71v24" fill="none" stroke="#e0f2fe" strokeWidth="4" strokeLinejoin="round" />
    <path d="M43 80h14" stroke="#facc15" strokeWidth="5" />
    <g className="runner-arm runner-arm-left"><path d="m39 61-13 15-6 17q-1 6 5 7 5 1 7-5l10-17" fill="#f0b18f" stroke="#9a5f47" strokeWidth="4" strokeLinecap="round" /></g>
    <g className="runner-arm runner-arm-right"><path d="m63 61 13 14 7 17q1 6-5 8-5 1-7-5L60 78" fill="#f0b18f" stroke="#9a5f47" strokeWidth="4" strokeLinecap="round" /></g>
    <path d="M47 54v39M53 55v39" stroke="#bae6fd" strokeWidth="3" opacity=".75" />
    <path d="M35 62q15 13 31 0" fill="none" stroke="#7dd3fc" strokeWidth="3" opacity=".8" />
    <g className="runner-head">
      <path d="M37 37q2-19 17-21 17 1 18 21l-5 16q-11 10-24 0z" fill="#a56647" stroke="#713f2c" strokeWidth="4" />
      <path d="M35 37q0-24 19-25 19 1 20 25-8-8-18-8-10 8-21 8z" fill="#1e293b" stroke="#0f172a" strokeWidth="4" />
      <path d="M45 27q11-10 23 0" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      <path d="M61 37q4-3 8 0M62 40q3 2 5 0M68 43l4 2-4 2M62 48q4 3 7 0" fill="none" stroke="#351f1c" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="68" cy="39" r="1.1" fill="#0f172a" />
      <path d="M55 35q5-4 10-1" fill="none" stroke="#713f2c" strokeWidth="2" strokeLinecap="round" />
      <path d="M41 39q1 5 5 4" fill="none" stroke="#d99a72" strokeWidth="3" strokeLinecap="round" />
    </g>
    <path d="M39 98q11 6 23 0" stroke="#f8fafc" strokeWidth="3" opacity=".75" />
  </svg>
);

const RunnerCoin = ({ lane }: { lane: number }) => (
  <svg viewBox="0 0 64 64" className="runner-coin" style={{ left: `${50 + lane * 18}%` }} role="img" aria-label="Coin">
    <ellipse cx="34" cy="36" rx="23" ry="25" fill="#b45309" />
    <ellipse cx="31" cy="30" rx="23" ry="25" fill="url(#rescue-coin-face)" stroke="#fef3c7" strokeWidth="3" />
    <ellipse cx="31" cy="30" rx="17" ry="19" fill="none" stroke="#f59e0b" strokeWidth="3" />
    <path d="M28 17h7v8h8v8h-8v9h-7v-9h-8v-8h8z" fill="#b45309" />
    <defs><linearGradient id="rescue-coin-face" x1="13" x2="51" y1="10" y2="52" gradientUnits="userSpaceOnUse"><stop stopColor="#fef08a" /><stop offset=".48" stopColor="#fbbf24" /><stop offset="1" stopColor="#d97706" /></linearGradient></defs>
  </svg>
);

export function FirstAidRunnerGame({ onComplete }: { onComplete: (gameId: FirstAidGameId) => Promise<unknown> }) {
  const { L } = useLanguage();
  const [phase, setPhase] = useState<'ready' | 'running' | 'feedback' | 'won' | 'lost'>('ready');
  const [round, setRound] = useState(0);
  const [choices, setChoices] = useState<Choice[]>(() => shuffleChoices(QUESTIONS[0].choices));
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [runCoins, setRunCoins] = useState(0);
  const [coinWave, setCoinWave] = useState(0);
  const [lane, setLane] = useState(0);
  const [coinLane, setCoinLane] = useState(0);
  const [seconds, setSeconds] = useState(7);
  const [result, setResult] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const answerLocked = useRef(false);
  const rewardClaimed = useRef(false);
  const laneRef = useRef(0);
  const question = QUESTIONS[round];

  useEffect(() => {
    if (phase !== 'running') return;
    const deadline = Date.now() + 7000;
    const pendingCoinPickups = new Set<number>();
    const spawnCoin = () => {
      const incomingLane = Math.floor(Math.random() * 3) - 1;
      setCoinLane(incomingLane);
      setCoinWave((current) => current + 1);
      const pickupTimeout = window.setTimeout(() => {
        pendingCoinPickups.delete(pickupTimeout);
        if (laneRef.current === incomingLane) setRunCoins((current) => current + 1);
      }, 1120);
      pendingCoinPickups.add(pickupTimeout);
    };
    spawnCoin();
    const coinPickupTimer = window.setInterval(spawnCoin, 1450);
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
    return () => {
      window.clearInterval(timer);
      window.clearInterval(coinPickupTimer);
      pendingCoinPickups.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [phase, round]);

  useEffect(() => {
    if (phase !== 'running') return;
    const move = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!['arrowleft', 'arrowright', 'a', 'd'].includes(key)) return;
      event.preventDefault();
      const direction = key === 'arrowleft' || key === 'a' ? -1 : 1;
      const nextLane = Math.max(-1, Math.min(1, laneRef.current + direction));
      laneRef.current = nextLane;
      setLane(nextLane);
    };
    window.addEventListener('keydown', move);
    return () => window.removeEventListener('keydown', move);
  }, [phase]);

  const moveToLane = (nextLane: number) => {
    const boundedLane = Math.max(-1, Math.min(1, nextLane));
    laneRef.current = boundedLane;
    setLane(boundedLane);
  };

  const startRun = () => {
    answerLocked.current = false;
    rewardClaimed.current = false;
    setRound(0);
    setChoices(shuffleChoices(QUESTIONS[0].choices));
    setLives(3);
    setScore(0);
    setRunCoins(0);
    laneRef.current = 0;
    setLane(0);
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
      setRunCoins((current) => current + 1);
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
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-xl border bg-background/80 p-2"><span className="block text-xs text-muted-foreground">{ar('المسار', 'Course')}</span><b>{Math.min(round + (phase === 'won' ? 1 : 0), QUESTIONS.length)} / {QUESTIONS.length}</b></div>
        <div className="rounded-xl border bg-background/80 p-2"><span className="block text-xs text-muted-foreground">{ar('النقاط', 'Score')}</span><b className="inline-flex items-center gap-1 text-amber-600"><Zap className="h-4 w-4" />{score}</b></div>
        <div className="runner-coin-counter rounded-xl border bg-background/80 p-2"><span className="block text-xs text-muted-foreground">{ar('الكوينز المجموعة', 'Coins collected')}</span><b className="inline-flex items-center gap-1 text-amber-600"><span aria-hidden="true">🪙</span>{runCoins}</b></div>
        <div className="rounded-xl border bg-background/80 p-2"><span className="block text-xs text-muted-foreground">{ar('الحياة', 'Lives')}</span><span className="flex justify-center gap-1" aria-label={ar(`${lives} حيوات`, `${lives} lives`)}>{[0, 1, 2].map((heart) => <Heart key={heart} className={`h-5 w-5 ${heart < lives ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground/40'}`} />)}</span></div>
      </div>

      <div className={`runner-world relative overflow-hidden rounded-2xl border border-sky-300/40 bg-gradient-to-b from-sky-400/35 via-sky-200/15 to-amber-500/15 ${phase === 'running' ? 'runner-world-running' : ''} ${isJumping ? 'runner-track-jump' : ''} ${phase === 'feedback' && result !== 'correct' ? 'runner-world-crash' : ''}`}>
        <div className="runner-sun absolute end-[16%] top-4 h-12 w-12 rounded-full bg-amber-200/70 blur-[1px]" aria-hidden="true" />
        <div className="runner-mountains absolute inset-x-0 top-10 h-20" aria-hidden="true" />
        <div className="runner-city-sides absolute inset-0" aria-hidden="true"><HospitalBuilding side="left" /><HospitalBuilding side="right" /></div>
        <div className="runner-road absolute inset-x-0 bottom-[-38%] h-[92%]" aria-hidden="true">
          <div className="runner-road-edge" />
          <div className="runner-road-lane runner-road-lane-left" />
          <div className="runner-road-lane runner-road-lane-right" />
          <div className="runner-road-dashes" />
        </div>
        <div className="runner-world-label absolute start-3 top-3 rounded-full border border-white/30 bg-slate-950/45 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">{ar('عالم الإنقاذ · المرحلة ', 'Rescue world · Stage ')}{round + 1}</div>
        {phase === 'running' && (
          <div className="runner-question-board" aria-live="polite">
            <div className="mb-2 flex items-center gap-2">
              <Timer className={`h-4 w-4 shrink-0 ${seconds <= 2 ? 'text-rose-600' : 'text-sky-700'}`} />
              <p className="min-w-0 flex-1 text-sm font-black leading-5 text-slate-900">{ar(question.promptAr, question.promptEn)}</p>
              <b className={`min-w-8 text-center text-xl tabular-nums ${seconds <= 2 ? 'text-rose-600' : 'text-slate-800'}`}>{seconds}</b>
            </div>
            <Progress value={(seconds / 7) * 100} className="mb-2 h-1.5" aria-label={ar('الوقت المتبقي للسؤال', 'Question time remaining')} />
            <div className="grid grid-cols-3 gap-1.5">
              {choices.map((choice, index) => (
                <Button key={`${round}-${index}`} type="button" variant="outline" disabled={phase !== 'running'} onClick={() => answer(choice)} className="runner-answer-choice h-auto min-h-14 justify-start whitespace-normal p-2 text-start">
                  <span className="me-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">{String.fromCharCode(65 + index)}</span>
                  <span>{ar(choice.ar, choice.en)}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="runner-character"><RunnerAvatar lane={lane} className={`${phase === 'running' ? 'runner-avatar-running' : ''} ${isJumping ? 'runner-avatar-jump' : ''}`} /></div>
        {phase === 'running' && (
          <div className="runner-coin-stream absolute inset-0 z-10 pointer-events-none" aria-hidden="true">
            <RunnerCoin key={coinWave} lane={coinLane} />
          </div>
        )}
        <div key={`obstacle-${round}`} className={`runner-obstacle ${phase === 'running' ? 'runner-obstacle-moving' : ''} ${isJumping ? 'runner-obstacle-cleared' : ''} ${phase === 'feedback' && result !== 'correct' ? 'runner-obstacle-hit' : ''}`} aria-hidden="true"><ObstacleModel kind={question.obstacle} /></div>
        {phase === 'feedback' && result !== 'correct' && <div className="runner-crash-flash absolute inset-0 z-20" aria-hidden="true" />}
        <div className="runner-world-label runner-world-label-bottom absolute bottom-2 start-3 z-20 rounded-md bg-slate-950/50 px-2 py-1 text-[10px] font-bold text-white">{ar('منظور المسعف', 'Responder view')}</div>
        <p className="absolute bottom-2 end-3 z-20 text-[11px] font-semibold text-slate-800 dark:text-slate-100">{ar('اختر المسار واجب عن السؤال!', 'Change lanes and answer!')}</p>
      </div>

      <div className="grid grid-cols-3 gap-2" aria-label={ar('تحريك المسعف بين المسارات', 'Move the runner between lanes')}>
        {[-1, 0, 1].map((targetLane) => <Button key={targetLane} type="button" variant={lane === targetLane ? 'default' : 'outline'} size="sm" disabled={phase !== 'running'} onClick={() => moveToLane(targetLane)} className="h-10">{targetLane === -1 ? ar('مسار يسار', 'Left lane') : targetLane === 0 ? ar('الوسط', 'Center') : ar('مسار يمين', 'Right lane')}</Button>)}
      </div>

      {phase === 'feedback' && result && (
        <div className={`rounded-xl border p-4 ${result === 'correct' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`} role="status">
          <p className="font-bold">{result === 'correct' ? ar('قفزة ناجحة! +١٠ نقاط +١ كوين', 'Great jump! +10 points +1 coin') : result === 'timeout' ? ar('انتهى الوقت واصطدمت بالعقبة وخسرت حياة', 'Time ran out; you hit the obstacle and lost a life') : ar('اصطدمت بالعقبة وخسرت حياة', 'You hit the obstacle and lost a life')}</p>
          <p className="mt-1 text-sm leading-6">{ar(question.explanationAr, question.explanationEn)}</p>
          {result !== 'correct' && <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{ar('الإجابة الصحيحة: ', 'Correct answer: ')}{ar(question.choices.find((choice) => choice.correct)?.ar ?? '', question.choices.find((choice) => choice.correct)?.en ?? '')}</p>}
          <a className="mt-2 inline-block text-xs font-semibold text-primary underline" href={SOURCES[question.source]} target="_blank" rel="noreferrer">{ar(`المصدر: ${question.source}`, `Source: ${question.source}`)}</a>
          <div><Button className="mt-3" size="sm" onClick={continueRun}>{ar(lives <= 0 ? 'عرض النتيجة' : round + 1 === QUESTIONS.length ? 'إنهاء المسار' : 'تابع الجري', lives <= 0 ? 'See result' : round + 1 === QUESTIONS.length ? 'Finish course' : 'Keep running')}</Button></div>
        </div>
      )}

      {phase === 'ready' ? (
        <div className="rounded-2xl border bg-primary/5 p-5 text-center">
          <h3 className="text-xl font-black">{ar('عداء الإنقاذ', 'Rescue Runner')}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{ar('منظور خلف المسعف وثلاثة مسارات. بدّل المسار بالأزرار أو بأسهم الكيبورد واجمع العملات التي تمر في مسارك. قبل كل عقبة يظهر سؤال بثلاثة اختيارات ولديك ٧ ثوانٍ؛ الإجابة الصحيحة تقفز فوق العقبة وتضيف نقاطًا وعملة مكافأة، والخطأ أو انتهاء الوقت يخصم حياة ويشرح المعلومة.', 'Run from a third-person view across three lanes. Switch lanes with buttons or arrow keys to collect coins in your path. Each obstacle brings a three-choice first-aid question with 7 seconds to answer; a correct answer jumps over it for points and a bonus coin, while a wrong answer or timeout costs a life and explains the fact.')}</p>
          <Button className="mt-4" onClick={startRun}><Zap className="me-2 h-4 w-4" />{ar('ابدأ الجري', 'Start running')}</Button>
        </div>
      ) : phase === 'won' || phase === 'lost' ? (
        <div className={`rounded-2xl border p-5 text-center ${phase === 'won' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`} role="status">
          <Trophy className={`mx-auto h-8 w-8 ${phase === 'won' ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <h3 className="mt-2 text-xl font-black">{phase === 'won' ? ar('وصلت لخط النهاية!', 'You reached the finish!') : ar('انتهت المحاولة', 'Run over')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ar(`جمعت ${score} نقطة و${runCoins} كوينز في الجولة.`, `You collected ${score} points and ${runCoins} coins this run.`)} {ar('النقاط اليومية للعبة تُحتسب مرة واحدة.', 'Daily game XP is awarded once.')}</p>
          <Button variant="outline" className="mt-4" onClick={startRun}>{ar('العب مرة أخرى', 'Run again')}</Button>
        </div>
      ) : null}
    </section>
  );
}
