import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Moon, Sun, Menu, User, LogIn, Stethoscope,
  Dumbbell, Settings as SettingsIcon, Home, Siren, HeartPulse, Pill,
  Lightbulb, Salad, MapPin, Newspaper, Activity, BookOpen,
  Brain, ClipboardPlus, MessageSquare, Info, UsersRound, CircleHelp,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';

type ChatNotification = {
  id: string;
  recipient_user_id: string;
  conversation_id: string;
  sender_user_id: string;
  message_id: string;
  preview: string;
  is_read: boolean;
  created_at: string;
};

type ApplicationNotification = {
  id: string;
  recipient_user_id: string;
  request_id: string | null;
  event_type: string;
  title: string;
  body: string;
  href: string;
  is_read: boolean;
  created_at: string;
};

type Item =
  | { kind: 'section'; id: string; labelKey: string; icon: typeof Home }
  | { kind: 'route'; to: string; labelKey: string; icon: typeof Home; auth?: boolean };

const items: Item[] = [
  { kind: 'section', id: 'home', labelKey: 'nav.home', icon: Home },
  { kind: 'section', id: 'emergency', labelKey: 'nav.emergency', icon: Siren },
  { kind: 'section', id: 'first-aid', labelKey: 'nav.firstAid', icon: HeartPulse },
  { kind: 'route', to: '/first-aid-academy', labelKey: 'nav.firstAidAcademy', icon: BookOpen, auth: true },
  { kind: 'section', id: 'treatments', labelKey: 'nav.treatments', icon: Pill },
  { kind: 'section', id: 'mental-health', labelKey: 'nav.mentalHealth', icon: Brain },
  { kind: 'section', id: 'daily-tip', labelKey: 'nav.dailyTip', icon: Lightbulb },
  { kind: 'section', id: 'diet-plan', labelKey: 'nav.dietPlan', icon: Salad },
  { kind: 'section', id: 'physiotherapy', labelKey: 'nav.physiotherapy', icon: Activity },
  { kind: 'section', id: 'location', labelKey: 'nav.nearestHospitals', icon: MapPin },
  { kind: 'route', to: '/gym', labelKey: 'nav.gym', icon: Dumbbell },
  { kind: 'route', to: '/articles', labelKey: 'nav.articles', icon: Newspaper },
  { kind: 'route', to: '/how-to-use', labelKey: 'nav.howToUse', icon: CircleHelp },
  { kind: 'route', to: '/about', labelKey: 'nav.about', icon: Info },
  { kind: 'route', to: '/find-doctor', labelKey: 'nav.findDoctor', icon: Stethoscope, auth: true },
  { kind: 'route', to: '/personal-diagnosis', labelKey: 'nav.diagnose', icon: ClipboardPlus, auth: true },
  { kind: 'route', to: '/ask-me', labelKey: 'nav.askMe', icon: MessageSquare, auth: true },
  { kind: 'route', to: '/community', labelKey: 'nav.community', icon: UsersRound, auth: true },
  { kind: 'route', to: '/dashboard', labelKey: 'nav.dashboard', icon: User, auth: true },
];

