'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
  addScheduleEntry,
  deleteScheduleEntry,
  loadSchedule,
  loadScheduleRange,
  replaceSchedule,
  updateScheduleEntry,
} from '@/lib/app-data';
import { usePrayerTimes } from '@/lib/use-prayer-times';
import { PrayerTimesCard } from '@/components/prayer-times-card';
import { prayerLabel, timeToMinutes as prayerTimeToMinutes, type PrayerId } from '@/lib/prayer-times';
import { formatArabicDate, formatWeekRange, getWeekDays, saturdayOfWeek, useJordanToday } from '@/lib/week';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sparkles, Clock, Sun, Moon, BookOpen, Coffee, Dumbbell, BookMarked, Trash2, Plus, Pencil } from 'lucide-react';
import type { ScheduleEntry, UserSubject } from '@/lib/supabase';

const ACTIVITY_ICONS: Record<string, typeof Clock> = {
  wake: Sun,
  sleep: Moon,
  prayer: Moon,
  quran: BookMarked,
  study: BookOpen,
  break: Coffee,
  center: Dumbbell,
  meal: Coffee,
  custom: Dumbbell,
};

const ACTIVITY_COLORS: Record<string, string> = {
  wake: '#F59E0B',
  sleep: '#0F172A',
  prayer: '#059669',
  quran: '#0EA5E9',
  study: '#2563EB',
  break: '#F59E0B',
  center: '#8B5CF6',
  meal: '#EC4899',
  custom: '#8B5CF6',
};

const DURATION_PRESETS = [
  { label: '30 د', minutes: 30 },
  { label: 'ساعة', minutes: 60 },
  { label: 'ساعتان', minutes: 120 },
  { label: '3 ساعات', minutes: 180 },
];

