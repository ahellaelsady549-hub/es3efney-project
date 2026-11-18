import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  advanceFirstAidStreak,
  emptyFirstAidProgress,
  FIRST_AID_PROGRESS_KEY,
  readFirstAidProgress,
  saveFirstAidProgress,
  type FirstAidProgress,
} from '@/lib/firstAidProgress';

export interface FirstAidLeaderboardEntry {
  rank: number;
  learnerLabel: string;
  points: number;
  streak: number;
  completedLessons: number;
  isCurrentUser: boolean;
}

export type FirstAidProgressSyncStatus = 'checking' | 'synced' | 'local';
export type FirstAidGameId = 'triage' | 'kit' | 'danger' | 'rhythm' | 'patient' | 'detective' | 'cards' | 'simulator-decision' | 'simulator-sequence';

const getCairoDay = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export const useFirstAidProgress = () => {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [progress, setProgress] = useState<FirstAidProgress>(emptyFirstAidProgress);
  const [leaderboard, setLeaderboard] = useState<FirstAidLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<FirstAidProgressSyncStatus>('checking');

  const storageKey = `${FIRST_AID_PROGRESS_KEY}:${user?.id ?? 'guest'}`;

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    setLoading(true);
    const cachedProgress = advanceFirstAidStreak(readFirstAidProgress(storageKey));
    saveFirstAidProgress(storageKey, cachedProgress);
    setProgress(cachedProgress);

    if (!user) {
      setLeaderboard([]);
      setSyncStatus('local');
      setLoading(false);
      return () => { active = false; };
    }

    const loadProgress = async () => {
      const [activityResult, completedResult, rankingResult] = await Promise.all([
        supabase.rpc('record_first_aid_activity', { p_lesson_id: null }).single(),
        supabase.from('first_aid_lesson_completions').select('lesson_id').eq('user_id', user.id),
        supabase.rpc('get_first_aid_leaderboard'),
      ]);
      if (!active) return;

      const progressErrors = [activityResult.error, completedResult.error]
        .filter((error) => error !== null);
      if (rankingResult.error) {
        console.error('Could not load the first-aid leaderboard:', rankingResult.error);
      }
      // Cached points already include locally claimed missions if the stats
      // request failed. Only add pending mission XP to the server total.
      let serverPoints: number | null = activityResult.error ? null : activityResult.data?.points ?? 0;
      let streak = activityResult.data?.current_streak ?? cachedProgress.streak;
      let lastActive = activityResult.data?.last_active ?? cachedProgress.lastActive;
      const remoteLessonIds = new Set((completedResult.data ?? []).map((row) => row.lesson_id));
      const pendingLessonIds = new Set(cachedProgress.pendingLessonIds);
      const pendingMissionDays = new Set(cachedProgress.pendingMissionDays);
      const pendingGameClaims = new Set(cachedProgress.pendingGameClaims);
      const claimedGameKeys = new Set(cachedProgress.claimedGameKeys);

      if (!activityResult.error) {
        for (const lessonId of pendingLessonIds) {
          const { data, error } = await supabase
            .rpc('record_first_aid_activity', { p_lesson_id: lessonId })
            .single();
          if (error) {
            progressErrors.push(error);
            continue;
          }
          serverPoints = data.points;
          streak = data.current_streak;
          lastActive = data.last_active;
          remoteLessonIds.add(lessonId);
          pendingLessonIds.delete(lessonId);
        }
      }

      for (const missionDay of pendingMissionDays) {
        const { data, error } = await supabase.rpc('sync_first_aid_daily_mission', {
          p_mission_day: missionDay,
        }).single();
        if (error) {
          progressErrors.push(error);
          continue;
        }
        serverPoints = data.points;
        streak = data.current_streak;
        lastActive = data.last_active;
        pendingMissionDays.delete(missionDay);
      }

      for (const claim of pendingGameClaims) {
        const [gameId, activityDay] = claim.split('|');
        const { data, error } = await supabase.rpc('claim_first_aid_game_xp', {
          p_game_id: gameId,
          p_activity_day: activityDay,
        }).single();
        if (error) {
          progressErrors.push(error);
          continue;
        }
        serverPoints = data.points;
        streak = data.current_streak;
        lastActive = data.last_active;
        pendingGameClaims.delete(claim);
        claimedGameKeys.add(claim);
      }

      const points = serverPoints === null
        ? cachedProgress.points
        : serverPoints
          + pendingLessonIds.size * 10
          + pendingMissionDays.size * 100
          + pendingGameClaims.size * 5;

      const nextProgress: FirstAidProgress = {
        points,
        streak,
        lastActive,
        completedLessonIds: [...new Set([...cachedProgress.completedLessonIds, ...remoteLessonIds])],
        pendingLessonIds: [...pendingLessonIds],
        pendingMissionDays: [...pendingMissionDays],
        pendingGameClaims: [...pendingGameClaims],
        claimedGameKeys: [...claimedGameKeys],
      };
      setProgress(nextProgress);
      setLeaderboard((rankingResult.data ?? []).map((row) => ({
        rank: Number(row.rank),
        learnerLabel: row.learner_label,
        points: row.points,
        streak: row.streak,
        completedLessons: Number(row.completed_lessons),
        isCurrentUser: row.is_current_user,
      })));
      saveFirstAidProgress(storageKey, nextProgress);
      setSyncStatus(progressErrors.length ? 'local' : 'synced');
    };

    const refreshProgress = () => {
      setLoading(true);
      setSyncStatus('checking');
      loadProgress()
      .catch((error: unknown) => {
        console.error('Could not load first-aid learning progress:', error);
        if (active) setSyncStatus('local');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    };

    refreshProgress();
    window.addEventListener('online', refreshProgress);
    return () => {
      active = false;
      window.removeEventListener('online', refreshProgress);
    };
  }, [authLoading, storageKey, user]);

  const completeLesson = useCallback(async (lessonId: number) => {
    if (progress.completedLessonIds.includes(lessonId)) return;

    if (!user) {
      setProgress((previous) => {
        const next = advanceFirstAidStreak(previous);
        const updated = {
          ...next,
          points: next.points + 10,
          completedLessonIds: [...next.completedLessonIds, lessonId],
        };
        saveFirstAidProgress(storageKey, updated);
        return updated;
      });
      return;
    }

    const { data, error } = await supabase
      .rpc('record_first_aid_activity', { p_lesson_id: lessonId })
      .single();
    if (error) {
      console.error('Could not save first-aid lesson completion:', error);
      setProgress((previous) => {
        if (previous.completedLessonIds.includes(lessonId)) return previous;
        const next = advanceFirstAidStreak(previous);
        const updated = {
          ...next,
          points: next.points + 10,
          completedLessonIds: [...next.completedLessonIds, lessonId],
          pendingLessonIds: [...new Set([...next.pendingLessonIds, lessonId])],
        };
        saveFirstAidProgress(storageKey, updated);
        return updated;
      });
      setSyncStatus('local');
      toast({
        title: language === 'ar' ? 'حُفظ إنجازك على هذا الجهاز' : 'Progress saved on this device',
        description: language === 'ar'
          ? 'تعذر الاتصال بالخادم الآن. سنحاول مزامنة النقاط عند عودة الاتصال.'
          : 'The server is unavailable right now. Your points will sync when the connection returns.',
      });
      return;
    }

    setProgress((previous) => {
      const updated = {
        ...previous,
        points: Math.max(previous.points, data.points),
        streak: data.current_streak,
        lastActive: data.last_active,
        completedLessonIds: previous.completedLessonIds.includes(lessonId)
          ? previous.completedLessonIds
          : [...previous.completedLessonIds, lessonId],
        pendingLessonIds: previous.pendingLessonIds.filter((id) => id !== lessonId),
      };
      saveFirstAidProgress(storageKey, updated);
      return updated;
    });
    setSyncStatus('synced');
    if (data.lesson_completed) {
      toast({
        title: language === 'ar' ? 'أحسنت! +10 نقاط خبرة' : 'Nice work! +10 XP',
        description: language === 'ar' ? 'تم حفظ إنجاز الدرس ونقاطه.' : 'Lesson progress and XP were saved.',
      });
    }

    const { data: ranking, error: rankingError } = await supabase.rpc('get_first_aid_leaderboard');
    if (rankingError) {
      console.error('Could not refresh the first-aid leaderboard:', rankingError);
      toast({
        title: language === 'ar' ? 'تعذر تحديث الترتيب' : 'Could not refresh leaderboard',
        description: rankingError.message,
        variant: 'destructive',
      });
      return;
    }
    setLeaderboard((ranking ?? []).map((row) => ({
      rank: Number(row.rank),
      learnerLabel: row.learner_label,
      points: row.points,
      streak: row.streak,
      completedLessons: Number(row.completed_lessons),
      isCurrentUser: row.is_current_user,
    })));
  }, [language, progress.completedLessonIds, storageKey, toast, user]);

  const completeGameActivity = useCallback(async (gameId: FirstAidGameId) => {
    const activityDay = getCairoDay();
    const claimKey = `${gameId}|${activityDay}`;
    if (progress.claimedGameKeys.includes(claimKey)) return { claimed: false, error: null };

    if (!user) {
      setProgress((previous) => {
        if (previous.claimedGameKeys.includes(claimKey)) return previous;
        const next = advanceFirstAidStreak(previous);
        const updated = {
          ...next,
          points: next.points + 5,
          claimedGameKeys: [...new Set([...next.claimedGameKeys, claimKey])],
        };
        saveFirstAidProgress(storageKey, updated);
        return updated;
      });
      setSyncStatus('local');
      toast({ title: language === 'ar' ? 'كسبت +5 XP!' : 'You earned +5 XP!' });
      return { claimed: true, error: null, local: true };
    }

    const { data, error } = await supabase.rpc('claim_first_aid_game_xp', {
      p_game_id: gameId,
      p_activity_day: activityDay,
    }).single();
    if (error) {
      console.error('Could not save first-aid game XP:', error);
      setProgress((previous) => {
        if (previous.claimedGameKeys.includes(claimKey)) return previous;
        const next = advanceFirstAidStreak(previous);
        const updated = {
          ...next,
          points: next.points + 5,
          pendingGameClaims: [...new Set([...next.pendingGameClaims, claimKey])],
          claimedGameKeys: [...new Set([...next.claimedGameKeys, claimKey])],
        };
        saveFirstAidProgress(storageKey, updated);
        return updated;
      });
      setSyncStatus('local');
      toast({
        title: language === 'ar' ? 'كسبت +5 XP — محفوظة مؤقتًا' : '+5 XP saved temporarily',
        description: language === 'ar' ? 'ستتم مزامنتها عند عودة الاتصال.' : 'They will sync when the connection returns.',
      });
      return { claimed: true, error: null, local: true };
    }

    setProgress((previous) => {
      const updated = {
        ...previous,
        points: Math.max(previous.points, data.points),
        streak: data.current_streak,
        lastActive: data.last_active,
        pendingGameClaims: previous.pendingGameClaims.filter((claim) => claim !== claimKey),
        claimedGameKeys: [...new Set([...previous.claimedGameKeys, claimKey])],
      };
      saveFirstAidProgress(storageKey, updated);
      return updated;
    });
    setSyncStatus('synced');
    if (data.claimed) toast({ title: language === 'ar' ? 'كسبت +5 XP!' : 'You earned +5 XP!' });
    return { claimed: data.claimed, error: null };
  }, [language, progress.claimedGameKeys, storageKey, toast, user]);

  const completeDailyMission = useCallback(async (answer: string) => {
    if (!user) return { claimed: false, error: new Error('Sign in required') };
    const { data, error } = await supabase.rpc('claim_first_aid_daily_mission', { p_answer: answer }).single();
    if (error) {
      const today = getCairoDay();
      if (progress.pendingMissionDays.includes(today)) return { claimed: false, error: null };
      setProgress((previous) => {
        const next = advanceFirstAidStreak(previous);
        const updated = { ...next, points: next.points + 100, pendingMissionDays: [...next.pendingMissionDays, today] };
        saveFirstAidProgress(storageKey, updated);
        return updated;
      });
      setSyncStatus('local');
      return { claimed: true, error: null, local: true };
    }
    if (data.claimed) {
      const today = getCairoDay();
      setProgress((previous) => {
        const next = {
          ...previous,
          points: Math.max(previous.points, data.points),
          streak: data.current_streak,
          lastActive: today,
          pendingMissionDays: previous.pendingMissionDays.filter((day) => day !== today),
        };
        saveFirstAidProgress(storageKey, next);
        return next;
      });
      const { data: ranking } = await supabase.rpc('get_first_aid_leaderboard');
      setLeaderboard((ranking ?? []).map((row) => ({ rank: Number(row.rank), learnerLabel: row.learner_label, points: row.points, streak: row.streak, completedLessons: Number(row.completed_lessons), isCurrentUser: row.is_current_user })));
      setSyncStatus('synced');
    }
    return { claimed: data.claimed, error: null };
  }, [progress.pendingMissionDays, storageKey, user]);

  return { progress, leaderboard, loading, syncStatus, completeLesson, completeDailyMission, completeGameActivity, setProgress: setProgress as React.Dispatch<React.SetStateAction<FirstAidProgress>> };
};
