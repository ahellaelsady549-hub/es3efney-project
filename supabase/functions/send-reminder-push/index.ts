import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import webpush from 'npm:web-push@3.6.7';

type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type ReminderSubscription = {
  id: string;
  user_id: string;
  subscription: WebPushSubscription;
  timezone: string;
  medication_reminders: boolean;
  appointment_reminders: boolean;
  chat_messages: boolean;
};

type Appointment = {
  id: string;
  user_id: string;
  doctor_id: string;
  starts_at: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const localDateAndTime = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
};

serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const now = new Date();
  const [{ data: subscriptions, error: subscriptionsError }, { data: medications, error: medicationsError }, { data: appointments, error: appointmentsError }, { data: chatNotifications, error: chatNotificationsError }] = await Promise.all([
    supabase.from('web_push_subscriptions')
      .select('id,user_id,subscription,timezone,medication_reminders,appointment_reminders,chat_messages'),
    supabase.from('user_medications')
      .select('id,user_id,name,dosage,time')
      .eq('reminder_enabled', true),
    supabase.from('doctor_bookings')
      .select('id,user_id,doctor_id,starts_at')
      .eq('status', 'confirmed')
      .gte('starts_at', new Date(now.getTime() - 15 * 60 * 1000).toISOString())
      .lte('starts_at', new Date(now.getTime() + 31 * 60 * 1000).toISOString()),
    supabase.from('chat_notifications')
      .select('id,recipient_user_id,conversation_id,preview,created_at')
      .eq('is_read', false)
      .gte('created_at', new Date(now.getTime() - 10 * 60 * 1000).toISOString()),
  ]);
  const queryError = subscriptionsError || medicationsError || appointmentsError || chatNotificationsError;
  if (queryError) {
    console.error('Could not load reminder data for Web Push:', queryError);
    return jsonResponse({ error: 'Could not load reminder data' }, 500);
  }

  const appointmentRows = (appointments ?? []) as Appointment[];
  const doctorIds = [...new Set(appointmentRows.map((appointment) => appointment.doctor_id))];
  const doctorsResult = doctorIds.length
    ? await supabase.from('doctors').select('id,user_id').in('id', doctorIds)
    : { data: [], error: null };
  if (doctorsResult.error) {
    console.error('Could not load doctors for appointment reminders:', doctorsResult.error);
    return jsonResponse({ error: 'Could not load appointment doctors' }, 500);
  }
  const doctorUserById = new Map((doctorsResult.data ?? []).map((doctor) => [doctor.id, doctor.user_id]));
  const chatByBookingId = new Map<string, string>();
  const sessionStartRows: {
    booking_id: string;
    conversation_id: string;
    recipient_user_id: string;
    event_type: string;
    title: string;
    body: string;
    href: string;
  }[] = [];
  for (const appointment of appointmentRows) {
    const elapsed = now.getTime() - new Date(appointment.starts_at).getTime();
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .upsert({ user_id: appointment.user_id, doctor_id: appointment.doctor_id }, { onConflict: 'user_id,doctor_id' })
      .select('id')
      .single();
    if (conversationError || !conversation) {
      console.error('Could not resolve session chat for appointment notification:', conversationError);
      continue;
    }
    chatByBookingId.set(appointment.id, conversation.id);
    if (elapsed < 0 || elapsed >= 15 * 60 * 1000) continue;

    const recipients = new Set([appointment.user_id, doctorUserById.get(appointment.doctor_id)].filter((id): id is string => Boolean(id)));
    for (const recipientUserId of recipients) {
      sessionStartRows.push({
        booking_id: appointment.id,
        conversation_id: conversation.id,
        recipient_user_id: recipientUserId,
        event_type: 'session_started',
        title: 'حان موعد جلستك الطبية',
        body: 'بدأ موعد الجلسة. اضغط للدخول إلى محادثة الطبيب.',
        href: `/chat/${conversation.id}`,
      });
    }
  }

  let inAppNotificationsCreated = 0;
  if (sessionStartRows.length) {
    const { data, error } = await supabase.from('appointment_notifications')
      .upsert(sessionStartRows, { onConflict: 'booking_id,recipient_user_id,event_type', ignoreDuplicates: true })
      .select('id');
    if (error) {
      console.error('Could not create in-app appointment notifications:', error);
      return jsonResponse({ error: 'Could not create appointment notifications' }, 500);
    }
    inAppNotificationsCreated = data?.length ?? 0;
  }

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.warn('Web Push VAPID secrets are not configured; in-app appointment notifications were still created.');
    return jsonResponse({ sent: 0, failed: 0, inAppNotificationsCreated });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  let sent = 0;
  let failed = 0;
  for (const subscription of (subscriptions ?? []) as ReminderSubscription[]) {
    const pending: { key: string; title: string; body: string; url: string }[] = [];

    if (subscription.medication_reminders) {
      const { date, time } = localDateAndTime(now, subscription.timezone || 'UTC');
      for (const medication of (medications ?? []).filter((item) => item.user_id === subscription.user_id)) {
        let times: unknown = medication.time;
        try {
          times = JSON.parse(medication.time);
        } catch {
          // Legacy medication rows store one plain time string.
        }
        const doseTimes = Array.isArray(times) ? times : [times];
        if (!doseTimes.includes(time)) continue;
        pending.push({
          key: `medication:${subscription.user_id}:${medication.id}:${date}:${time}`,
          title: 'تذكير بموعد الدواء 💊',
          body: `حان موعد تناول ${medication.name} - ${medication.dosage}`,
          url: '/dashboard?tab=medications',
        });
      }
    }

    if (subscription.appointment_reminders) {
      for (const appointment of appointmentRows.filter((item) =>
        item.user_id === subscription.user_id || doctorUserById.get(item.doctor_id) === subscription.user_id
      )) {
        const startsAt = new Date(appointment.starts_at);
        for (const stage of [
          { offset: 30 * 60 * 1000, key: '30m', body: 'موعد الطبيب بعد نصف ساعة.', grace: 2 * 60 * 1000 },
          { offset: 0, key: 'now', body: 'حان موعد جلستك الطبية الآن.', grace: 15 * 60 * 1000 },
        ]) {
          const dueAt = startsAt.getTime() - stage.offset;
          if (now.getTime() < dueAt || now.getTime() - dueAt >= stage.grace) continue;
          pending.push({
            key: `appointment:${subscription.user_id}:${appointment.id}:${stage.key}`,
            title: stage.key === 'now' ? 'حان موعد جلستك الطبية' : 'تذكير بموعد الطبيب',
            body: stage.body,
            url: `/chat/${chatByBookingId.get(appointment.id) || ''}`,
          });
        }
      }
    }

    if (subscription.chat_messages) {
      for (const notification of (chatNotifications ?? []).filter((item) => item.recipient_user_id === subscription.user_id)) {
        pending.push({
          key: `chat:${notification.id}`,
          title: 'رسالة جديدة في محادثة الطبيب',
          body: notification.preview,
          url: `/chat/${notification.conversation_id}`,
        });
      }
    }

    for (const reminder of pending) {
      const { error: claimError } = await supabase.from('web_push_reminder_deliveries')
        .insert({ subscription_id: subscription.id, reminder_key: reminder.key });
      if (claimError?.code === '23505') continue;
      if (claimError) {
        console.error('Could not claim reminder delivery:', claimError);
        failed += 1;
        continue;
      }

      try {
        await webpush.sendNotification(subscription.subscription, JSON.stringify({
          title: reminder.title,
          body: reminder.body,
          tag: reminder.key,
          url: reminder.url,
        }));
        sent += 1;
      } catch (error) {
        console.error('Could not send Web Push reminder:', error);
        failed += 1;
        const { error: releaseError } = await supabase.from('web_push_reminder_deliveries')
          .delete()
          .eq('subscription_id', subscription.id)
          .eq('reminder_key', reminder.key);
        if (releaseError) console.error('Could not release failed reminder delivery:', releaseError);
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          const { error: subscriptionError } = await supabase.from('web_push_subscriptions')
            .delete()
            .eq('id', subscription.id);
          if (subscriptionError) console.error('Could not remove expired Web Push subscription:', subscriptionError);
        }
      }
    }
  }

  return jsonResponse({ sent, failed, inAppNotificationsCreated });
});
