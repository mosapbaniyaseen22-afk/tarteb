'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark,
  Check,
  ChevronRight,
  Download,
  Loader2,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { addNote, deleteNote, loadJournalNotes, updateNote } from '@/lib/app-data';
import { downloadJournalNotePdf } from '@/lib/journal-pdf';
import {
  JOURNAL_PROMPTS,
  NOTE_MOODS,
  NOTE_PAPERS,
  defaultJournalTitle,
  formatJournalStamp,
  journalPreview,
  journalWordCount,
  noteMoodMeta,
  notePaperTheme,
  sortJournalNotes,
} from '@/lib/journal';
import type { Note } from '@/lib/supabase';

type SaveState = 'idle' | 'saving' | 'saved';

function saveLabel(state: SaveState) {
  switch (state) {
    case 'idle':
      return 'الدفتر جاهز';
    case 'saving':
      return 'عم ينحفظ…';
    case 'saved':
      return 'تم الحفظ';
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function JournalNotebook() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const draftRef = useRef<Note | null>(null);
  const timerRef = useRef<number | null>(null);

  const active = notes.find((note) => note.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim();
    const list = needle
      ? notes.filter((note) => `${note.title} ${note.content}`.includes(needle))
      : notes;
    return sortJournalNotes(list);
  }, [notes, query]);

  useEffect(() => {
    if (!user) return;
    void loadJournalNotes(user.id).then((rows) => {
      const sorted = sortJournalNotes(rows);
      setNotes(sorted);
      setActiveId(sorted[0]?.id ?? null);
      draftRef.current = sorted[0] ?? null;
      setLoading(false);
    });
  }, [user]);

  const flushSave = useCallback(async () => {
    const draft = draftRef.current;
    if (!draft) return;
    setSaveState('saving');
    const updated = await updateNote(draft.id, {
      title: draft.title,
      content: draft.content,
      mood: draft.mood,
      paper: draft.paper,
      pinned: draft.pinned,
    });
    if (updated) {
      setNotes((prev) => prev.map((note) => (note.id === updated.id ? updated : note)));
    }
    setSaveState('saved');
  }, []);

  const scheduleSave = useCallback(
    (patch: Partial<Pick<Note, 'title' | 'content' | 'mood' | 'paper' | 'pinned'>>) => {
      setNotes((prev) => {
        const nextNotes = prev.map((note) => (note.id === activeId ? { ...note, ...patch } : note));
        draftRef.current = nextNotes.find((note) => note.id === activeId) ?? null;
        return nextNotes;
      });
      setSaveState('saving');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void flushSave();
      }, 650);
    },
    [activeId, flushSave],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const draft = draftRef.current;
      if (!draft) return;
      void updateNote(draft.id, {
        title: draft.title,
        content: draft.content,
        mood: draft.mood,
        paper: draft.paper,
        pinned: draft.pinned,
      });
    };
  }, []);

  const openNote = (id: string) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      void flushSave();
    }
    const current = notes.find((note) => note.id === id) ?? null;
    draftRef.current = current;
    setActiveId(id);
    setMobileOpen(true);
  };

  const createNote = async (prompt?: string) => {
    if (!user) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      await flushSave();
    }
    const created = await addNote({
      user_id: user.id,
      subject_id: null,
      title: defaultJournalTitle(),
      content: prompt ? `${prompt}\n` : '',
      mood: null,
      paper: 'cream',
      pinned: false,
    });
    if (!created) {
      toast.error('تعذر فتح صفحة جديدة');
      return;
    }
    setNotes((prev) => sortJournalNotes([created, ...prev]));
    draftRef.current = created;
    setActiveId(created.id);
    setMobileOpen(true);
    setSaveState('saved');
  };

  const removeActive = async () => {
    if (!active) return;
    if (!window.confirm('تحذف هالصفحة من الدفتر؟')) return;
    await deleteNote(active.id);
    const remaining = notes.filter((note) => note.id !== active.id);
    setNotes(remaining);
    setActiveId(remaining[0]?.id ?? null);
    draftRef.current = remaining[0] ?? null;
    setMobileOpen(false);
    toast.success('انمسحت الصفحة من الدفتر');
  };

  const exportPdf = async () => {
    const note = draftRef.current ?? active;
    if (!note || exporting) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      await flushSave();
    }
    setExporting(true);
    try {
      await downloadJournalNotePdf(draftRef.current ?? note);
      toast.success('تم تحميل المذكرة PDF');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تجهيز ملف PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-700 border-t-transparent" />
      </div>
    );
  }

  const theme = notePaperTheme(active?.paper ?? 'cream');
  const words = journalWordCount(active?.content ?? '');

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-800/80 dark:text-amber-200/80">دفتر خاص فيك</p>
          <h1 className="text-2xl font-bold md:text-3xl">مذكراتي</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اكتب يومك، مشاعرك، وإنجازاتك على ورق كراس عصري.
          </p>
        </div>
        <Button onClick={() => void createNote()} className="rounded-2xl gradient-primary shadow-glow">
          <Plus className="h-4 w-4" />
          صفحة جديدة
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {JOURNAL_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void createNote(prompt)}
            className="shrink-0 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:border-amber-700/30 hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className={`space-y-3 ${mobileOpen ? 'hidden lg:block' : 'block'}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="دور بمذكراتك…"
              className="rounded-2xl pr-9"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-[1.6rem] border border-dashed border-amber-800/20 bg-amber-50/50 p-6 text-center dark:bg-amber-950/20">
              <NotebookPen className="mx-auto mb-3 h-10 w-10 text-amber-800/40" />
              <p className="font-semibold">الدفتر فاضي</p>
              <p className="mt-1 text-sm text-muted-foreground">افتح أول صفحة واكتب اللي بخاطرك.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((note, index) => {
                const mood = noteMoodMeta(note.mood);
                const paper = notePaperTheme(note.paper);
                const selected = note.id === activeId;
                return (
                  <motion.button
                    key={note.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => openNote(note.id)}
                    className={`w-full rounded-2xl border p-3 text-right shadow-soft transition ${
                      selected
                        ? 'border-amber-700/30 ring-2 ring-amber-700/15'
                        : 'border-border/50 hover:-translate-y-0.5'
                    }`}
                    style={{ background: paper.bg, color: paper.ink }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          {note.pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : null}
                          <span className="truncate">{note.title || 'بدون عنوان'}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] opacity-75">{journalPreview(note.content)}</p>
                      </div>
                      <span className="shrink-0 text-lg">{mood?.emoji ?? '✎'}</span>
                    </div>
                    <div className="mt-2 text-[11px] opacity-60">{formatJournalStamp(note.updated_at)}</div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </aside>

        <section className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}>
          {active ? (
            <div className="overflow-hidden rounded-[1.8rem] border border-amber-900/10 shadow-2xl">
              <div className="flex min-h-[32rem]">
                <div className="relative hidden w-5 shrink-0 bg-gradient-to-b from-amber-950 via-amber-800 to-stone-900 sm:block">
                  {[18, 42, 66].map((top) => (
                    <span
                      key={top}
                      className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-stone-300/80 shadow-inner"
                      style={{ top: `${top}%` }}
                    />
                  ))}
                </div>
                <div
                  className="relative min-w-0 flex-1"
                  style={{
                    backgroundColor: theme.bg,
                    color: theme.ink,
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 1.95rem, ${theme.line} 1.95rem, ${theme.line} 2rem)`,
                  }}
                >
                  <div className="absolute inset-y-0 right-12 hidden w-px bg-rose-400/45 sm:block" />
                  <div className="flex items-center justify-between gap-2 px-4 py-3 sm:pr-16">
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 lg:hidden"
                      aria-label="رجوع للمذكرات"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1 text-[11px]" style={{ color: theme.muted }}>
                      {saveState === 'saving' ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {saveLabel(saveState)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          {saveState === 'saved' ? <Check className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                          {saveLabel(saveState)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void exportPdf()}
                        disabled={exporting}
                        className="flex h-9 items-center gap-1 rounded-full bg-black/5 px-3 text-[11px] font-semibold disabled:opacity-60"
                        aria-label="تحميل المذكرة PDF"
                      >
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => scheduleSave({ pinned: !active.pinned })}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5"
                        aria-label={active.pinned ? 'إلغاء التثبيت' : 'تثبيت الصفحة'}
                      >
                        <Pin className={`h-4 w-4 ${active.pinned ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeActive()}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-rose-700"
                        aria-label="حذف الصفحة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    value={active.title}
                    onChange={(event) => scheduleSave({ title: event.target.value })}
                    onBlur={() => void flushSave()}
                    placeholder="عنوان الصفحة"
                    className="w-full bg-transparent px-4 pb-2 text-2xl font-bold outline-none sm:pr-16"
                    style={{ color: theme.ink }}
                  />

                  <div className="flex flex-wrap gap-1.5 px-4 pb-3 sm:pr-16">
                    {NOTE_MOODS.map((mood) => (
                      <button
                        key={mood.id}
                        type="button"
                        onClick={() => scheduleSave({ mood: active.mood === mood.id ? null : mood.id })}
                        className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                          active.mood === mood.id ? 'bg-black/10 ring-1 ring-black/15' : 'bg-black/5 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {mood.emoji} {mood.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 px-4 pb-2 sm:pr-16">
                    {NOTE_PAPERS.map((paper) => (
                      <button
                        key={paper.id}
                        type="button"
                        onClick={() => scheduleSave({ paper: paper.id })}
                        className={`h-6 w-6 rounded-full border ${
                          active.paper === paper.id ? 'ring-2 ring-offset-2 ring-amber-700/40' : 'border-black/10'
                        }`}
                        style={{ background: paper.bg }}
                        aria-label={paper.label}
                      />
                    ))}
                  </div>

                  <textarea
                    value={active.content}
                    onChange={(event) => scheduleSave({ content: event.target.value })}
                    onBlur={() => void flushSave()}
                    placeholder="اكتب هنا… الصفحة إلك أنت."
                    className="min-h-[24rem] w-full resize-none bg-transparent px-4 pb-8 font-amiri text-lg leading-8 outline-none sm:pr-16"
                    style={{ color: theme.ink }}
                  />

                  <div
                    className="flex items-center justify-between px-4 py-3 text-[11px] sm:pr-16"
                    style={{ color: theme.muted }}
                  >
                    <span>{words} كلمة</span>
                    <span>{formatJournalStamp(active.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-amber-800/20 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center dark:from-amber-950/30 dark:to-stone-900">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-800 text-amber-50 shadow-lg">
                <NotebookPen className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold">افتح دفترك</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                صفحة جديدة، لون الورق اللي بتحبه، ومزاج اليوم. كل شي بينحفظ لحاله.
              </p>
              <Button onClick={() => void createNote()} className="mt-5 rounded-2xl gradient-primary">
                <Plus className="h-4 w-4" />
                اكتب أول صفحة
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
