import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { allFirstAidLessons } from '@/data/firstAidPracticeLessons';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FirstAidGameId } from '@/hooks/useFirstAidProgress';

/** A short, source-linked decision exercise; it teaches the first published step, not an AI-generated procedure. */
export function RescueSimulator({ onComplete }: { onComplete: (gameId: FirstAidGameId) => Promise<unknown> }) {
  const { L, language } = useLanguage();
  const scenarios = useMemo(() => allFirstAidLessons.filter((lesson) => lesson.scenario && lesson.sources?.length && lesson.stepsAr.length >= 4), []);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [mode, setMode] = useState<'decision' | 'sequence'>('decision');
  const [sequence, setSequence] = useState<number[]>([]);
  const [sequenceChecked, setSequenceChecked] = useState(false);
  const scenario = scenarios[scenarioIndex % Math.max(scenarios.length, 1)];
  if (!scenario) return null;

  const steps = language === 'ar' ? scenario.stepsAr : scenario.stepsEn;
  const distractors = [0, 1, 2].map((offset) => 1 + ((scenarioIndex + offset) % (steps.length - 1)));
  const choices = [0, ...distractors];
  const correctPosition = scenarioIndex % choices.length;
  [choices[0], choices[correctPosition]] = [choices[correctPosition], choices[0]];
  const arranged = choices.map((stepIndex) => steps[stepIndex]);
  const correctIndex = correctPosition;
  const prompt = language === 'ar' ? scenario.scenario!.patientPromptAr : scenario.scenario!.patientPromptEn;
  const sources = scenario.sources ?? [];

  const resetSequence = () => { setSequence([...steps.keys()].reverse()); setSequenceChecked(false); };
  const next = () => { setScenarioIndex((i) => (i + 1) % scenarios.length); setChoice(null); setSequenceChecked(false); setMode('decision'); setSequence([]); };
  const checkSequence = () => {
    if (sequence.length !== steps.length) return;
    setSequenceChecked(true);
    if (sequence.every((value, index) => value === index)) void onComplete('simulator-sequence');
  };

  return (
    <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/10">
      <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary"><ShieldAlert className="h-5 w-5" /><span className="font-bold">{L('محاكي الإنقاذ', 'Rescue Simulator')}</span><Sparkles className="h-4 w-4" /></div>
          <h2 className="text-lg font-bold">{language === 'ar' ? scenario.titleAr : scenario.titleEn}</h2>
          <p className="mt-2 leading-7 text-muted-foreground">{prompt}</p>
          <p className="mt-2 text-xs text-muted-foreground">{L('تدريب تعليمي مبني على الدرس ومراجعه. لا تطبّق الإسعافات على شخص حقيقي دون تدريب مناسب.', 'Educational practice based on the lesson and its references. Do not perform first aid on a real person without suitable training.')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant={mode === 'decision' ? 'default' : 'outline'} onClick={() => { setMode('decision'); setChoice(null); }}>{L('اختر أول تصرف', 'Choose your action')}</Button>
            <Button size="sm" variant={mode === 'sequence' ? 'default' : 'outline'} onClick={() => { setMode('sequence'); setChoice(null); if (!sequence.length) resetSequence(); }}>{L('رتّب خطوات الإنقاذ', 'Rescue sequence')}</Button>
          </div>
        </div>
        {mode === 'decision' ? <div className="grid gap-2 sm:grid-cols-2 md:w-[28rem]">
          {arranged.map((answer, index) => (
              <Button key={`${scenario.id}-${index}`} variant={choice === null ? 'outline' : index === correctIndex ? 'default' : choice === index ? 'destructive' : 'outline'} className="h-auto min-h-12 justify-start whitespace-normal py-3 text-start" onClick={() => { setChoice(index); if (index === correctIndex) void onComplete('simulator-decision'); }} disabled={choice !== null}>
              {answer}
            </Button>
          ))}
          {choice !== null && <div className="col-span-full rounded-lg border bg-background/80 p-3 text-sm leading-6" role="status">
            <b>{choice === correctIndex ? L('اختيار صحيح', 'Good first action') : L('راجع الخطوة الأولى', 'Review the first step')}</b>
            <p className="mt-1">{L('هذه هي الخطوة الأولى كما وردت في الدرس المرجعي. اقرأ بقية الخطوات والمراجع قبل متابعة التعلم.', 'This is the first step listed in the referenced lesson. Review the remaining steps and sources before continuing.')}</p>
            <div className="mt-2 flex flex-wrap gap-3">{sources.map((source) => <a className="font-medium text-primary underline" key={source.url} href={source.url} target="_blank" rel="noreferrer">{language === 'ar' ? source.nameAr : source.nameEn}</a>)}</div>
            <Button className="mt-3" size="sm" variant="outline" onClick={next}><RotateCcw className="me-2 h-4 w-4" />{L('سيناريو آخر', 'Next scenario')}</Button>
            {choice !== correctIndex && <Button className="mt-3 ms-2" size="sm" variant="outline" onClick={() => setChoice(null)}><RotateCcw className="me-2 h-4 w-4" />{L('حاول مجددًا', 'Try again')}</Button>}
          </div>}
        </div> : <div className="grid gap-2 md:w-[28rem]">
          {sequence.length === 0 && <Button variant="outline" onClick={resetSequence}>{L('ابدأ ترتيب الخطوات', 'Start sequence')}</Button>}
          {sequence.map((stepIndex, position) => <div key={`${stepIndex}-${position}`} className="flex items-center gap-2 rounded-lg border bg-background/80 p-2">
            <span className="min-w-0 flex-1 text-sm">{position + 1}. {steps[stepIndex]}</span>
            <Button size="icon" variant="ghost" aria-label={L('حرّك لأعلى', 'Move up')} disabled={position === 0 || sequenceChecked} onClick={() => setSequence((current) => { const next = [...current]; [next[position - 1], next[position]] = [next[position], next[position - 1]]; return next; })}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={L('حرّك لأسفل', 'Move down')} disabled={position === sequence.length - 1 || sequenceChecked} onClick={() => setSequence((current) => { const next = [...current]; [next[position + 1], next[position]] = [next[position], next[position + 1]]; return next; })}><ArrowDown className="h-4 w-4" /></Button>
          </div>)}
          {sequence.length > 0 && <div className="flex flex-wrap gap-2"><Button onClick={checkSequence} disabled={sequenceChecked}>{L('تحقق من الترتيب', 'Check order')}</Button><Button variant="outline" onClick={resetSequence}><RotateCcw className="me-2 h-4 w-4" />{L('إعادة الترتيب', 'Reset')}</Button></div>}
          {sequenceChecked && <div className="rounded-lg border bg-background/80 p-3 text-sm leading-6" role="status">
            <b>{sequence.every((value, index) => value === index) ? L('ترتيب صحيح', 'Correct sequence') : L('راجع ترتيب الدرس', 'Review the lesson order')}</b>
            <p>{L('الترتيب المعروض في الدرس ومصدره هو المرجع. راجع الخطوات كاملة قبل الانتقال.', 'The lesson order and its source are the reference. Review every step before moving on.')}</p>
            <div className="mt-2 flex flex-wrap gap-3">{sources.map((source) => <a className="font-medium text-primary underline" key={source.url} href={source.url} target="_blank" rel="noreferrer">{language === 'ar' ? source.nameAr : source.nameEn}</a>)}</div>
            <Button className="mt-3" size="sm" variant="outline" onClick={next}>{L('سيناريو آخر', 'Next scenario')}</Button>
          </div>}
        </div>}
      </CardContent>
    </Card>
  );
}
