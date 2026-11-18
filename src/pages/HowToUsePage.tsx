import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CircleHelp, ExternalLink, Loader2, Play, Plus, ShieldCheck, Trash2, Upload, Video } from 'lucide-react';

type Tutorial = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  storage_path: string | null;
  created_at: string;
  sort_order: number;
};

const getYouTubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be' || parsed.hostname.endsWith('.youtu.be')) return parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(parsed.hostname)) return null;
    return parsed.searchParams.get('v') ?? parsed.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
};

const HowToUsePage = () => {
  const { user } = useAuth();
  const { L } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(false);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadTutorials = useCallback(async () => {
    const { data, error } = await supabase.from('platform_tutorial_videos').select('*').order('sort_order').order('created_at', { ascending: false });
    if (error) toast.error(L('تعذر تحميل فيديوهات الشرح', 'Could not load the tutorial videos'));
    setTutorials((data ?? []) as Tutorial[]);
    setLoading(false);
  }, [L]);

  useEffect(() => {
    let active = true;
    const checkRole = async () => {
      if (!user) { if (active) setIsAdmin(false); return; }
      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (active) setIsAdmin(!error && Boolean(data));
    };
    void checkRole();
    return () => { active = false; };
  }, [user]);

  useEffect(() => { void loadTutorials(); }, [loadTutorials]);

  const addTutorial = async () => {
    if (!user || !isAdmin) return;
    if (!title.trim()) return toast.error(L('اكتب عنوان الفيديو', 'Enter a video title'));
    if (!file && !youtubeUrl.trim()) return toast.error(L('ارفع فيديو أو أضف رابط يوتيوب', 'Upload a video or add a YouTube link'));
    if (file && youtubeUrl.trim()) return toast.error(L('اختر فيديو مرفوعًا أو رابط يوتيوب واحدًا', 'Choose an uploaded video or a YouTube link'));
    if (youtubeUrl.trim() && !getYouTubeId(youtubeUrl.trim())) return toast.error(L('الرابط يجب أن يكون رابط يوتيوب صالحًا', 'Enter a valid YouTube link'));
    if (file && !['video/mp4', 'video/webm'].includes(file.type)) return toast.error(L('صيغة الفيديو يجب أن تكون MP4 أو WebM', 'Video must be MP4 or WebM'));
    if (file && file.size > 300 * 1024 * 1024) return toast.error(L('أقصى حجم للفيديو 300 ميجابايت', 'Maximum video size is 300 MB'));

    setSaving(true);
    let storagePath: string | null = null;
    if (file) {
      const safeName = file.name.replace(/[^\w.-]/g, '_');
      storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from('platform-guides').upload(storagePath, file, { contentType: file.type, upsert: false });
      if (error) {
        console.error('Tutorial video upload failed:', error);
        const missingBucket = /bucket.*not found|not found.*bucket/i.test(error.message);
        toast.error(missingBucket
          ? L('مخزن فيديوهات الكتالوج غير موجود في Supabase. طبّق ملف الترحيل 20261118161000_platform_guides_bucket.sql كاملًا ثم أعد المحاولة.', 'The Platform Catalog storage bucket is missing in Supabase. Apply the full 20261118161000_platform_guides_bucket.sql migration, then try again.')
          : error.message || L('تعذر رفع الفيديو', 'Video upload failed'));
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('platform_tutorial_videos').insert({
      title: title.trim(),
      description: description.trim() || null,
      video_url: youtubeUrl.trim() || null,
      storage_path: storagePath,
      created_by: user.id,
      sort_order: tutorials.length,
    });
    if (error) {
      if (storagePath) await supabase.storage.from('platform-guides').remove([storagePath]);
      console.error('Tutorial video record failed:', error);
      toast.error(error.message || L('تعذر حفظ الفيديو', 'Could not save the video'));
    } else {
      setTitle(''); setDescription(''); setYoutubeUrl(''); setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      toast.success(L('تمت إضافة فيديو الشرح', 'Tutorial video added'));
      await loadTutorials();
    }
    setSaving(false);
  };

  const removeTutorial = async (tutorial: Tutorial) => {
    if (!isAdmin) return;
    if (tutorial.storage_path) {
      const { error: fileError } = await supabase.storage.from('platform-guides').remove([tutorial.storage_path]);
      if (fileError) return toast.error(fileError.message || L('تعذر حذف ملف الفيديو', 'Could not delete the video file'));
    }
    const { error } = await supabase.from('platform_tutorial_videos').delete().eq('id', tutorial.id);
    if (error) toast.error(error.message || L('تعذر حذف الفيديو', 'Could not delete the video'));
    else { toast.success(L('تم حذف الفيديو', 'Video deleted')); await loadTutorials(); }
  };

  const videoUrl = (path: string) => supabase.storage.from('platform-guides').getPublicUrl(path).data.publicUrl;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8 route-content" dir={L('rtl', 'ltr')}>
        <header className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-primary/10 p-3 text-primary"><CircleHelp className="h-7 w-7" /></span>
            <div>
              <h1 className="text-3xl font-bold">{L('كتالوج المنصة', 'Platform catalog')}</h1>
              <p className="mt-2 max-w-2xl leading-7 text-muted-foreground">{L('فيديوهات قصيرة تشرح استخدام خدمات المنصة خطوة بخطوة.', 'Short videos that walk you through the platform features step by step.')}</p>
            </div>
          </div>
        </header>

        {isAdmin && (
          <Card className="border-primary/25">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />{L('إدارة فيديوهات الشرح', 'Manage tutorial videos')}</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={L('عنوان الفيديو', 'Video title')} maxLength={120} />
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={L('وصف مختصر (اختياري)', 'Short description (optional)')} maxLength={500} />
              <Input type="url" value={youtubeUrl} onChange={(event) => { setYoutubeUrl(event.target.value); if (event.target.value) { setFile(null); if (fileInput.current) fileInput.current.value = ''; } }} placeholder="https://www.youtube.com/watch?v=..." />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <Input ref={fileInput} type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected) setYoutubeUrl(''); }} />
                <span className="text-xs text-muted-foreground">{L('MP4 أو WebM · حتى 300 ميجابايت', 'MP4 or WebM · up to 300 MB')}</span>
              </div>
              <Button onClick={() => void addTutorial()} disabled={saving} className="w-full sm:w-fit">
                {saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : youtubeUrl ? <Plus className="me-2 h-4 w-4" /> : <Upload className="me-2 h-4 w-4" />}
                {L('إضافة فيديو', 'Add video')}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : tutorials.length ? (
          <section className="grid gap-5 md:grid-cols-2">
            {tutorials.map((tutorial) => {
              const youtubeId = tutorial.video_url ? getYouTubeId(tutorial.video_url) : null;
              return <Card key={tutorial.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  {youtubeId ? <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title={tutorial.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : tutorial.storage_path ? <video className="h-full w-full" src={videoUrl(tutorial.storage_path)} controls preload="metadata" /> : <div className="flex h-full items-center justify-center"><Video className="h-10 w-10 text-muted-foreground" /></div>}
                </div>
                <CardHeader className="pb-2"><CardTitle className="text-lg">{tutorial.title}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {tutorial.description && <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{tutorial.description}</p>}
                  {tutorial.video_url && <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={tutorial.video_url} target="_blank" rel="noopener noreferrer"><Play className="h-4 w-4" />{L('فتح الفيديو على يوتيوب', 'Open video on YouTube')}<ExternalLink className="h-3.5 w-3.5" /></a>}
                  {isAdmin && <Button variant="destructive" size="sm" onClick={() => void removeTutorial(tutorial)}><Trash2 className="me-2 h-4 w-4" />{L('حذف الفيديو', 'Delete video')}</Button>}
                </CardContent>
              </Card>;
            })}
          </section>
        ) : <Card><CardContent className="py-12 text-center text-muted-foreground">{L('لا توجد فيديوهات شرح مضافة حتى الآن.', 'No tutorial videos have been added yet.')}</CardContent></Card>}
      </main>
      <Footer />
    </div>
  );
};

export default HowToUsePage;
