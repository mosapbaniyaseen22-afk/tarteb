'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TASBIH_PRESETS } from '@/lib/wird';

const TOTAL_KEY = 'labib-tasbih-lifetime';

function readTotal() {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(TOTAL_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function TasbihBoard() {
  const [presetId, setPresetId] = useState(TASBIH_PRESETS[0].id);
  const [count, setCount] = useState(0);
  const [pop, setPop] = useState(false);
  const [lifetime, setLifetime] = useState(0);

  const preset = TASBIH_PRESETS.find((item) => item.id === presetId) ?? TASBIH_PRESETS[0];
  const progress = Math.min(1, count / preset.target);
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;

  useEffect(() => {
    setLifetime(readTotal());
  }, []);

  const tap = () => {
    const next = count + 1;
    setCount(next);
    setPop(true);
    window.setTimeout(() => setPop(false), 180);
    const total = readTotal() + 1;
    window.localStorage.setItem(TOTAL_KEY, String(total));
    setLifetime(total);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(next % preset.target === 0 ? [18, 40, 18] : 12);
    }
    if (next % preset.target === 0) {
      toast.success(`أتممت ${preset.target} من ${preset.text}`);
    }
  };

  const rounds = useMemo(() => Math.floor(count / preset.target), [count, preset.target]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TASBIH_PRESETS.map((item) => {
          const active = item.id === presetId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPresetId(item.id);
                setCount(0);
              }}
              className={`rounded-2xl p-3 text-sm font-medium transition-all ${
                active ? 'bg-emerald-600 text-white shadow-glow' : 'glass-card hover:scale-[1.01]'
              }`}
            >
              <div className="font-amiri text-base leading-7">{item.text}</div>
              <div className={`mt-1 text-[11px] ${active ? 'text-white/75' : 'text-muted-foreground'}`}>{item.target} مرة</div>
            </button>
          );
        })}
      </div>

      <Card className="rounded-[2rem] border-0 bg-gradient-to-b from-emerald-700 via-teal-700 to-slate-900 p-8 text-center text-white shadow-glow">
        <p className="font-amiri text-2xl">{preset.text}</p>
        <button
          type="button"
          onClick={tap}
          className={`relative mx-auto mt-6 flex h-56 w-56 items-center justify-center rounded-full bg-white/10 ${pop ? 'animate-tasbih-pop' : ''}`}
          aria-label="تسبيح"
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="10" fill="none" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="white"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div>
            <div className="text-6xl font-bold tabular-nums">{count}</div>
            <div className="mt-1 text-sm text-white/70">الهدف {preset.target}</div>
          </div>
        </button>
        <p className="mt-5 text-sm text-white/75">اضغط الدائرة للعدّ</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button
            variant="ghost"
            className="rounded-2xl bg-white/15 text-white hover:bg-white/25"
            onClick={() => setCount(0)}
          >
            <RotateCcw className="h-4 w-4" />
            تصفير الجلسة
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-3xl border-0 glass-card p-5 text-center shadow-soft">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{rounds}</div>
          <div className="text-xs text-muted-foreground">جولات مكتملة</div>
        </Card>
        <Card className="rounded-3xl border-0 glass-card p-5 text-center shadow-soft">
          <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{lifetime}</div>
          <div className="text-xs text-muted-foreground">مجموع التسبيح</div>
        </Card>
      </div>
    </div>
  );
}
