import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, FileText, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { ChatBansAdmin } from '@/components/chat/ChatBansAdmin';
import { medicalSpecialties } from '@/data/specialties';

type Doc = {
  id: string; full_name: string | null; email: string | null; specialty: string; bio: string | null;
  cv_url: string | null; portfolio_url: string | null; verification_status: string | null; is_verified: boolean | null;
  ai_cv_review: string | null; rejection_reason: string | null; reviewed_at: string | null; created_at: string;
};

type IdentityApplication = {
  id: string;
  user_id: string;
  national_id: string;
  governorate: string;
  home_address: string;
  id_front_path: string;
  id_back_path: string;
  account_type: 'doctor' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  ai_review: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: { full_name: string | null; email: string | null };
  professional?: {
    id: string;
    specialty: string;
    bio: string | null;
    cv_url: string | null;
    cv_link: string | null;
    portfolio_url: string | null;
    ai_cv_review: string | null;
    workplace_type: string | null;
    workplace_name: string | null;
    workplace_address: string | null;
  };
};

const AdminPage = () => {
  const { user, loading } = useAuth();
  const { L } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [identityApplications, setIdentityApplications] = useState<IdentityApplication[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const doctorRpcErrorShown = useRef(false);
  const identityQueryErrorShown = useRef(false);

  const load = useCallback(async () => {
    const [doctorResult, identityResult] = await Promise.all([
      supabase.rpc('get_doctor_requests'),
      supabase.from('identity_applications').select('*').order('created_at', { ascending: false }),
    ]);
    const { data, error } = doctorResult;
    if (error) {
      console.error('Could not load doctor verification requests:', error);
      const missingRpc = error.code === 'PGRST202' || /get_doctor_requests/i.test(error.message);
      if (!doctorRpcErrorShown.current) {
        doctorRpcErrorShown.current = true;
        toast.error(missingRpc
          ? L('قاعدة البيانات تحتاج ترحيل طلبات توثيق الطبيب: شغّل ملف 20261119120000_doctor_verification_admin_queue.sql كاملًا.', 'Doctor verification setup is missing. Run the full 20261119120000_doctor_verification_admin_queue.sql migration.')
          : error.message);
      }
    } else {
      doctorRpcErrorShown.current = false;
      setDocs((data ?? []) as Doc[]);
    }

    if (identityResult.error) {
      console.error('Could not load identity verification requests:', identityResult.error);
      if (!identityQueryErrorShown.current) {
        identityQueryErrorShown.current = true;
        toast.error(L('تعذّر تحميل طلبات توثيق الهوية. شغّل ترحيل 20261119130000_admin_identity_application_visibility.sql كاملًا.', 'Could not load identity requests. Run the full 20261119130000_admin_identity_application_visibility.sql migration.'));
      }
      return false;
    }
    identityQueryErrorShown.current = false;

    const applications = (identityResult.data ?? []) as IdentityApplication[];
    const userIds = [...new Set(applications.map((application) => application.user_id))];
    if (userIds.length) {
      const doctorUserIds = applications.filter((application) => application.account_type === 'doctor').map((application) => application.user_id);
      const [profilesResult, doctorsResult] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds),
        doctorUserIds.length
          ? supabase.from('doctors').select('*').in('user_id', doctorUserIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const { data: profiles, error: profilesError } = profilesResult;
      if (profilesError) console.error('Could not load applicant profiles:', profilesError);
      const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile] as const));
      if (doctorsResult.error) console.error('Could not load doctor application details:', doctorsResult.error);
      const doctorByUserId = new Map((doctorsResult.data ?? []).map((doctor) => [doctor.user_id, doctor] as const));
      setIdentityApplications(applications.map((application) => ({
        ...application,
        profile: profileByUserId.get(application.user_id),
        professional: doctorByUserId.get(application.user_id),
      })));
    } else {
      setIdentityApplications(applications);
    }
    return true;
  }, [L]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let refreshTimer: number | undefined;

    const checkAdminAndLoad = async () => {
      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!active) return;
      if (error) {
        console.error('Could not verify administrator role:', error);
        setIsAdmin(false);
        return;
      }

      const admin = Boolean(data);
      setIsAdmin(admin);
      if (admin) {
        const loaded = await load();
        if (active && loaded) refreshTimer = window.setInterval(() => void load(), 20000);
      }
    };

    void checkAdminAndLoad();
    return () => {
      active = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [user, load]);

  const openCv = async (cv: string) => {
    if (/^https?:\/\//i.test(cv)) {
      window.open(cv, '_blank', 'noopener,noreferrer');
      return;
    }

    const path = cv.startsWith('storage:') ? cv.slice(8) : cv;
    const { data, error } = await supabase.storage.from('doctor-cvs').createSignedUrl(path, 600);
    if (error || !data) {
      toast.error(error?.message || L('تعذر فتح السيرة الذاتية', 'Could not open the CV'));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const openIdentityDocument = async (path: string) => {
    const { data, error } = await supabase.storage.from('identity-documents').createSignedUrl(path, 300);
    if (error || !data) {
      toast.error(error?.message || L('تعذر فتح صورة البطاقة', 'Could not open ID image'));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const openExternalUrl = (url: string) => {
    if (!/^https?:\/\//i.test(url)) return toast.error(L('الرابط غير صالح', 'Invalid link'));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const decideIdentity = async (application: IdentityApplication, approve: boolean) => {
    const reason = (reasons[application.id] ?? '').trim();
    if (!approve && reason.length < 5) return toast.error(L('اكتب سبب الرفض أو المراجعة (5 أحرف على الأقل)', 'Write a rejection/review reason (at least 5 characters)'));
    const { error } = await supabase.from('identity_applications').update({
      status: approve ? 'approved' : 'rejected',
      rejection_reason: approve ? null : reason,
      reviewed_at: new Date().toISOString(),
    }).eq('id', application.id);
    if (error) return toast.error(`${L('تعذّر تحديث الطلب', 'Could not update request')}: ${error.message}`);
    toast.success(approve ? L('تم قبول توثيق الهوية', 'Identity verification approved') : L('تم رفض الطلب مع حفظ السبب', 'Request rejected with reason saved'));
    setReasons((current) => ({ ...current, [application.id]: '' }));
    await load();
  };

  const decide = async (id: string, approve: boolean) => {
    const reason = (reasons[id] ?? '').trim();
    if (!approve && reason.length < 5) return toast.error(L('اكتب سبب الرفض', 'Write the rejection reason'));
    const { error } = await supabase.from('doctors').update({
      is_verified: approve,
      verification_status: approve ? 'approved' : 'rejected',
      rejection_reason: approve ? null : reason,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return toast.error(L('تعذّر الحفظ', 'Could not save'));
    toast.success(approve ? L('تمت الموافقة', 'Approved') : L('تم الرفض', 'Rejected'));
    load();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) return <Navigate to="/" replace />;

  const pending = docs.filter((d) => !d.is_verified && d.verification_status !== 'rejected');
  const answered = docs.filter((d) => d.is_verified || d.verification_status === 'rejected');
  const pendingIdentity = identityApplications.filter((application) => application.status === 'pending');
  const answeredIdentity = identityApplications.filter((application) => application.status !== 'pending');

  const renderIdentityCard = (application: IdentityApplication, actions: boolean) => (
    <Card key={application.id}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {application.profile?.full_name || application.profile?.email || application.user_id}
          <Badge variant={application.status === 'approved' ? 'default' : application.status === 'rejected' ? 'destructive' : 'secondary'}>
            {application.status === 'approved' ? L('مقبول', 'Approved') : application.status === 'rejected' ? L('مرفوض', 'Rejected') : L('قيد المراجعة', 'Under review')}
          </Badge>
          <Badge variant="outline">{application.account_type === 'doctor' ? L('طبيب', 'Doctor') : L('مستخدم', 'User')}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {application.profile?.email && <p><b>{L('البريد', 'Email')}:</b> {application.profile.email}</p>}
        <p><b>{L('الرقم القومي', 'National ID')}:</b> {application.national_id}</p>
        <p><b>{L('المحافظة', 'Governorate')}:</b> {application.governorate}</p>
        <p><b>{L('عنوان السكن', 'Home address')}:</b> {application.home_address}</p>
        {application.professional && <div className="space-y-2 rounded-md border p-3">
          <p className="font-semibold">{L('بيانات الطبيب المهنية', 'Professional details')}</p>
          <p><b>{L('التخصص', 'Specialty')}:</b> {medicalSpecialties.find((specialty) => specialty.value === application.professional?.specialty)?.[L('labelAr', 'labelEn') as 'labelAr' | 'labelEn'] || application.professional.specialty}</p>
          {application.professional.workplace_name && <p><b>{application.professional.workplace_type === 'clinic' ? L('العيادة', 'Clinic') : L('المستشفى', 'Hospital')}:</b> {application.professional.workplace_name}</p>}
          {application.professional.workplace_address && <p><b>{L('عنوان جهة العمل', 'Workplace address')}:</b> {application.professional.workplace_address}</p>}
          {application.professional.bio && <p><b>{L('النبذة', 'Bio')}:</b> {application.professional.bio}</p>}
          {application.professional.ai_cv_review && <p className="whitespace-pre-wrap text-muted-foreground"><b>{L('مراجعة السيرة', 'CV review')}:</b> {application.professional.ai_cv_review}</p>}
          <div className="flex flex-wrap gap-2">
            {application.professional.cv_url && <Button size="lg" variant="outline" onClick={() => openCv(application.professional!.cv_url!)}><FileText className="h-4 w-4 me-1" />{L('عرض ملف CV', 'View CV PDF')}</Button>}
            {application.professional.cv_link && <Button size="lg" variant="outline" onClick={() => openExternalUrl(application.professional!.cv_link!)}><LinkIcon className="h-4 w-4 me-1" />{L('رابط CV', 'CV link')}</Button>}
            {application.professional.portfolio_url && <Button size="lg" variant="outline" onClick={() => openExternalUrl(application.professional!.portfolio_url!)}><LinkIcon className="h-4 w-4 me-1" />{L('رابط إضافي', 'Portfolio link')}</Button>}
          </div>
        </div>}
        <div className="flex flex-wrap gap-2">
          <Button size="lg" variant="outline" onClick={() => openIdentityDocument(application.id_front_path)}>{L('عرض وجه البطاقة', 'View ID front')}</Button>
          <Button size="lg" variant="outline" onClick={() => openIdentityDocument(application.id_back_path)}>{L('عرض ظهر البطاقة', 'View ID back')}</Button>
        </div>
        {application.ai_review && <div className="rounded-md bg-muted p-3"><b>{L('مراجعة الذكاء الاصطناعي', 'AI review')}:</b><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{application.ai_review}</p></div>}
        {application.rejection_reason && <p className="text-destructive"><b>{L('سبب الرفض / المراجعة', 'Rejection / review reason')}:</b> {application.rejection_reason}</p>}
        {application.reviewed_at && <p className="text-muted-foreground">{L('تاريخ الرد', 'Reviewed')}: {new Date(application.reviewed_at).toLocaleString()}</p>}
        {actions && <>
          <Textarea placeholder={L('سبب الرفض', 'Reason for rejection')} value={reasons[application.id] ?? ''} onChange={(event) => setReasons({ ...reasons, [application.id]: event.target.value })} rows={2} />
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => decideIdentity(application, true)}><Check className="h-4 w-4 me-1" />{L('قبول التوثيق', 'Approve identity')}</Button>
            <Button size="lg" variant="destructive" onClick={() => decideIdentity(application, false)}><X className="h-4 w-4 me-1" />{L('رفض مع السبب', 'Reject with reason')}</Button>
          </div>
        </>}
      </CardContent>
    </Card>
  );

  const renderCard = (d: Doc, actions: boolean) => (
    <Card key={d.id}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {d.full_name || d.email}
          <Badge variant={d.is_verified ? 'default' : d.verification_status === 'rejected' ? 'destructive' : 'secondary'}>
            {d.is_verified ? L('موافق عليه', 'Approved') : d.verification_status === 'rejected' ? L('مرفوض', 'Rejected') : L('قيد المراجعة', 'Pending')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p><b>{L('التخصص', 'Specialty')}:</b> {d.specialty}</p>
        {d.email && <p><b>{L('البريد', 'Email')}:</b> {d.email}</p>}
        {d.bio && <p className="text-muted-foreground">{d.bio}</p>}
        {identityApplications.filter((application) => application.professional?.id === d.id).map((application) => (
          <div key={application.id} className="space-y-3 rounded-md border p-3">
            <p className="font-semibold">{L('بيانات التوثيق المقدمة', 'Submitted verification details')}</p>
            <p><b>{L('الرقم القومي المكتوب', 'Entered national ID')}:</b> {application.national_id}</p>
            <p><b>{L('المحافظة', 'Governorate')}:</b> {application.governorate}</p>
            <p><b>{L('عنوان السكن', 'Home address')}:</b> {application.home_address}</p>
            {application.professional?.workplace_name && <p><b>{application.professional.workplace_type === 'clinic' ? L('جهة العمل: عيادة', 'Workplace: Clinic') : L('جهة العمل: مستشفى', 'Workplace: Hospital')}:</b> {application.professional.workplace_name}</p>}
            {application.professional?.workplace_address && <p><b>{L('عنوان جهة العمل', 'Workplace address')}:</b> {application.professional.workplace_address}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="lg" variant="outline" onClick={() => openIdentityDocument(application.id_front_path)}>{L('عرض وجه البطاقة', 'View ID front')}</Button>
              <Button size="lg" variant="outline" onClick={() => openIdentityDocument(application.id_back_path)}>{L('عرض ظهر البطاقة', 'View ID back')}</Button>
              {application.professional?.cv_link && <Button size="lg" variant="outline" onClick={() => openExternalUrl(application.professional!.cv_link!)}><LinkIcon className="h-4 w-4 me-1" />{L('رابط السيرة الذاتية', 'CV link')}</Button>}
            </div>
          </div>
        ))}
        <div className="rounded-md bg-muted p-3">
          <b>{L('تقرير الفحص المبدئي', 'Preliminary review report')}:</b>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{d.ai_cv_review || L('لا يوجد تقرير', 'No report')}</p>
        </div>
        {d.rejection_reason && <p className="text-destructive"><b>{L('سبب الرفض', 'Rejection reason')}:</b> {d.rejection_reason}</p>}
        {d.reviewed_at && <p className="text-muted-foreground">{L('تاريخ الرد', 'Reviewed')}: {new Date(d.reviewed_at).toLocaleString()}</p>}
        <div className="flex flex-wrap gap-2">
          {d.cv_url && <Button size="lg" variant="outline" onClick={() => openCv(d.cv_url!)}><FileText className="h-4 w-4 me-1" />{L('عرض السيرة الذاتية', 'View CV')}</Button>}
          {d.portfolio_url && <Button size="lg" variant="outline" onClick={() => window.open(d.portfolio_url!, '_blank')}><LinkIcon className="h-4 w-4 me-1" />{L('الرابط الإضافي', 'Extra link')}</Button>}
        </div>
        {actions && (
          <>
            <Textarea placeholder={L('سبب الرفض / ملاحظات', 'Rejection reason / notes')} value={reasons[d.id] ?? ''} onChange={(e) => setReasons({ ...reasons, [d.id]: e.target.value })} rows={2} />
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => decide(d.id, true)}><Check className="h-4 w-4 me-1" />{L('موافقة', 'Approve')}</Button>
              <Button size="lg" variant="destructive" onClick={() => decide(d.id, false)}><X className="h-4 w-4 me-1" />{L('رفض', 'Reject')}</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-24 max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold">{L('لوحة الأدمن', 'Admin panel')}</h1>
        {isAdmin === null ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
          <Tabs defaultValue="new">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
              <TabsTrigger value="new">{L('توثيق طبيب جديد', 'New doctor reviews')} ({pending.length})</TabsTrigger>
              <TabsTrigger value="done">{L('توثيق طبيب تم الرد عليه', 'Answered doctor reviews')} ({answered.length})</TabsTrigger>
              <TabsTrigger value="identity">{L('طلبات توثيق الهوية', 'Identity requests')} ({pendingIdentity.length})</TabsTrigger>
              <TabsTrigger value="bans">{L('الحظر', 'Bans')}</TabsTrigger>
            </TabsList>
            <TabsContent value="bans"><ChatBansAdmin /></TabsContent>
            <TabsContent value="identity" className="space-y-4">
              <Tabs defaultValue="user-pending" className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
                  <TabsTrigger value="user-pending">{L('مستخدمون جدد', 'New users')} ({pendingIdentity.filter((a) => a.account_type === 'user').length})</TabsTrigger>
                  <TabsTrigger value="doctor-pending">{L('أطباء جدد', 'New doctors')} ({pendingIdentity.filter((a) => a.account_type === 'doctor').length})</TabsTrigger>
                  <TabsTrigger value="user-answered">{L('مستخدمون تم الرد عليهم', 'Answered users')} ({answeredIdentity.filter((a) => a.account_type === 'user').length})</TabsTrigger>
                  <TabsTrigger value="doctor-answered">{L('أطباء تم الرد عليهم', 'Answered doctors')} ({answeredIdentity.filter((a) => a.account_type === 'doctor').length})</TabsTrigger>
                </TabsList>
                {(['user-pending', 'doctor-pending', 'user-answered', 'doctor-answered'] as const).map((tab) => {
                  const isPending = tab.endsWith('pending');
                  const accountType = tab.startsWith('doctor') ? 'doctor' : 'user';
                  const applications = (isPending ? pendingIdentity : answeredIdentity).filter((application) => application.account_type === accountType);
                  return <TabsContent key={tab} value={tab} className="space-y-4">
                    {applications.length === 0 ? <p className="text-muted-foreground">{L('لا توجد طلبات', 'No requests')}</p> : applications.map((application) => renderIdentityCard(application, isPending))}
                  </TabsContent>;
                })}
              </Tabs>
            </TabsContent>
            <TabsContent value="new" className="space-y-4">
              {pending.length === 0 ? <p className="text-muted-foreground">{L('لا توجد طلبات', 'No requests')}</p> : pending.map((d) => renderCard(d, true))}
            </TabsContent>
            <TabsContent value="done" className="space-y-4">
              {answered.length === 0 ? <p className="text-muted-foreground">{L('لا توجد طلبات', 'No requests')}</p> : answered.map((d) => renderCard(d, false))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
