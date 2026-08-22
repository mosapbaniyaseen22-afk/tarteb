'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { LabibLogo } from '@/components/labib-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { addAiMessage, loadAiMessages } from '@/lib/app-data';
import { labibPageInfo, labibQuickPrompts } from '@/lib/labib-page';
import { captureLabibScreen, readLabibScreenText } from '@/lib/labib-screen';
import { supabase, type AiConversation } from '@/lib/supabase';

export function LabibFloatChat() {
  const { user } = useAuth();
  const pathname = usePathname();
  const page = labibPageInfo(pathname);
  const prompts = labibQuickPrompts(pathname);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiConversation[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [screenPreview, setScreenPreview] = useState('');
  const [watching, setWatching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    void loadAiMessages(user.id).then(setMessages);
    const text = readLabibScreenText();
    setScreenPreview(text.replace(/\s+/g, ' ').slice(0, 140));
    setWatching(Boolean(text));
  }, [open, user, pathname]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, draft, open]);

  if (!user || pathname.startsWith('/ai')) return null;

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setSending(true);
    setInput('');
    setDraft('');

    const history = [...messages, { role: 'user' as const, content }];
    try {
      const [{ data }, userMsg, screen] = await Promise.all([
        supabase.auth.getSession(),
        addAiMessage({ user_id: user.id, role: 'user', content }),
        captureLabibScreen(),
      ]);
      if (userMsg) setMessages((prev) => [...prev, userMsg]);
      setWatching(Boolean(screen.text || screen.image));

      const token = data.session?.access_token;
      if (!token) throw new Error('سجّل الدخول للمحادثة مع لبيب');

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
      if (!reply) throw new Error('رد فارغ من لبيب، حاول مرة أخرى');

      const aiMsg = await addAiMessage({ user_id: user.id, role: 'assistant', content: reply });
      if (aiMsg) setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر الحصول على رد من لبيب');
    } finally {
      setDraft('');
      setSending(false);
    }
  };

  return (
    <div
      data-labib-chat
      className="pointer-events-none fixed bottom-[calc(5.1rem+env(safe-area-inset-bottom))] left-4 z-50 flex flex-col items-start gap-3 lg:bottom-6 lg:left-6"
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="pointer-events-auto flex h-[min(28rem,calc(100dvh-11rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.6rem] border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 bg-gradient-to-l from-[#2563EB] to-[#14B8A6] px-4 py-3 text-white">
              <LabibLogo size="sm" className="ring-white/40" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  لبيب
                  {watching ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-medium">
                      <Eye className="h-3 w-3" />
                      شايف شاشتك
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-[11px] text-white/85">على {page.title}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label="إغلاق الشات"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {messages.length === 0 ? (
                <div className="rounded-2xl bg-accent/50 p-3 text-sm">
                  <p className="font-semibold">أهلاً، أنا لبيب</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {screenPreview
                      ? `شايف صفحتك: ${screenPreview}`
                      : `موجود معك على ${page.title} وبقرأ الشاشة لما تحكي.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {prompts.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => void sendMessage(item)}
                        className="rounded-full bg-background px-3 py-1.5 text-[11px] font-medium shadow-sm"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                        msg.role === 'user' ? 'gradient-primary text-white' : 'glass-card'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {sending ? (
                draft ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl glass-card px-3 py-2 text-sm">
                      {draft}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="flex gap-1 rounded-2xl glass-card px-3 py-2">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                    </div>
                  </div>
                )
              ) : null}
            </div>

            <form
              className="flex items-center gap-2 border-t border-border/40 p-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="احكي مع لبيب..."
                className="h-11 rounded-2xl border-0 bg-accent/50"
                disabled={sending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || sending}
                className="h-11 w-11 rounded-2xl gradient-primary shadow-glow"
                aria-label="إرسال"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="pointer-events-auto relative h-16 w-16 overflow-visible rounded-full bg-transparent shadow-none transition hover:scale-105"
        aria-label={open ? 'إغلاق لبيب' : 'فتح محادثة لبيب'}
      >
        {!open ? <span className="absolute -inset-1 rounded-full bg-primary/20 blur-md" /> : null}
        {open ? (
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] shadow-glow">
            <X className="h-6 w-6 text-white" />
          </span>
        ) : (
          <img
            src="/labib-bubble.png"
            alt="لبيب"
            className="relative h-16 w-16 rounded-full object-cover drop-shadow-lg"
          />
        )}
      </button>
    </div>
  );
}
