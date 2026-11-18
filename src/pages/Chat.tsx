import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookingPanel } from '@/components/chat/BookingPanel';
import { isSessionOpen, type BookingRow } from '@/lib/sessions';
import { 
  Send, 
  ArrowRight, 
  Paperclip, 
  Image as ImageIcon,
  Video,
  Mic,
  MicOff,
  AlertTriangle,
  Shield
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  name: string;
  avatar: string | null;
  isDoctor: boolean;
}

const getReadableError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const details = [value.message, value.details, value.hint, value.code]
      .filter((part): part is string => typeof part === 'string' && part.length > 0);
    if (details.length) return [...new Set(details)].join(' · ');
    try { return JSON.stringify(error); } catch { return 'Unknown error'; }
  }
  return 'Unknown error';
};

const Chat = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { L } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [otherParticipant, setOtherParticipant] = useState<Participant | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [conv, setConv] = useState<{ doctor_id: string; user_id: string } | null>(null);
  const [isDoctorSide, setIsDoctorSide] = useState(false);
  const [sessions, setSessions] = useState<BookingRow[]>([]);
  const [pendingSession, setPendingSession] = useState<BookingRow | null>(null);
  const [banned, setBanned] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  const loadSessions = async (c: { doctor_id: string; user_id: string }) => {
    const [{ data }, { data: ban }] = await Promise.all([
      supabase.from('doctor_bookings').select('starts_at,ends_at,status').eq('doctor_id', c.doctor_id).eq('user_id', c.user_id).in('status', ['pending', 'confirmed']).gte('ends_at', new Date(Date.now() - 3600000).toISOString()).order('starts_at'),
      supabase.rpc('can_chat', { _conversation_id: conversationId!, _user_id: user!.id }),
    ]);
    setSessions(data || []);
    setPendingSession((data || []).find((booking) => booking.status === 'pending') || null);
    const open = (data || []).some((b) => isSessionOpen(b));
    setBanned(open && ban === false);
  };
  const openSession = sessions.find((b) => isSessionOpen(b));
  const nextSession = sessions.find((b) => b.status === 'confirmed' && new Date(b.starts_at) > new Date());
  void tick;

  useEffect(() => {
    messages.forEach(async (m) => {
      if (m.file_url?.startsWith('storage:') && !signed[m.id]) {
        const { data } = await supabase.storage.from('chat-files').createSignedUrl(m.file_url.slice(8), 3600);
        if (data) setSigned((p) => ({ ...p, [m.id]: data.signedUrl }));
      }
    });
  }, [messages]);

  const sendFile = async (f: File) => {
    if (!user || !conversationId || !openSession || banned) { toast({ title: L('الجلسة غير متاحة', 'Session unavailable'), variant: 'destructive' }); return; }
    const contentType = f.type.split(';')[0].trim().toLowerCase();
    const supportedType = contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/') || [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(contentType);
    if (!supportedType) { toast({ title: L('نوع الملف غير مدعوم', 'File type not supported'), variant: 'destructive' }); return; }
    if (f.size > 50 * 1024 * 1024) { toast({ title: L('الملف أكبر من 50 ميجابايت', 'File exceeds 50MB'), variant: 'destructive' }); return; }
    setUploading(true);
    try {
    const path = `${conversationId}/${user.id}-${Date.now()}-${f.name.replace(/[^\w.-]/g, '_')}`;
    const up = await supabase.storage.from('chat-files').upload(path, f, { contentType });
    if (!up.error) {
      const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, content: null, file_url: `storage:${path}`, file_type: contentType || 'application/octet-stream' });
      if (error) toast({ title: L('تعذر الإرسال', 'Send failed'), description: error.message, variant: 'destructive' });
    } else toast({ title: L('تعذر رفع الملف', 'Upload failed'), description: up.error.message, variant: 'destructive' });
    } catch (error) {
      const message = getReadableError(error);
      toast({ title: L('تعذر إرسال المرفق', 'Attachment send failed'), description: message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast({ title: L('التسجيل الصوتي غير مدعوم في هذا المتصفح', 'Voice recording is not supported in this browser'), variant: 'destructive' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const extension = blob.type.includes('ogg') ? 'ogg' : 'webm';
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecording(false);
        if (blob.size > 0) void sendFile(new File([blob], `voice-${Date.now()}.${extension}`, { type: blob.type }));
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      const message = getReadableError(error);
      toast({ title: L('تعذر بدء التسجيل الصوتي', 'Could not start voice recording'), description: message, variant: 'destructive' });
    }
  };

  useEffect(() => () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (conversationId) {
      fetchConversation();
      return subscribeToMessages();
    }
  }, [conversationId, user]);

  useEffect(() => {
    if (!conv || !user) return;
    const channel = supabase.channel(`booking-updates-${user.id}-${conv.doctor_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctor_bookings', filter: `user_id=eq.${user.id}` }, () => {
        void loadSessions(conv);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conv, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    if (!conversationId || !user) return;

    try {
      // Fetch conversation details
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Determine the other participant
      const { data: docRow } = await supabase.from('doctors').select('user_id').eq('id', conv.doctor_id).maybeSingle();
      const isUserDoctor = docRow?.user_id === user.id;
      const otherUserId = isUserDoctor ? conv.user_id : conv.doctor_id;
      setConv({ doctor_id: conv.doctor_id, user_id: conv.user_id });
      setIsDoctorSide(isUserDoctor);
      loadSessions(conv);

      // Fetch other participant's profile
      if (isUserDoctor) {
        const { data: profiles } = await supabase.rpc('get_profile_public', { profile_user_id: otherUserId });
        const profile = profiles?.[0];
        
        setOtherParticipant({
          id: otherUserId,
          name: profile?.full_name || L('مستخدم', 'User'),
          avatar: profile?.avatar_url,
          isDoctor: false
        });
      } else {
        const { data: doctor } = await supabase
          .from('doctors')
          .select('user_id')
          .eq('id', conv.doctor_id)
          .single();
        
        if (doctor) {
          const { data: profiles } = await supabase.rpc('get_profile_public', { profile_user_id: doctor.user_id });
          const profile = profiles?.[0];
          
          setOtherParticipant({
            id: doctor.user_id,
            name: profile?.full_name || L('طبيب', 'Doctor'),
            avatar: profile?.avatar_url,
            isDoctor: true
          });
        }
      }

      // Fetch messages
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;
      setMessages(msgs || []);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast({
        title: L('خطأ', 'Error'),
        description: L('حدث خطأ أثناء تحميل المحادثة', 'An error occurred while loading the conversation'),
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkContentModeration = async (content: string): Promise<{ isSafe: boolean; reason?: string }> => {
    // Simple content moderation - check for inappropriate words
    const inappropriatePatterns = [
      /\b(سب|شتم|قذف|إساءة)\b/i,
      /\b(تهديد|قتل|ضرب)\b/i,
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(content)) {
        return { isSafe: false, reason: L('محتوى غير لائق', 'Inappropriate content') };
      }
    }

    return { isSafe: true };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !conversationId || !openSession || banned || sendingMessage) return;

    const messageContent = newMessage.trim();
    setSendingMessage(true);

    try {
      // Check content moderation
      const moderation = await checkContentModeration(messageContent);

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
          is_flagged: !moderation.isSafe,
          flag_reason: moderation.reason || null
        });

      if (error) throw error;
      setNewMessage('');

      if (!moderation.isSafe) {
        toast({
          title: L('تحذير', 'Warning'),
          description: L('تم إرسال رسالتك لكنها تم تمييزها للمراجعة', 'Your message was sent but flagged for review'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const message = getReadableError(error);
      toast({
        title: L('خطأ', 'Error'),
        description: message,
        variant: 'destructive'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">{L('جاري التحميل...', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          {otherParticipant && (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherParticipant.avatar || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {otherParticipant.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">
                  {otherParticipant.isDoctor ? L('د. ', 'Dr. ') : ''}{otherParticipant.name}
                </h2>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 text-green-500" />
                  {L('محادثة مشفرة', 'Encrypted conversation')}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}
              >
                <Card
                  className={`max-w-[80%] p-3 ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  } ${message.is_flagged ? 'border-yellow-500 border-2' : ''}`}
                >
                  {message.is_flagged && (
                    <div className="flex items-center gap-1 text-xs text-yellow-500 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      {L('تم تمييز هذه الرسالة', 'This message has been flagged')}
                    </div>
                  )}
                  {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
                  {message.file_url && (
                    <div className="mt-2">
                      {message.file_type?.startsWith('image/') ? (
                        <img
                          src={message.file_url.startsWith('storage:') ? signed[message.id] : message.file_url}
                          alt={L('مرفق', 'Attachment')}
                          className="max-w-full rounded-lg"
                        />
                      ) : message.file_type?.startsWith('video/') ? (
                        <video
                          controls
                          preload="metadata"
                          src={message.file_url.startsWith('storage:') ? signed[message.id] : message.file_url}
                          className="max-h-96 w-full rounded-lg bg-black"
                        />
                      ) : message.file_type?.startsWith('audio/') ? (
                        <audio
                          controls
                          preload="metadata"
                          src={message.file_url.startsWith('storage:') ? signed[message.id] : message.file_url}
                          className="w-full"
                        />
                      ) : (
                        <a 
                          href={message.file_url.startsWith('storage:') ? signed[message.id] : message.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm underline"
                        >
                          {L('تحميل المرفق', 'Download attachment')}
                        </a>
                      )}
                    </div>
                  )}
                  <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'} mt-1 block`}>
                    {new Date(message.created_at).toLocaleTimeString('ar-EG', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </Card>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-background p-4">
        {banned ? (
          <p className="max-w-2xl mx-auto text-center text-sm text-destructive">{L('المحادثة موقوفة من الإدارة', 'This chat has been suspended by moderators')}</p>
        ) : !openSession ? (
          <div className="max-w-2xl mx-auto space-y-2">
            {pendingSession && <p className="text-center text-sm text-amber-600">{L('طلب الحجز المرسل بانتظار موافقة الطبيب.', 'Your booking request is waiting for the doctor’s approval.')}</p>}
            {nextSession && <p className="text-sm text-center">{L('جلستك القادمة:', 'Next session:')} {new Date(nextSession.starts_at).toLocaleString('ar-EG', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
            {conv && user && !isDoctorSide ? <BookingPanel doctorId={conv.doctor_id} canBook onBooked={() => loadSessions(conv)} />
              : <p className="text-sm text-center text-muted-foreground">{L('المحادثة بتفتح وقت الجلسة المحجوزة فقط', 'Chat opens only during a booked session')}</p>}
          </div>
        ) : (
        <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,application/pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendFile(f); e.target.value = ''; }} />
          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendFile(f); e.target.value = ''; }} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void sendFile(f); e.target.value = ''; }} />
          <Button size="icon" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label={L('إرفاق صورة أو ملف', 'Attach image or file')}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => imageRef.current?.click()} disabled={uploading} aria-label={L('إرسال صورة', 'Send image')}>
            <ImageIcon className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => videoRef.current?.click()} disabled={uploading} aria-label={L('إرسال فيديو', 'Send video')}>
            <Video className="w-4 h-4" />
          </Button>
          <Button size="icon" variant={isRecording ? 'destructive' : 'outline'} onClick={() => void toggleVoiceRecording()} disabled={uploading} aria-label={isRecording ? L('إيقاف التسجيل وإرسال الصوت', 'Stop and send voice message') : L('تسجيل رسالة صوتية', 'Record a voice message')}>
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            placeholder={L('اكتب رسالتك...', 'Type your message...')}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-w-[120px] flex-1"
          />
          <Button 
            size="icon" 
            className="bg-gradient-medical"
            onClick={sendMessage}
            disabled={!newMessage.trim() || sendingMessage}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
