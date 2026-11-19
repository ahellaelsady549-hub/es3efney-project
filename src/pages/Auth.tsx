import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Heart, Mail, Lock, User, Home, KeyRound, Stethoscope, FileText, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { medicalSpecialties } from '@/data/specialties';
import QuickBotTest from '@/components/QuickBotTest';

const emailSchema = z.string().email('البريد الإلكتروني غير صالح / Invalid email address');
const passwordSchema = z.string().min(6, 'كلمة المرور 6 أحرف على الأقل / Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'الاسم حرفين على الأقل / Name must be at least 2 characters');

type PendingSignupData = {
  userType: 'user' | 'doctor';
  nationalId: string;
  governorate: string;
  homeAddress: string;
  identityFront: File;
  identityBack: File;
  doctorSpecialty: string;
  doctorBio: string;
  doctorCvFile: File | null;
  doctorCvUrl: string;
  doctorPortfolioUrl: string;
  cvReview: string | null;
};

const Auth = () => {
  const { user, signIn, loading } = useAuth();
  const { L } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  
  // User type selection
  const [userType, setUserType] = useState<'user' | 'doctor'>('user');
  
  // Doctor specific fields
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [doctorBio, setDoctorBio] = useState('');
  const [doctorCvUrl, setDoctorCvUrl] = useState('');
  const [doctorCvFile, setDoctorCvFile] = useState<File | null>(null);
  const [doctorPortfolioUrl, setDoctorPortfolioUrl] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [governorate, setGovernorate] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  
  // AI CV Review
  const [isReviewingCv, setIsReviewingCv] = useState(false);
  const [cvReview, setCvReview] = useState<string | null>(null);
  
  // OTP verification states
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUserData, setPendingUserData] = useState<PendingSignupData | null>(null);
  const [pendingVerifiedUserId, setPendingVerifiedUserId] = useState<string | null>(null);
  const [signupSubmitted, setSignupSubmitted] = useState(false);

  const saveSignupApplications = async (userId: string, signup: PendingSignupData) => {
    const uploaded: Array<{ bucket: string; path: string }> = [];
    const token = crypto.randomUUID();

    try {
      const upload = async (bucket: string, path: string, file: File, contentType?: string) => {
        const { error } = await supabase.storage.from(bucket).upload(path, file, contentType ? { contentType } : {});
        if (error) throw error;
        uploaded.push({ bucket, path });
      };

      const frontPath = `${userId}/front-${token}`;
      const backPath = `${userId}/back-${token}`;
      await upload('identity-documents', frontPath, signup.identityFront);
      await upload('identity-documents', backPath, signup.identityBack);

      let cvPath: string | null = null;
      if (signup.userType === 'doctor') {
        if (!signup.doctorCvFile) throw new Error(L('ملف السيرة الذاتية مطلوب', 'The CV file is required'));
        cvPath = `${userId}/${Date.now()}-${signup.doctorCvFile.name.replace(/[^\w.-]/g, '_')}`;
        await upload('doctor-cvs', cvPath, signup.doctorCvFile, 'application/pdf');
      }

      const { error: identityError } = await supabase.from('identity_applications').insert({
        user_id: userId,
        national_id: signup.nationalId,
        governorate: signup.governorate,
        home_address: signup.homeAddress,
        id_front_path: frontPath,
        id_back_path: backPath,
        account_type: signup.userType,
        status: 'pending',
      });
      if (identityError) throw identityError;

      if (signup.userType === 'doctor') {
        const { error: doctorError } = await supabase.from('doctors').upsert({
          user_id: userId,
          specialty: signup.doctorSpecialty,
          bio: signup.doctorBio,
          cv_url: cvPath,
          portfolio_url: signup.doctorPortfolioUrl || null,
          ai_cv_review: signup.cvReview,
          is_verified: false,
          verification_status: 'pending',
        }, { onConflict: 'user_id' });
        if (doctorError) throw doctorError;
      }
    } catch (error) {
      await Promise.all(uploaded.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path])));
      throw error;
    }
  };
  

  useEffect(() => {
    if (user && !isLoading && !showOtpInput && !pendingVerifiedUserId && !signupSubmitted) {
      navigate('/');
    }
  }, [user, navigate, isLoading, showOtpInput, pendingVerifiedUserId, signupSubmitted]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: L('خطأ في البيانات','Invalid data'),
          description: err.errors[0].message,
          variant: 'destructive'
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: L('خطأ في تسجيل الدخول','Sign-in error'),
        description: error.message === 'Invalid login credentials' 
          ? L('البريد الإلكتروني أو كلمة المرور غير صحيحة','Incorrect email or password')
          : error.message === 'Email not confirmed'
          ? L('البريد الإلكتروني غير مؤكد، يرجى التحقق من بريدك','Email not confirmed, please check your inbox')
          : error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: L('تم تسجيل الدخول بنجاح','Signed in successfully'),
        description: L('مرحباً بك في إسعفني','Welcome to Es3efny')
      });
    }
  };

  const reviewCvWithAI = async () => {
    if (!doctorCvUrl) {
      toast({
        title: L('خطأ','Error'),
        description: L('يرجى إدخال رابط السيرة الذاتية أولاً','Please enter your CV link first'),
        variant: 'destructive'
      });
      return;
    }

    setIsReviewingCv(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `أنت مراجع سير ذاتية محترف. قم بمراجعة السيرة الذاتية للطبيب المتقدم وأعطه تقييماً موجزاً. 
          الرابط: ${doctorCvUrl}
          التخصص المطلوب: ${medicalSpecialties.find(s => s.value === doctorSpecialty)?.labelAr || doctorSpecialty}
          
          أجب بتقييم موجز (3-4 جمل) يتضمن:
          1. هل الرابط يبدو صالحاً؟
          2. نصائح عامة للطبيب
          3. التوقعات من السيرة الذاتية الجيدة`
        }
      });

      if (error) throw error;
      setCvReview(data?.response || L('تم استلام السيرة الذاتية وسيتم مراجعتها','CV received and will be reviewed'));
    } catch (error) {
      console.error('Error reviewing CV:', error);
      setCvReview(L('تم استلام السيرة الذاتية وسيتم مراجعتها من قبل الإدارة','CV received and will be reviewed by our team'));
    } finally {
      setIsReviewingCv(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      
      if (!/^\d{14}$/.test(nationalId)) {
        toast({ title: L('رقم قومي غير صالح', 'Invalid national ID'), description: L('أدخل 14 رقمًا مصريًا', 'Enter a 14-digit Egyptian national ID'), variant: 'destructive' }); return;
      }
      if (!governorate.trim() || !homeAddress.trim() || !idFront || !idBack) {
        toast({ title: L('بيانات ناقصة', 'Missing information'), description: L('أكمل المحافظة والعنوان وارفع وجهي البطاقة', 'Enter governorate and address, and upload both ID sides'), variant: 'destructive' }); return;
      }
      if (userType === 'doctor' && !doctorSpecialty) {
        toast({
          title: L('خطأ في البيانات','Invalid data'),
          description: L('يرجى اختيار التخصص الطبي','Please select a medical specialty'),
          variant: 'destructive'
        });
        return;
      }
      if (userType === 'doctor') {
        const msg = doctorBio.trim().length < 20
          ? L('النبذة عن الطبيب إلزامية (20 حرفًا على الأقل)', 'Doctor bio is required (at least 20 characters)')
          : !doctorCvFile
          ? L('رفع ملف السيرة الذاتية PDF إلزامي', 'Uploading a PDF CV is required')
          : doctorCvFile.type !== 'application/pdf' || !doctorCvFile.name.toLowerCase().endsWith('.pdf')
          ? L('السيرة الذاتية يجب أن تكون بصيغة PDF', 'The CV must be a PDF')
          : doctorCvFile.size > 300 * 1024 * 1024
          ? L('حجم الملف أكبر من 300 ميجا', 'File is larger than 300 MB')
          : null;
        if (msg) {
          toast({ title: L('خطأ في البيانات','Invalid data'), description: msg, variant: 'destructive' });
          return;
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: L('خطأ في البيانات','Invalid data'),
          description: err.errors[0].message,
          variant: 'destructive'
        });
        return;
      }
    }

    setIsLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { full_name: signupName, account_type: userType, national_id: nationalId, governorate, home_address: homeAddress }
      }
    });

    if (error) {
      setIsLoading(false);
      if (error.message.includes('already registered')) {
        toast({
          title: L('خطأ في التسجيل','Sign-up error'),
          description: L('هذا البريد الإلكتروني مسجل بالفعل','This email is already registered'),
          variant: 'destructive'
        });
      } else {
        toast({
          title: L('خطأ في التسجيل','Sign-up error'),
          description: error.message,
          variant: 'destructive'
        });
      }
      return;
    }

    if (!data.user) {
      setIsLoading(false);
      toast({ title: L('تعذر إنشاء الحساب', 'Could not create account'), description: L('لم يصل تأكيد إنشاء الحساب من الخادم', 'The server did not confirm account creation'), variant: 'destructive' });
      return;
    }

    const signup: PendingSignupData = {
      userType,
      nationalId,
      governorate,
      homeAddress,
      identityFront: idFront!,
      identityBack: idBack!,
      doctorSpecialty,
      doctorBio,
      doctorCvFile,
      doctorCvUrl,
      doctorPortfolioUrl,
      cvReview,
    };

    if (!data.session) {
      setPendingEmail(signupEmail);
      setPendingUserData(signup);
      setOtpValue('');
      setShowOtpInput(true);
      setIsLoading(false);
      toast({
        title: L('تحقق من بريدك الإلكتروني', 'Check your email'),
        description: L('أدخل رمز التحقق لنحفظ طلب التوثيق والملفات بأمان.', 'Enter the verification code so we can securely save your application and files.'),
      });
      return;
    }

    try {
      await saveSignupApplications(data.user.id, signup);
    } catch (err) {
      console.error('Error saving signup application:', err);
      setIsLoading(false);
      toast({
        title: L('تعذر حفظ طلب التوثيق', 'Could not save verification request'),
        description: err instanceof Error ? err.message : L('راجع إعدادات قاعدة البيانات والتخزين ثم حاول مجددًا.', 'Check database and storage setup, then try again.'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(false);
    setSignupSubmitted(true);
    toast({
      title: L('حسابك قيد المراجعة', 'Your account is under review'),
      description: userType === 'doctor'
        ? L('استلمنا طلب توثيق الهوية والسيرة الذاتية. ستظهر نتيجة المراجعة في لوحة التحكم.', 'Your identity and CV applications were received. The review result will appear in your dashboard.')
        : L('استلمنا بيانات التحقق. ستظهر نتيجة المراجعة في لوحة التحكم.', 'Your verification details were received. The review result will appear in your dashboard.')
    });
    navigate('/dashboard');
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast({
        title: L('خطأ','Error'),
        description: L('يرجى إدخال رمز التحقق المكون من 6 أرقام','Please enter the 6-digit verification code'),
        variant: 'destructive'
      });
      return;
    }
    setIsLoading(true);

    let verifiedUserId = pendingVerifiedUserId;
    if (!verifiedUserId) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otpValue,
        type: 'signup',
      });

      if (error || !data.user) {
        setIsLoading(false);
        toast({
          title: L('خطأ في التحقق','Verification error'),
          description: error?.message || L('تعذر تأكيد الحساب', 'Could not verify the account'),
          variant: 'destructive',
        });
        return;
      }

      verifiedUserId = data.user.id;
      setPendingVerifiedUserId(verifiedUserId);
    }

    if (!pendingUserData) {
      setIsLoading(false);
      toast({ title: L('تعذر استكمال التسجيل', 'Could not finish signup'), description: L('بيانات التسجيل غير متاحة. سجل الدخول ثم أعد إرسال الطلب.', 'Signup details are no longer available. Sign in and resubmit the application.'), variant: 'destructive' });
      return;
    }

    try {
      await saveSignupApplications(verifiedUserId, pendingUserData);
    } catch (error) {
      console.error('Error saving verified signup application:', error);
      setIsLoading(false);
      toast({
        title: L('تم تأكيد البريد لكن تعذر حفظ الطلب', 'Email verified, but the application could not be saved'),
        description: error instanceof Error ? error.message : L('صحّح إعدادات التخزين أو قاعدة البيانات ثم اضغط تأكيد الرمز مجددًا.', 'Fix storage or database setup, then press Confirm code again.'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(false);
    setSignupSubmitted(true);
    toast({
      title: L('حسابك قيد المراجعة', 'Your account is under review'),
      description: pendingUserData?.userType === 'doctor' 
        ? L('تم تأكيد البريد واستلام طلب توثيق الهوية والسيرة الذاتية. تابع النتيجة من لوحة التحكم.', 'Email confirmed and identity/CV applications received. Follow the result in your dashboard.')
        : L('تم تأكيد البريد واستلام بيانات التحقق. تابع النتيجة من لوحة التحكم.', 'Email confirmed and verification details received. Follow the result in your dashboard.')
    });
    setPendingVerifiedUserId(null);
    setPendingUserData(null);
    setShowOtpInput(false);
    navigate('/dashboard');
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail
    });
    
    setIsLoading(false);

    if (error) {
      toast({
        title: L('خطأ','Error'),
        description: L('حدث خطأ أثناء إعادة إرسال الرمز','Something went wrong resending the code'),
        variant: 'destructive'
      });
    } else {
      toast({
        title: L('تم إعادة الإرسال','Resent'),
        description: L('تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني','A new verification code was sent to your email')
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">{L('جاري التحميل...','Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        className="absolute top-4 right-4"
      >
        <Home className="h-4 w-4 ml-2" />
        {L('الرئيسية','Home')}
      </Button>
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-medical rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-medical bg-clip-text text-transparent">
            {L('إسعفني','Es3efny')}
          </CardTitle>
          <CardDescription>
            {L('سجل دخولك لإدارة صحتك','Sign in to manage your health')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showOtpInput ? (
            <div className="space-y-6">
              <div className="text-center">
                <KeyRound className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{L('التحقق من البريد الإلكتروني','Email verification')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {L('أدخل رمز التحقق المرسل إلى','Enter the verification code sent to')}
                  <br />
                  <span className="font-medium text-foreground">{pendingEmail}</span>
                </p>
              </div>
              
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={handleVerifyOtp}
                className="w-full bg-gradient-medical hover:opacity-90"
                disabled={isLoading || otpValue.length !== 6}
              >
                {isLoading ? L('جاري التحقق...','Verifying...') : L('تأكيد الرمز','Confirm code')}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button 
                  variant="link" 
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="p-0"
                >
                  {L('إعادة إرسال الرمز','Resend code')}
                </Button>
                <Button 
                  variant="link" 
                  onClick={() => {
                    setShowOtpInput(false);
                    setPendingUserData(null);
                    setPendingVerifiedUserId(null);
                  }}
                  className="p-0"
                >
                  {L('تغيير البريد','Change email')}
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{L('تسجيل الدخول','Sign in')}</TabsTrigger>
                <TabsTrigger value="signup">{L('إنشاء حساب','Create account')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{L('البريد الإلكتروني','Email')}</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="example@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{L('كلمة المرور','Password')}</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pr-10 pl-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowLoginPassword((visible) => !visible)}
                        aria-label={showLoginPassword ? L('إخفاء كلمة المرور', 'Hide password') : L('إظهار كلمة المرور', 'Show password')}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-medical hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? L('جاري تسجيل الدخول...','Signing in...') : L('تسجيل الدخول','Sign in')}
                  </Button>
                  
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  {/* User Type Selection */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={userType === 'user' ? 'default' : 'outline'}
                      className={userType === 'user' ? 'bg-gradient-medical' : ''}
                      onClick={() => setUserType('user')}
                    >
                      <User className="w-4 h-4 ml-2" />
                      {L('مستخدم','User')}
                    </Button>
                    <Button
                      type="button"
                      variant={userType === 'doctor' ? 'default' : 'outline'}
                      className={userType === 'doctor' ? 'bg-gradient-medical' : ''}
                      onClick={() => setUserType('doctor')}
                    >
                      <Stethoscope className="w-4 h-4 ml-2" />
                      {L('طبيب','Doctor')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{L('الاسم الكامل','Full name')}</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder={L('محمد أحمد','John Smith')}
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{L('البريد الإلكتروني','Email')}</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="example@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{L('كلمة المرور','Password')}</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="pr-10 pl-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSignupPassword((visible) => !visible)}
                        aria-label={showSignupPassword ? L('إخفاء كلمة المرور', 'Hide password') : L('إظهار كلمة المرور', 'Show password')}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Doctor-specific fields */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label htmlFor="national-id">{L('الرقم القومي المصري (14 رقمًا)', 'Egyptian national ID (14 digits)')}</Label><Input id="national-id" inputMode="numeric" maxLength={14} value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0,14))} required /></div>
                    <div><Label htmlFor="governorate">{L('المحافظة', 'Governorate')}</Label><Input id="governorate" value={governorate} onChange={(e) => setGovernorate(e.target.value)} required /></div>
                    <div className="sm:col-span-2"><Label htmlFor="home-address">{L('عنوان السكن', 'Home address')}</Label><Input id="home-address" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} required /></div>
                    <div><Label htmlFor="id-front">{L('صورة البطاقة - الوجه', 'ID card front')}</Label><Input id="id-front" type="file" accept="image/*" required onChange={(e) => setIdFront(e.target.files?.[0] ?? null)} /></div>
                    <div><Label htmlFor="id-back">{L('صورة البطاقة - الظهر', 'ID card back')}</Label><Input id="id-back" type="file" accept="image/*" required onChange={(e) => setIdBack(e.target.files?.[0] ?? null)} /></div>
                  </div>
                  {userType === 'doctor' && (
                    <div className="space-y-4 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">{L('معلومات الطبيب','Doctor information')}</p>
                      
                      <div className="space-y-2">
                        <Label>{L('التخصص الطبي','Medical specialty')}</Label>
                        <Select value={doctorSpecialty} onValueChange={setDoctorSpecialty}>
                          <SelectTrigger>
                            <SelectValue placeholder={L('اختر التخصص','Choose a specialty')} />
                          </SelectTrigger>
                          <SelectContent>
                            {medicalSpecialties.map(spec => (
                              <SelectItem key={spec.value} value={spec.value}>
                                {spec.labelAr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{L('نبذة عنك (إلزامي)','About you (required)')}</Label>
                        <Textarea
                          placeholder={L('اكتب نبذة مختصرة عن خبراتك ومؤهلاتك...','Write a short bio about your experience and qualifications...')}
                          value={doctorBio}
                          onChange={(e) => setDoctorBio(e.target.value)}
                          rows={3}
                        />
                      </div>

                  <div className="space-y-2">
                    <Label>{L('ملف السيرة الذاتية PDF (إلزامي، حتى 300 ميجا)','CV file, PDF (required, up to 300 MB)')}</Label>
                    <Input type="file" accept="application/pdf,.pdf" required className="h-12" onChange={(e) => { setDoctorCvFile(e.target.files?.[0] ?? null); setCvReview(null); }} />
                    <Label>{L('رابط السيرة الذاتية (اختياري)','CV link (optional)')}</Label>
                    <Input type="url" placeholder="https://..." value={doctorCvUrl} onChange={(e) => setDoctorCvUrl(e.target.value)} />
                        {cvReview && (
                          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            {cvReview}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>{L('رابط البورتفوليو (اختياري)','Portfolio link (optional)')}</Label>
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={doctorPortfolioUrl}
                          onChange={(e) => setDoctorPortfolioUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-medical hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? L('جاري إنشاء الحساب...','Creating account...') : L('إنشاء حساب','Create account')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
          
          {/* Quick Bot Test */}
          <div className="border-t pt-4 mt-4">
            <QuickBotTest />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
