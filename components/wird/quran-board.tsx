'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Copy, Pause, Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchSurahAyahs } from '@/lib/wird';
import { SURAH_LIST, getSurah, revelationLabel } from '@/lib/wird-surahs';
import { KhatmaPlanner } from '@/components/wird/khatma-planner';
import { SurahPicker } from '@/components/wird/surah-picker';
import type { QuranProgress } from '@/lib/supabase';

type Ayah = { number: number; text: string; audio: string | null };

type Props = {
  today: QuranProgress | null;
  history: QuranProgress[];
  onSave: (input: { surahName: string; pagesRead: number; targetPages: number; completed: boolean }) => Promise<void>;
};

function surahNumberFromProgress(name: string | undefined): number {
  if (!name) return 1;
  const clean = name.replace(/^سورة\s*/, '').trim();
  return SURAH_LIST.find((item) => item.name === clean)?.number ?? 1;
}

export function QuranBoard({ today, history, onSave }: Props) {
  const [selected, setSelected] = useState(surahNumberFromProgress(today?.surah_name));
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeAyah, setActiveAyah] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const surah = getSurah(selected);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setPlaying(false);
      setActiveAyah(0);
      audioRef.current?.pause();
      try {
        const data = await fetchSurahAyahs(selected);
        if (!cancelled) setAyahs(data.ayahs);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setAyahs([]);
          toast.error('تعذر تحميل آيات السورة');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [selected]);

  const playAyah = async (index: number) => {
    const ayah = ayahs[index];
    if (!ayah?.audio) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.pause();
    audioRef.current.src = ayah.audio;
    setActiveAyah(index);
    setPlaying(true);
    audioRef.current.onended = () => {
      const next = index + 1;
      if (next < ayahs.length) {
        void playAyah(next);
        return;
      }
      setPlaying(false);
    };
    try {
      await audioRef.current.play();
    } catch (error) {
      console.error(error);
      setPlaying(false);
    }
  };

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    void playAyah(activeAyah);
  };

  const markWird = async () => {
    if (!surah) return;
    await onSave({
      surahName: `سورة ${surah.name}`,
      pagesRead: ayahs.length || surah.ayahs,
      targetPages: ayahs.length || surah.ayahs,
      completed: true,
    });
    toast.success('ما شاء الله، تم إكمال ورد اليوم');
  };

  const copyAyah = async (ayah: Ayah) => {
    await navigator.clipboard.writeText(`${ayah.text}  ﴿${surah?.name} ${ayah.number}﴾`);
    toast.success('تم نسخ الآية');
  };

  const streak = history.filter((item) => item.completed).length;
  const pages = history.reduce((sum, item) => sum + item.pages_read, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-3xl border-0 bg-emerald-500/10 p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{streak}</div>
          <div className="text-xs text-muted-foreground">أيام مكتملة</div>
        </Card>
        <Card className="rounded-3xl border-0 bg-teal-500/10 p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{pages}</div>
          <div className="text-xs text-muted-foreground">آيات / صفحات مسجّلة</div>
        </Card>
      </div>

      <Card className="rounded-3xl border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 text-white shadow-glow">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-white/70">السورة الحالية</p>
            <h2 className="font-amiri text-3xl">{surah ? `سورة ${surah.name}` : '...'}</h2>
            {surah ? (
              <p className="mt-1 text-xs text-white/75">
                {surah.ayahs} آية · {revelationLabel(surah.revelation)}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl bg-white/15 text-white hover:bg-white/25"
              onClick={() => setSelected((value) => Math.max(1, value - 1))}
              aria-label="السورة السابقة"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl bg-white/15 text-white hover:bg-white/25"
              onClick={() => setSelected((value) => Math.min(114, value + 1))}
              aria-label="السورة التالية"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={togglePlay} className="rounded-2xl bg-white text-emerald-700 hover:bg-white/90" disabled={loading || ayahs.length === 0}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'إيقاف التلاوة' : 'تشغيل التلاوة'}
          </Button>
          <Button
            onClick={() => void markWird()}
            disabled={today?.completed}
            className="rounded-2xl bg-white/15 text-white hover:bg-white/25"
          >
            {today?.completed ? <CheckCircle2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
            {today?.completed ? 'تم ورد اليوم' : 'إكمال الورد'}
          </Button>
        </div>
      </Card>

      <SurahPicker selected={selected} onSelect={setSelected} />
      <KhatmaPlanner onOpenSurah={setSelected} />

      <div className="space-y-3">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          ayahs.map((ayah, index) => (
            <motion.div key={ayah.number} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={`rounded-3xl border-0 p-5 shadow-soft ${
                  activeAyah === index && playing ? 'ring-2 ring-emerald-500' : 'glass-card'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {ayah.number}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => void copyAyah(ayah)} aria-label="نسخ الآية">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => void playAyah(index)} aria-label="تشغيل الآية">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="font-amiri text-2xl leading-[2.1]">{ayah.text}</p>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