export default function SchedulerPage() {
  const { user, profile, userSubjects } = useAuth();
  const today = useJordanToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const weekDays = useMemo(() => getWeekDays(today), [today]);
  const weekStart = weekDays[0]?.date ?? saturdayOfWeek(today);
  const { times, loading: prayerLoading, error: prayerError, cityName, setCityName } = usePrayerTimes(
    profile?.region,
    selectedDate,
  );

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [wakeTime, setWakeTime] = useState('06:30');
  const [sleepTime, setSleepTime] = useState('22:30');
  const [customTitle, setCustomTitle] = useState('');
  const [customStart, setCustomStart] = useState('13:30');
  const [customEnd, setCustomEnd] = useState('15:30');
  const [customNote, setCustomNote] = useState('');

  const selectedDay = weekDays.find((day) => day.date === selectedDate) ?? weekDays[0];

  const loadDay = async (date: string) => {
    if (!user) return;
    setSchedule(await loadSchedule(user.id, date));
    setLoading(false);
  };

  const loadWeekCounts = async () => {
    if (!user) return;
    const start = weekDays[0]?.date;
    const end = weekDays[6]?.date;
    if (!start || !end) return;
    const rows = await loadScheduleRange(user.id, start, end);
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.activity_type === 'prayer') continue;
      counts[row.schedule_date] = (counts[row.schedule_date] ?? 0) + 1;
    }
    setWeekCounts(counts);
  };

  useEffect(() => {
    const stillInWeek = weekDays.some((day) => day.date === selectedDate);
    if (!stillInWeek) setSelectedDate(today);
  }, [today, weekDays, selectedDate]);

  useEffect(() => {
    setSubjects(userSubjects);
  }, [userSubjects]);

  useEffect(() => {
    void loadDay(selectedDate);
  }, [user, selectedDate]);

  useEffect(() => {
    void loadWeekCounts();
  }, [user, weekStart]);

  const timeToMinutes = (value: string) => prayerTimeToMinutes(value);

  const minutesToTime = (mins: number) => {
    const hours = Math.floor(mins / 60) % 24;
    const minutes = mins % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const durationLabel = (start: string, end: string) => {
    const minutes = timeToMinutes(end) - timeToMinutes(start);
    if (minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest} د`;
    if (rest === 0 && hours === 1) return 'ساعة';
    if (rest === 0 && hours === 2) return 'ساعتان';
    if (rest === 0) return `${hours} ساعات`;
    return `${hours} س و ${rest} د`;
  };

  const formatTime = (value: string) => {
    const [hoursRaw, minutes] = value.split(':');
    const hours = Number(hoursRaw);
    const period = hours >= 12 ? 'م' : 'ص';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes} ${period}`;
  };

  const applyDuration = (minutes: number) => {
    setCustomEnd(minutesToTime(timeToMinutes(customStart) + minutes));
  };

  const openCreate = () => {
    setEditingId(null);
    setCustomTitle('');
    setCustomNote('');
    setCustomStart('13:30');
    setCustomEnd('15:30');
    setEditorOpen(true);
  };

  const openEdit = (entry: ScheduleEntry) => {
    setEditingId(entry.id);
    setCustomTitle(entry.activity);
    setCustomNote(entry.subject_name ?? '');
    setCustomStart(entry.start_time);
    setCustomEnd(entry.end_time);
    setEditorOpen(true);
  };

  const saveActivity = async () => {
    if (!user) return;
    if (!customTitle.trim()) {
      toast.error('اكتبي اسم النشاط');
      return;
    }
    if (timeToMinutes(customEnd) <= timeToMinutes(customStart)) {
      toast.error('وقت الانتهاء يجب أن يكون بعد وقت البدء');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateScheduleEntry(editingId, {
          activity: customTitle.trim(),
          start_time: customStart,
          end_time: customEnd,
          subject_name: customNote.trim() || null,
        });
        if (updated) {
          setSchedule((prev) =>
            prev.map((item) => (item.id === editingId ? updated : item)).sort((a, b) => a.start_time.localeCompare(b.start_time)),
          );
        }
        toast.success('تم تعديل النشاط');
      } else {
        const next = await addScheduleEntry({
          user_id: user.id,
          schedule_date: selectedDate,
          start_time: customStart,
          end_time: customEnd,
          activity: customTitle.trim(),
          activity_type: 'custom',
          subject_name: customNote.trim() || null,
          color: ACTIVITY_COLORS.custom,
        });
        setSchedule((prev) => [...prev, next].sort((a, b) => a.start_time.localeCompare(b.start_time)));
        setWeekCounts((prev) => ({ ...prev, [selectedDate]: (prev[selectedDate] ?? 0) + 1 }));
        toast.success(`تمت الإضافة ليوم ${selectedDay.name}`);
      }
      setEditorOpen(false);
    } catch {
      toast.error('تعذر حفظ النشاط');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    await deleteScheduleEntry(id);
    setSchedule((prev) => prev.filter((item) => item.id !== id));
    setWeekCounts((prev) => ({ ...prev, [selectedDate]: Math.max(0, (prev[selectedDate] ?? 1) - 1) }));
  };

  const generateSchedule = async () => {
    if (!user) return;
    if (!times) {
      toast.error('انتظر حتى تتحمّل مواقيت الصلاة الصحيحة');
      return;
    }
    setGenerating(true);
    try {
      const entries: Omit<ScheduleEntry, 'id'>[] = [];
      const wake = timeToMinutes(wakeTime);
      const customBlocks = schedule.filter((entry) => entry.activity_type === 'custom');

      entries.push({
        user_id: user.id,
        schedule_date: selectedDate,
        start_time: wakeTime,
        end_time: minutesToTime(wake + 15),
        activity: 'الاستيقاظ',
        activity_type: 'wake',
        color: ACTIVITY_COLORS.wake,
        subject_name: null,
      });

      const studySubjects = subjects.map((item) => item.subjects.name_ar);
      if (studySubjects.length === 0) studySubjects.push('الرياضيات', 'الفيزياء');

      let currentTime = wake + 15;
      const dhuhrMin = timeToMinutes(times.dhuhr);
      let subjectIdx = 0;

      while (currentTime < dhuhrMin - 30 && subjectIdx < studySubjects.length) {
        const sessionLen = Math.min(90, dhuhrMin - currentTime - 30);
        if (sessionLen < 30) break;
        entries.push({
          user_id: user.id,
          schedule_date: selectedDate,
          start_time: minutesToTime(currentTime),
          end_time: minutesToTime(currentTime + sessionLen),
          activity: `مذاكرة: ${studySubjects[subjectIdx]}`,
          activity_type: 'study',
          color: ACTIVITY_COLORS.study,
          subject_name: studySubjects[subjectIdx],
        });
        subjectIdx = (subjectIdx + 1) % studySubjects.length;
        currentTime += sessionLen;
        if (currentTime < dhuhrMin - 30) {
          entries.push({
            user_id: user.id,
            schedule_date: selectedDate,
            start_time: minutesToTime(currentTime),
            end_time: minutesToTime(currentTime + 15),
            activity: 'استراحة',
            activity_type: 'break',
            color: ACTIVITY_COLORS.break,
            subject_name: null,
          });
          currentTime += 15;
        }
      }

      entries.push({
        user_id: user.id,
        schedule_date: selectedDate,
        start_time: minutesToTime(timeToMinutes(times.dhuhr) + 15),
        end_time: minutesToTime(timeToMinutes(times.dhuhr) + 60),
        activity: 'الغداء',
        activity_type: 'meal',
        color: ACTIVITY_COLORS.meal,
        subject_name: null,
      });

      let eveningStart = timeToMinutes(times.maghrib) + 15;
      const ishaMin = timeToMinutes(times.isha);
      while (eveningStart < ishaMin - 30 && subjectIdx < studySubjects.length + 3) {
        const sessionLen = Math.min(60, ishaMin - eveningStart - 15);
        if (sessionLen < 30) break;
        entries.push({
          user_id: user.id,
          schedule_date: selectedDate,
          start_time: minutesToTime(eveningStart),
          end_time: minutesToTime(eveningStart + sessionLen),
          activity: subjectIdx < studySubjects.length
            ? `مراجعة: ${studySubjects[subjectIdx % studySubjects.length]}`
            : 'حل الواجبات',
          activity_type: 'study',
          color: ACTIVITY_COLORS.study,
          subject_name: studySubjects[subjectIdx % studySubjects.length],
        });
        subjectIdx += 1;
        eveningStart += sessionLen + 10;
      }

      entries.push({
        user_id: user.id,
        schedule_date: selectedDate,
        start_time: sleepTime,
        end_time: minutesToTime(timeToMinutes(sleepTime) + 15),
        activity: 'النوم',
        activity_type: 'sleep',
        color: ACTIVITY_COLORS.sleep,
        subject_name: null,
      });

      const merged = [
        ...customBlocks.map((entry) => ({
          user_id: user.id,
          schedule_date: selectedDate,
          start_time: entry.start_time,
          end_time: entry.end_time,
          activity: entry.activity,
          activity_type: entry.activity_type,
          subject_name: entry.subject_name,
          color: entry.color,
        })),
        ...entries,
      ].sort((a, b) => a.start_time.localeCompare(b.start_time));

      const inserted = await replaceSchedule(user.id, selectedDate, merged);
      setSchedule(inserted);
      setWeekCounts((prev) => ({
        ...prev,
        [selectedDate]: inserted.filter((item) => item.activity_type !== 'prayer').length,
      }));
      toast.success(`تم تنظيم جدول ${selectedDay.name}`);
      setDialogOpen(false);
    } catch (error) {
      toast.error('حدث خطأ، حاول مرة أخرى');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const prayerBlocks: ScheduleEntry[] = times
    ? (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerId[]).map((id) => ({
        id: `prayer-${id}`,
        user_id: user?.id ?? 'prayer',
        schedule_date: selectedDate,
        start_time: times[id],
        end_time: minutesToTime(timeToMinutes(times[id]) + 20),
        activity: `صلاة ${prayerLabel(id)}`,
        activity_type: 'prayer',
        subject_name: null,
        color: ACTIVITY_COLORS.prayer,
      }))
    : [];

  const userBlocks = schedule.filter((entry) => entry.activity_type !== 'prayer');
  const timeline = [...prayerBlocks, ...userBlocks].sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">تنظيم الوقت</h1>
          <p className="text-sm text-muted-foreground">هذا الأسبوع: {formatWeekRange(weekDays)}</p>
        </div>
        <Button className="h-11 w-full rounded-xl gradient-primary shadow-glow sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Sparkles className="h-4 w-4" />
          نظم هذا اليوم
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((day) => {
          const active = day.date === selectedDate;
          const isToday = day.date === today;
          const count = weekCounts[day.date] ?? 0;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              className={`min-h-[4.5rem] rounded-2xl px-0.5 py-2 text-center transition-all sm:px-1 sm:py-3 ${
                active
                  ? 'gradient-primary text-white shadow-glow'
                  : 'glass-card hover:shadow-soft'
              }`}
            >
              <div className="text-[11px] opacity-80">{day.short}</div>
              <div className="mt-1 text-base font-bold sm:text-lg">{day.dayNumber}</div>
              <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: count > 0 ? (active ? '#fff' : '#2563EB') : 'transparent' }} />
              {isToday && !active && <div className="mt-1 text-[10px] text-primary">اليوم</div>}
            </button>
          );
        })}
      </div>

      <PrayerTimesCard
        times={times}
        loading={prayerLoading}
        error={prayerError}
        cityName={cityName}
        onCityChange={setCityName}
        showNext={selectedDate === today}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">جدول {selectedDay.name}</h2>
          <p className="text-xs text-muted-foreground">{formatArabicDate(selectedDate)}</p>
        </div>
        <Button size="icon" className="h-12 w-12 rounded-full gradient-primary shadow-glow" onClick={openCreate}>
          <Plus className="h-6 w-6" />
          <span className="sr-only">أضف نشاط</span>
        </Button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {timeline.map((entry, index) => {
            const Icon = ACTIVITY_ICONS[entry.activity_type] || Clock;
            const locked = entry.activity_type === 'prayer';
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="overflow-hidden rounded-3xl border-0 glass-card shadow-soft">
                  <div className="flex">
                    <div className="w-1.5" style={{ backgroundColor: entry.color }} />
                    <div className="flex flex-1 items-center gap-4 p-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${entry.color}18`, color: entry.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{entry.activity}</h3>
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">
                            {durationLabel(entry.start_time, entry.end_time)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatTime(entry.start_time)} — {formatTime(entry.end_time)}
                          {locked ? ' • تتحدث تلقائياً' : ''}
                        </p>
                        {entry.subject_name && entry.activity_type !== 'study' && (
                          <p className="mt-1 text-sm text-muted-foreground">{entry.subject_name}</p>
                        )}
                      </div>
                      {!locked && (
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => openEdit(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => deleteEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>تنظيم جدول {selectedDay.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block">وقت الاستيقاظ</Label>
                <Input type="time" value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} className="rounded-xl" />
              </div>
              <div>
                <Label className="mb-2 block">وقت النوم</Label>
                <Input type="time" value={sleepTime} onChange={(event) => setSleepTime(event.target.value)} className="rounded-xl" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ينشئ جدول مذاكرة لهذا اليوم فقط. الأنشطة اللي ضفتيها بإيدك تبقى كما هي.
            </p>
            <Button onClick={generateSchedule} disabled={generating || !times} className="w-full rounded-xl gradient-primary shadow-glow">
              {generating ? '...جاري التنظيم' : <><Sparkles className="h-4 w-4" /> إنشاء جدول {selectedDay.name}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل النشاط' : `أضيفي ليوم ${selectedDay.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">النشاط</Label>
              <Input
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                placeholder="مثال: مركز، ورد قرآن، دورة..."
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block">وقت البدء</Label>
                <Input type="time" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="rounded-xl" />
              </div>
              <div>
                <Label className="mb-2 block">وقت الانتهاء</Label>
                <Input type="time" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">المدة: {durationLabel(customStart, customEnd) || 'اختاري البدء والانتهاء'}</p>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <Button key={preset.minutes} type="button" variant="outline" className="rounded-full" onClick={() => applyDuration(preset.minutes)}>
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">ملاحظة (اختياري)</Label>
              <Textarea
                value={customNote}
                onChange={(event) => setCustomNote(event.target.value)}
                placeholder="مثال: مركز الرياضيات لمدة ساعتين"
                className="min-h-[80px] rounded-xl"
              />
            </div>
            <Button onClick={saveActivity} disabled={saving} className="w-full rounded-xl gradient-primary">
              {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة لليوم'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
