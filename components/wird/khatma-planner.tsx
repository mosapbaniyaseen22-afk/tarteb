'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookMarked, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  KHATMA_PRESETS,
  QURAN_PAGES,
  daysBetween,
  khatmaDaily,
  khatmaPortion,
  loadKhatmaPlan,
  saveKhatmaPlan,
  todayISO,
  type KhatmaPlan,
  type KhatmaPresetId,
} from '@/lib/khatma';
import { surahNumberForPage, surahsForPageRange } from '@/lib/wird-surahs';

type Props = {
  onOpenSurah: (number: number) => void;
};

function formatJuz(value: number) {
  if (value >= 1) return `${value} جزء`;
  if (Math.abs(value - 0.5) < 0.05) return 'نصف جزء';
  return `${value} جزء`;
}

export function KhatmaPlanner({ onOpenSurah }: Props) {
  const [plan, setPlan] = useState<KhatmaPlan | null>(() => loadKhatmaPlan());
  const [preset, setPreset] = useState<KhatmaPresetId>(30);
  const [customDays, setCustomDays] = useState('30');
  const days = Math.max(1, Number(customDays) || preset);
  const preview = khatmaDaily(days);
  const today = todayISO();

  const active = useMemo(() => {
    if (!plan) return null;
    const daily = khatmaDaily(plan.days);
    const elapsed = Math.min(plan.days - 1, daysBetween(plan.startDate, today));
    const portion = khatmaPortion(plan.days, elapsed);
    const range = surahsForPageRange(portion.start, portion.end);
    const doneToday = plan.completedDates.includes(today);
    const completed = plan.completedDates.length;
    const remainingDays = Math.max(0, plan.days - elapsed - (doneToday ? 1 : 0));
    const finished = elapsed >= plan.days - 1 && doneToday;
    return { daily, elapsed, portion, range, doneToday, completed, remainingDays, finished };
  }, [plan, today]);

  useEffect(() => {
    if (!plan || !active || active.finished) return;
    onOpenSurah(surahNumberForPage(active.portion.start));
  }, [plan?.startDate, active?.elapsed, active?.finished, onOpenSurah]);

  const startPlan = () => {
    const next: KhatmaPlan = { days, startDate: today, completedDates: [] };
    saveKhatmaPlan(next);
    setPlan(next);
    onOpenSurah(1);
    toast.success(`بدأت الختمة من الفاتحة خلال ${days} يوم`);
  };

  const markToday = () => {
    if (!plan || !active || active.doneToday) return;
    const next = { ...plan, completedDates: [...plan.completedDates, today] };
    saveKhatmaPlan(next);
    setPlan(next);
    toast.success('ما شاء الله، تم ورد الختمة اليوم');
  };

  const reset = () => {
    saveKhatmaPlan(null);
    setPlan(null);
  };

  if (plan && active) {
    return (
      <Card className="rounded-3xl border-0 bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-teal-500/10 p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <h3 className="font-semibold">ختمتي</h3>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            إلغاء
          </Button>
        </div>

        {active.finished ? (
          <p className="font-amiri text-xl">تمّت الختمة، تقبّل الله</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">ورد اليوم في الختمة</p>
            <p className="mt-1 font-amiri text-2xl">
              {active.range.from.number === active.range.to.number
                ? `سورة ${active.range.from.name}`
                : `من ${active.range.from.name} إلى ${active.range.to.name}`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              صفحة {active.portion.start} — {active.portion.end} · {active.portion.pages} صفحة · حوالي {formatJuz(active.daily.juzPerDay)} · اليوم {active.elapsed + 1} من {plan.days}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-500/15">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${Math.min(100, (active.completed / plan.days) * 100)}%` }}
              />
            </div>
            <Button
              onClick={markToday}
              disabled={active.doneToday}
              className="mt-4 h-11 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {active.doneToday ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  أتممت ورد اليوم
                </>
              ) : (
                'أتممت صفحات اليوم'
              )}
            </Button>
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft">
      <div className="mb-1 flex items-center gap-2">
        <BookMarked className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
        <h3 className="font-semibold">الختمة</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        اختر خلال كم يوم تبي تختم. الختمة تبدأ من سورة الفاتحة حتى سورة الناس، ونحسب لك كم تقرأ كل يوم ({QURAN_PAGES} صفحة).
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KHATMA_PRESETS.map((item) => {
          const activePreset = days === item.days;
          return (
            <button
              key={item.days}
              type="button"
              onClick={() => {
                setPreset(item.days);
                setCustomDays(String(item.days));
              }}
              className={`rounded-2xl p-3 text-right transition-all ${
                activePreset ? 'bg-emerald-600 text-white shadow-glow' : 'bg-emerald-500/10 hover:bg-emerald-500/15'
              }`}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className={`text-[11px] ${activePreset ? 'text-white/75' : 'text-muted-foreground'}`}>{item.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <Label className="mb-2 block text-sm">مدة مخصصة (بالأيام)</Label>
        <Input
          type="number"
          min={1}
          max={365}
          value={customDays}
          onChange={(event) => setCustomDays(event.target.value)}
          className="h-11 rounded-2xl"
        />
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-500/10 p-4">
        <p className="text-sm text-muted-foreground">لتختم خلال {preview.days} يوم، اقرأ كل يوم:</p>
        <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
          {preview.pagesPerDay} صفحة
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          من الفاتحة إلى الناس · حوالي {formatJuz(preview.juzPerDay)} · {preview.ayahsPerDay} آية
          {preview.lastDayPages !== preview.pagesPerDay ? ` · اليوم الأخير ${preview.lastDayPages} صفحة` : ''}
        </p>
      </div>

      <Button onClick={startPlan} className="mt-4 h-11 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
        ابدأ الختمة
      </Button>
    </Card>
  );
}