export const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { t, language, L } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([]);
  const [applicationNotifications, setApplicationNotifications] = useState<ApplicationNotification[]>([]);
  const pendingSection = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setChatNotifications([]);
      setApplicationNotifications([]);
      return;
    }

    let active = true;
    const loadNotifications = async () => {
      const [chatResult, applicationResult] = await Promise.all([
        supabase.from('chat_notifications').select('*').eq('recipient_user_id', userId).order('created_at', { ascending: false }).limit(20),
        supabase.from('doctor_application_notifications').select('*').eq('recipient_user_id', userId).order('created_at', { ascending: false }).limit(20),
      ]);
      if (active && !chatResult.error) setChatNotifications((chatResult.data ?? []) as ChatNotification[]);
      if (active && !applicationResult.error) setApplicationNotifications((applicationResult.data ?? []) as ApplicationNotification[]);
      if (chatResult.error) console.error('Could not load chat notifications:', chatResult.error);
      if (applicationResult.error) console.error('Could not load doctor application notifications:', applicationResult.error);
    };

    void loadNotifications();
    const channel = supabase
      .channel(`chat-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_notifications',
        filter: `recipient_user_id=eq.${userId}`,
      }, (payload) => {
        const notification = payload.new as ChatNotification;
        setChatNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
        const openChat = () => navigate(`/chat/${notification.conversation_id}`);
        sonnerToast(L('رسالة جديدة من الطرف الآخر', 'New message from the other participant'), {
          description: notification.preview,
          action: { label: L('فتح المحادثة', 'Open chat'), onClick: openChat },
        });
        if ('Notification' in window && Notification.permission === 'granted') {
          const systemNotification = new Notification(L('رسالة جديدة', 'New message'), { body: notification.preview });
          systemNotification.onclick = () => { window.focus(); openChat(); systemNotification.close(); };
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'doctor_application_notifications',
        filter: `recipient_user_id=eq.${userId}`,
      }, (payload) => {
        const notification = payload.new as ApplicationNotification;
        setApplicationNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 20));
        const openApplication = () => navigate(notification.href);
        sonnerToast(notification.title, {
          description: notification.body,
          action: { label: L('فتح الطلب', 'Open request'), onClick: openApplication },
        });
        if ('Notification' in window && Notification.permission === 'granted') {
          const systemNotification = new Notification(notification.title, { body: notification.body });
          systemNotification.onclick = () => { window.focus(); openApplication(); systemNotification.close(); };
        }
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, language, navigate]);

  const openChatNotification = async (notification: ChatNotification) => {
    if (!notification.is_read) {
      const { error } = await supabase.from('chat_notifications').update({ is_read: true }).eq('id', notification.id);
      if (error) sonnerToast.error(L('تعذر تحديث الإشعار', 'Could not update notification'));
      setChatNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
    }
    navigate(`/chat/${notification.conversation_id}`);
  };

  const openApplicationNotification = async (notification: ApplicationNotification) => {
    if (!notification.is_read) {
      const { error } = await supabase.from('doctor_application_notifications').update({ is_read: true }).eq('id', notification.id);
      if (error) sonnerToast.error(L('تعذر تحديث الإشعار', 'Could not update notification'));
      setApplicationNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
    }
    navigate(notification.href);
  };

  /** Home-page sections are reachable from every page. */
  const goSection = (id: string) => {
    pendingSection.current = id;
    setOpen(false);
  };

  const visible = items.filter((i) => (i.kind === 'route' && i.auth ? Boolean(user) : true));

  const rowClass =
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-muted hover:translate-x-0.5 rtl:hover:-translate-x-0.5';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 transition-transform duration-200 hover:scale-[1.02]">
            <h1 className="text-2xl font-bold bg-gradient-medical bg-clip-text text-transparent">
              {t('brand.name')}
            </h1>
          </Link>

          <div className="flex items-center gap-1.5">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={L('الإشعارات', 'Notifications')}>
                    <Bell className="h-5 w-5" />
                    {(chatNotifications.some((notification) => !notification.is_read) || applicationNotifications.some((notification) => !notification.is_read)) && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[70vh] w-80 max-w-[90vw] overflow-y-auto">
                  <DropdownMenuLabel>{L('الإشعارات', 'Notifications')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {applicationNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={`application-${notification.id}`}
                      onSelect={() => void openApplicationNotification(notification)}
                      className={cn('block cursor-pointer whitespace-normal py-2', !notification.is_read && 'bg-primary/5')}
                    >
                      <span className="block font-medium">{notification.title}</span>
                      <span className="block text-xs text-muted-foreground">{notification.body}</span>
                      <span className="block text-[11px] text-muted-foreground">{new Date(notification.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </DropdownMenuItem>
                  ))}
                  {chatNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onSelect={() => void openChatNotification(notification)}
                      className={cn('block cursor-pointer whitespace-normal py-2', !notification.is_read && 'bg-primary/5')}
                    >
                      <span className="block font-medium">{L('رسالة جديدة', 'New message')}</span>
                      <span className="block text-xs text-muted-foreground">{notification.preview}</span>
                      <span className="block text-[11px] text-muted-foreground">{new Date(notification.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                    </DropdownMenuItem>
                  ))}
                  {chatNotifications.length === 0 && applicationNotifications.length === 0 && (
                    <DropdownMenuItem disabled>{L('لا توجد إشعارات جديدة', 'No notifications')}</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={t('theme.toggle')}
              className="rounded-full transition-transform duration-200 hover:rotate-12"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            {user ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                aria-label={t('nav.settings')}
                className="rounded-full transition-transform duration-200 hover:rotate-45"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} aria-label={t('nav.login')} className="gap-1">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.login')}</span>
              </Button>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('nav.menu')} className="rounded-full">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side={language === 'ar' ? 'right' : 'left'}
                className="w-[85vw] max-w-[300px] p-0"
                onCloseAutoFocus={(event) => {
                  const id = pendingSection.current;
                  if (!id) return;
                  event.preventDefault();
                  pendingSection.current = null;
                  navigate(id === 'diet-plan' && !user ? '/auth' : `/#${id}`);
                }}
              >
                <SheetHeader className="border-b border-border px-4 py-4">
                  <SheetTitle className="bg-gradient-medical bg-clip-text text-transparent">
                    {t('brand.name')}
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] px-3 py-3">
                  <nav className="flex flex-col gap-1">
                    {visible.map((item) =>
                      item.kind === 'section' ? (
                        <Button
                          key={item.id}
                          type="button"
                           variant="ghost"
                          onClick={() => goSection(item.id)}
                           className={cn(rowClass, 'h-auto justify-start text-start', location.pathname === '/' && location.hash === `#${item.id}` && 'bg-muted text-primary')}
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-primary" />
                          {t(item.labelKey)}
                        </Button>
                      ) : (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={cn(rowClass, location.pathname === item.to && 'bg-muted text-primary')}
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-primary" />
                          {t(item.labelKey)}
                        </Link>
                      ),
                    )}
                    {!user && (
                      <Link to="/auth" onClick={() => setOpen(false)} className={rowClass}>
                        <LogIn className="h-4 w-4 shrink-0 text-primary" />
                        {t('nav.login')}
                      </Link>
                    )}
                  </nav>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
