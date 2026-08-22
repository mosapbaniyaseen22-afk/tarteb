'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Moon, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { loadQuran, upsertQuran } from '@/lib/app-data';
import { QuranBoard } from '@/components/wird/quran-board';
import { AdhkarBoard } from '@/components/wird/adhkar-board';
import { TasbihBoard } from '@/components/wird/tasbih-board';
import type { QuranProgress } from '@/lib/supabase';
import type { WirdTab } from '@/lib/wird';

const TABS: { id: WirdTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'quran', label: 'القرآن', icon: BookOpen },
  { id: 'adhkar', label: 'الأذكار', icon: Moon },
  { id: 'tasbih', label: 'التسبيح', icon: Sparkles },
];

export default function QuranPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<WirdTab>('quran');
  const [today, setToday] = useState<QuranProgress | null>(null);
  const [history, setHistory] = useState<QuranProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const todayDate = new Date().toISOString().split('T')[0];

  const load = async () => {
    if (!user) return;
    const historyRows = await loadQuran(user.id);
    setHistory(historyRows);
    setToday(historyRows.find((item) => item.progress_date === todayDate) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const saveWird = async (input: {
    surahName: string;
    pagesRead: number;
    targetPages: number;
    completed: boolean;
  }) => {
    if (!user) return;
    const next = await upsertQuran({
      id: today?.id,
      user_id: user.id,
      progress_date: todayDate,
      surah_name: input.surahName,
      pages_read: input.pagesRead,
      target_pages: input.targetPages,
      completed: input.completed,
    });
    setToday(next);
    void load();
  };

  const tabPanel = (() => {
    switch (tab) {
      case 'quran':
        return <QuranBoard today={today} history={history} onSave={saveWird} />;
      case 'adhkar':
        return <AdhkarBoard />;
      case 'tasbih':
        return <TasbihBoard />;
      default: {
        const exhaustive: never = tab;
        return exhaustive;
      }
    }
  })();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow">
          <Moon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold">الورد الإيماني</h1>
        <p className="mt-1 text-sm text-muted-foreground">قرآن، أذكار، وتسبيح في مكان واحد</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-3xl bg-emerald-500/10 p-1.5">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all ${
                active ? 'bg-emerald-600 text-white shadow-glow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tabPanel}
    </div>
  );
}
