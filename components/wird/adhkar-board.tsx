'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check, Moon, RotateCcw, Sparkles, Sunrise, Sunset, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ADHKAR_CATEGORIES,
  FALLBACK_ADHKAR,
  fetchAdhkarCategory,
  type AdhkarCategoryId,
  type AdhkarItem,
} from '@/lib/wird';

const ICONS = {
  morning: Sunrise,
  evening: Sunset,
  study: BookOpen,
  sleep: Moon,
  prayer: Sparkles,
} as const;

type Counts = Record<string, number>;

function todayKey(category: AdhkarCategoryId) {
  return `labib-adhkar-${category}-${new Date().toISOString().slice(0, 10)}`;
}

function readCounts(category: AdhkarCategoryId): Counts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(todayKey(category));
    return raw ? (JSON.parse(raw) as Counts) : {};
  } catch {
    return {};
  }
}

function writeCounts(category: AdhkarCategoryId, counts: Counts) {
  window.localStorage.setItem(todayKey(category), JSON.stringify(counts));
}

export function AdhkarBoard() {
  const [category, setCategory] = useState<AdhkarCategoryId>('morning');
  const [items, setItems] = useState<AdhkarItem[]>(FALLBACK_ADHKAR.morning);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const next = await fetchAdhkarCategory(category);
        if (!cancelled) setItems(next.length ? next : FALLBACK_ADHKAR[category]);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setItems(FALLBACK_ADHKAR[category]);
          toast.error('تعذر الاتصال بمصدر الأذكار، تم عرض النسخة المحفوظة');
        }
      } finally {
        if (!cancelled) {
          setCounts(readCounts(category));
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const tap = (item: AdhkarItem) => {
    setCounts((current) => {
      const value = Math.min(item.repeat, (current[item.id] ?? 0) + 1);
      const next = { ...current, [item.id]: value };
      writeCounts(category, next);
      if (value === item.repeat && (current[item.id] ?? 0) < item.repeat) {
        toast.success('تم هذا الذكر');
      }
      return next;
    });
  };

  const reset = () => {
    setCounts({});
    writeCounts(category, {});
  };

  const doneCount = useMemo(
    () => items.filter((item) => (counts[item.id] ?? 0) >= item.repeat).length,
    [counts, items],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ADHKAR_CATEGORIES.map((item) => {
          const Icon = ICONS[item.id];
          const active = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`rounded-2xl p-3 text-right transition-all ${
                active ? 'bg-emerald-600 text-white shadow-glow' : 'glass-card hover:scale-[1.01]'
              }`}
            >
              <Icon className="mb-2 h-5 w-5" />
              <div className="text-sm font-semibold">{item.label}</div>
              <div className={`text-[11px] ${active ? 'text-white/75' : 'text-muted-foreground'}`}>{item.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-2xl glass-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {doneCount} / {items.length} ذكر مكتمل اليوم
        </p>
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          إعادة
        </Button>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-emerald-500/15">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
        />
      </div>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const current = counts[item.id] ?? 0;
            const complete = current >= item.repeat;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}>
                <Card className={`rounded-3xl border-0 p-5 shadow-soft ${complete ? 'bg-emerald-500/10' : 'glass-card'}`}>
                  <p className="font-amiri text-xl leading-[2]">{item.text}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">{item.source ?? 'حصن المسلم'}</div>
                      {item.audio ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          onClick={() => {
                            const audio = new Audio(item.audio ?? undefined);
                            void audio.play().catch((error) => {
                              console.error(error);
                            });
                          }}
                          aria-label="تشغيل الذكر"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => tap(item)}
                      disabled={complete}
                      className={`flex min-w-[5.5rem] items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all ${
                        complete
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 dark:text-emerald-200'
                      }`}
                    >
                      {complete ? <Check className="h-4 w-4" /> : null}
                      {current} / {item.repeat}
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
