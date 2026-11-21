import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, MessageSquare, RefreshCw, Stethoscope } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type NotificationKind = 'chat' | 'application' | 'appointment';
type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  is_read: boolean;
  created_at: string;
};

const Notifications = () => {
  const { user, loading } = useAuth();
  const { language, L } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const [chats, applications, appointments] = await Promise.all([
      supabase.from('chat_notifications').select('*').eq('recipient_user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('doctor_application_notifications').select('*').eq('recipient_user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('appointment_notifications').select('*').eq('recipient_user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);

    if (chats.error) console.error('Could not load chat notifications:', chats.error);
    if (applications.error) console.error('Could not load application notifications:', applications.error);
    if (appointments.error) console.error('Could not load appointment notifications:', appointments.error);

    const merged: NotificationItem[] = [
      ...(chats.data ?? []).map((item) => ({
        id: item.id,
        kind: 'chat' as const,
        title: L('رسالة جديدة', 'New message'),
        body: item.preview,
        href: `/chat/${item.conversation_id}`,
        is_read: item.is_read,
        created_at: item.created_at,
      })),
      ...(applications.data ?? []).map((item) => ({
        id: item.id,
        kind: 'application' as const,
        title: item.title,
        body: item.body,
        href: item.href,
        is_read: item.is_read,
        created_at: item.created_at,
      })),
      ...(appointments.data ?? []).map((item) => ({
        id: item.id,
        kind: 'appointment' as const,
        title: item.title,
        body: item.body,
        href: item.href || `/chat/${item.conversation_id}`,
        is_read: item.is_read,
        created_at: item.created_at,
      })),
    ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    setItems(merged);
    setIsLoading(false);
  }, [L, user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    void loadNotifications();

    const channel = supabase.channel(`all-notifications-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_notifications', filter: `recipient_user_id=eq.${user.id}` }, () => void loadNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doctor_application_notifications', filter: `recipient_user_id=eq.${user.id}` }, () => void loadNotifications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointment_notifications', filter: `recipient_user_id=eq.${user.id}` }, () => void loadNotifications())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [loadNotifications, loading, navigate, user]);

  const openNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      const result = item.kind === 'chat'
        ? await supabase.from('chat_notifications').update({ is_read: true }).eq('id', item.id)
        : item.kind === 'application'
          ? await supabase.from('doctor_application_notifications').update({ is_read: true }).eq('id', item.id)
          : await supabase.from('appointment_notifications').update({ is_read: true }).eq('id', item.id);
      if (result.error) toast.error(L('تعذر تحديث حالة الإشعار', 'Could not update notification status'));
      else setItems((current) => current.map((notification) => notification.id === item.id && notification.kind === item.kind ? { ...notification, is_read: true } : notification));
    }
    navigate(item.href);
  };

  const getIcon = (kind: NotificationKind) => kind === 'chat' ? MessageSquare : kind === 'appointment' ? CalendarDays : Stethoscope;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6 pb-24">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black"><Bell className="h-6 w-6 text-primary" />{L('الإشعارات', 'Notifications')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{L('افتح الرسالة أو الطلب أو موعد الجلسة مباشرة من هنا.', 'Open a message, request, or session appointment from here.')}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => void loadNotifications()} disabled={isLoading} aria-label={L('تحديث الإشعارات', 'Refresh notifications')}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground" role="status">{L('جاري تحميل الإشعارات...', 'Loading notifications...')}</CardContent></Card>
        ) : items.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">{L('لا توجد إشعارات حتى الآن.', 'There are no notifications yet.')}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = getIcon(item.kind);
              return (
                <button key={`${item.kind}-${item.id}`} type="button" onClick={() => void openNotification(item)} className="w-full rounded-xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Card className={`transition-colors hover:border-primary/40 ${!item.is_read ? 'border-primary/30 bg-primary/[0.04]' : ''}`}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-bold">{item.title}</span>
                          {!item.is_read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label={L('غير مقروء', 'Unread')} />}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">{item.body}</span>
                        <span className="mt-2 block text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      </span>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
