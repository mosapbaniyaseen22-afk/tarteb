'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { addAiMessage, loadAiMessages } from '@/lib/app-data';
import { labibPageInfo } from '@/lib/labib-page';
import { captureLabibScreen } from '@/lib/labib-screen';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Brain, BookOpen, Lightbulb, Target } from 'lucide-react';
import { toast } from 'sonner';
import type { AiConversation } from '@/lib/supabase';

const SUGGESTIONS = [
  { icon: BookOpen, text: 'اشرح لي درس التكامل في الرياضيات', color: '#2563EB' },
  { icon: Lightbulb, text: 'لخص لي فصل الكهرباء في الفيزياء', color: '#F59E0B' },
  { icon: Target, text: 'أنشئ لي خطة مذاكرة لامتحان الكيمياء', color: '#22C55E' },
  { icon: Brain, text: 'حل سؤال: ما هي خصائص الكائنات الحية؟', color: '#8B5CF6' },
];

export default function AiPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const page = labibPageInfo(pathname);
  const [messages, setMessages] = useState<AiConversation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setMessages(await loadAiMessages(user.id));
      setLoading(false);
    };
    void load();
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, draft]);

  const sendMessage = async (text: string) => {
    if (!user || !text.trim() || sending) return;
    const content = text.trim();
    setSending(true);
    setDraft('');
    setInput('');

    const history = [...messages, { role: 'user' as const, content }];
    const saveUser = addAiMessage({
      user_id: user.id,
      role: 'user',
      content,
    });

    try {
      const [{ data }, userMsg, screen] = await Promise.all([
        supabase.auth.getSession(),
        saveUser,
        captureLabibScreen(),
      ]);
      if (userMsg) setMessages((prev) => [...prev, userMsg]);

      const token = data.session?.access_token;
      if (!token) {
        throw new Error('سجّل الدخول لاستخدام لبيب AI');
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page,
          screen,
          messages: history.map((item) => ({ role: item.role, content: item.content })),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !response.body || contentType.includes('application/json')) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'تعذر الحصول على رد من لبيب');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setDraft(reply);
      }
      reply = reply.trim();
      if (!reply) {
        throw new Error('رد فارغ من لبيب، حاول مرة أخرى');
      }

      const aiMsg = await addAiMessage({
        user_id: user.id,
        role: 'assistant',
        content: reply,
      });
      if (aiMsg) setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر الحصول على رد من لبيب';
      toast.error(message);
    } finally {
      setDraft('');
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-3xl flex-col space-y-3 lg:h-[calc(100vh-8rem)] lg:space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">لبيب AI</h1>
          <p className="text-xs text-muted-foreground">مساعد سريع ومجاني للدراسة</p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden rounded-3xl border-0 glass-card shadow-soft">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 md:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary shadow-glow"
              >
                <Sparkles className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold">مرحباً! أنا لبيب</h2>
                <p className="mt-2 text-sm text-muted-foreground">كيف أساعدك في دراستك اليوم؟</p>
              </div>
              <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s.text}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-3 rounded-2xl glass-card p-3 text-right text-sm transition-all hover:scale-[1.02] hover:shadow-glow"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs">{s.text}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-primary">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] break-words whitespace-pre-wrap rounded-2xl p-3 text-sm md:max-w-[80%] md:p-4 ${
                        msg.role === 'user'
                          ? 'gradient-primary text-white shadow-glow'
                          : 'glass-card shadow-soft'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl gradient-primary">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  {draft ? (
                    <div className="max-w-[85%] break-words whitespace-pre-wrap rounded-2xl p-3 text-sm glass-card shadow-soft md:max-w-[80%] md:p-4">
                      {draft}
                    </div>
                  ) : (
                    <div className="glass-card flex items-center gap-1 rounded-2xl p-4">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center gap-2 pb-[env(safe-area-inset-bottom)] lg:pb-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !sending) void sendMessage(input); }}
          placeholder="اكتب سؤالك هنا..."
          className="h-12 min-w-0 flex-1 rounded-2xl glass-card border-0 text-base"
          disabled={sending}
        />
        <Button
          onClick={() => void sendMessage(input)}
          disabled={!input.trim() || sending}
          className="h-12 w-12 shrink-0 rounded-2xl gradient-primary shadow-glow"
          size="icon"
          aria-label="إرسال"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
