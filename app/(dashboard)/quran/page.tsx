'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { loadQuran, upsertQuran } from '@/lib/app-data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Moon, BookOpen, CheckCircle2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { QuranProgress } from '@/lib/supabase';

const SURAHS = [
  'سورة الكهف', 'سورة يس', 'سورة الملك', 'سورة الواقعة', 'سورة المزمل', 'سورة المدثر',
];

export default function QuranPage() {
  const { user } = useAuth();
  const [today, setToday] = useState<QuranProgress | null>(null);
  const [history, setHistory] = useState<QuranProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState('سورة الكهف');
  const todayDate = new Date().toISOString().split('T')[0];

  const load = async () => {
    if (!user) return;
    const historyRows = await loadQuran(user.id);
    setHistory(historyRows);
    setToday(historyRows.find((item) => item.progress_date === todayDate) ?? null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  const markComplete = async () => {
    if (!user) return;
    const next = await upsertQuran({
      id: today?.id,
      user_id: user.id,
      progress_date: todayDate,
      surah_name: today?.surah_name || selectedSurah,
      pages_read: today?.target_pages || 4,
      target_pages: today?.target_pages || 4,
      completed: true,
    });
    setToday(next);
    toast.success('ما شاء الله! تم إكمال ورد اليوم');
    void load();
  };

  const updateProgress = async (pages: number) => {
    if (!user) return;
    const next = await upsertQuran({
      id: today?.id,
      user_id: user.id,
      progress_date: todayDate,
      surah_name: today?.surah_name || selectedSurah,
      pages_read: pages,
      target_pages: today?.target_pages || 4,
      completed: pages >= (today?.target_pages || 4),
    });
    setToday(next);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const progressPct = today ? (today.pages_read / today.target_pages) * 100 : 0;
  const streak = history.filter(h => h.completed).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow"
        >
          <Moon className="h-8 w-8 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold">ورد القرآن</h1>
        <p className="mt-1 text-sm text-muted-foreground">حافظ على وردك اليومي من القرآن الكريم</p>
      </div>

      {/* Today's Wird */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white shadow-glow">
          <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="mb-2 flex items-center gap-2 text-white/80">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">ورد اليوم</span>
            </div>
            <h2 className="mb-6 text-3xl font-bold">{today?.surah_name || selectedSurah}</h2>

            <div className="mb-4">
              <div className="mb-2 flex justify-between text-sm text-white/80">
                <span>الصفحات المقروءة</span>
                <span>{today?.pages_read || 0} / {today?.target_pages || 4}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>

            {/* Page counter */}
            <div className="mb-4 flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                className="rounded-xl bg-white/10 text-white hover:bg-white/20"
                onClick={() => updateProgress(Math.max(0, (today?.pages_read || 0) - 1))}
              >
                -1
              </Button>
              <span className="text-2xl font-bold">{today?.pages_read || 0}</span>
              <Button
                variant="ghost"
                className="rounded-xl bg-white/10 text-white hover:bg-white/20"
                onClick={() => updateProgress(Math.min(today?.target_pages || 4, (today?.pages_read || 0) + 1))}
              >
                +1
              </Button>
            </div>

            <Button
              onClick={markComplete}
              disabled={today?.completed}
              className="w-full rounded-2xl bg-white text-emerald-700 hover:bg-white/90"
            >
              {today?.completed ? (
                <><CheckCircle2 className="h-5 w-5" /> تم إكمال ورد اليوم</>
              ) : (
                'إكمال الورد'
              )}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="rounded-3xl border-0 glass-card p-6 text-center shadow-soft">
          <div className="text-3xl font-bold gradient-text">{streak}</div>
          <div className="mt-1 text-sm text-muted-foreground">أيام مكتملة</div>
        </Card>
        <Card className="rounded-3xl border-0 glass-card p-6 text-center shadow-soft">
          <div className="text-3xl font-bold gradient-text">{history.reduce((sum, h) => sum + h.pages_read, 0)}</div>
          <div className="mt-1 text-sm text-muted-foreground">إجمالي الصفحات</div>
        </Card>
      </div>

      {/* Surah selector */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">اختر السورة</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SURAHS.map((surah) => (
            <button
              key={surah}
              onClick={() => { setSelectedSurah(surah); if (!today) toast.info(`اخترت ${surah}`); }}
              className={`rounded-2xl p-4 text-sm font-medium transition-all ${
                (today?.surah_name || selectedSurah) === surah
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow'
                  : 'glass-card hover:scale-[1.02]'
              }`}
            >
              <BookOpen className="mx-auto mb-2 h-5 w-5" />
              {surah}
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">سجل القراءة</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-2xl glass-card p-3">
                {h.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{h.surah_name}</div>
                  <div className="text-xs text-muted-foreground">{h.progress_date} • {h.pages_read}/{h.target_pages} صفحة</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
