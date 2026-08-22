'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  addScheduleEntry,
  deleteScheduleEntry,
  loadPreferences,
  loadSchedule,
  loadScheduleRange,
  toggleScheduleCompletion,
  updateScheduleEntry,
} from '@/lib/app-data';
import { usePrayerTimes } from '@/lib/use-prayer-times';
import { PrayerTimesCard } from '@/components/prayer-times-card';
import { StudyPlanWizard } from '@/components/planner/study-plan-wizard';
import { TimeWithPlanWizard } from '@/components/planner/time-with-plan-wizard';
import { ScheduleWizard } from '@/components/schedule-wizard';
import { ScheduleTimeline } from '@/components/schedule-timeline';
import { timeToMinutes as prayerTimeToMinutes } from '@/lib/prayer-times';
import { addDaysISO, formatScheduleHeading, formatWeekRange, getWeekDays, saturdayOfWeek, useJordanToday, weekdayIndex } from '@/lib/week';
import { dailyStudyMinutes, labibScheduleTip, subjectTimeDistribution, taskCompletionStats } from '@/lib/schedule-stats';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Sparkles, Clock, Plus, PieChart as PieChartIcon, ListChecks, Bot, CalendarDays, ChevronLeft, ChevronRight, Target, CalendarClock, Download,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ScheduleEntry, ScheduleMode, UserSubject } from '@/lib/supabase';
import type { StudyPlan } from '@/lib/study-plan';
import { downloadStudyPlanPdf } from '@/lib/study-plan-pdf';
import { guestStore } from '@/lib/guest-db';

const ACTIVITY_COLORS: Record<string, string> = {
  wake: '#0F766E',
  sleep: '#1E293B',
  prayer: '#059669',
  quran: '#0EA5E9',
  study: '#4C1D95',
  break: '#F59E0B',
  center: '#0F766E',
  school: '#1D4ED8',
  sport: '#B45309',
  meal: '#1E3A5F',
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
  const [weekAnchor, setWeekAnchor] = useState(today);
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);
  const weekStart = weekDays[0]?.date ?? saturdayOfWeek(today);
  const { times, loading: prayerLoading, error: prayerError, cityName, setCityName } = usePrayerTimes(
    profile?.region,
    selectedDate,
  );

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [planWizardOpen, setPlanWizardOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [createdBanner, setCreatedBanner] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode | null>(null);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setWeekAnchor((current) => (saturdayOfWeek(current) === saturdayOfWeek(today) ? today : current));
  }, [today]);

  useEffect(() => {
    const stillInWeek = weekDays.some((day) => day.date === selectedDate);
    if (stillInWeek || weekDays.length === 0) return;
    const match = weekDays.find((day) => weekdayIndex(day.date) === weekdayIndex(selectedDate));
    setSelectedDate(match?.date ?? weekDays[0].date);
  }, [today, weekDays, selectedDate]);

  useEffect(() => {
    setSubjects(userSubjects);
  }, [userSubjects]);

  useEffect(() => {
    if (!user) return;
    setStudyPlan(guestStore.getStudyPlan(user.id));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadPreferences(user.id).then((prefs) => {
      if (prefs) {
        setScheduleMode(prefs.schedule_mode);
        setCustomDays(prefs.custom_days);
      }
    });
  }, [user, wizardOpen]);

  useEffect(() => {
    void loadDay(selectedDate);
  }, [user, selectedDate]);

  useEffect(() => {
    void loadWeekCounts();
  }, [user, weekStart]);

  const timeToMinutes = (value: string) => prayerTimeToMinutes(value);

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

  const applyDuration = (minutes: number) => {
    setCustomEnd(((mins: number) => {
      const hours = Math.floor(mins / 60) % 24;
      const rest = mins % 60;
      return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    })(timeToMinutes(customStart) + minutes));
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
          task_id: null,
          completed: false,
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

  const toggleDone = async (entry: ScheduleEntry) => {
    const updated = await toggleScheduleCompletion(entry);
    if (updated) {
      setSchedule((prev) => prev.map((item) => (item.id === entry.id ? updated : item)));
    }
  };

  const onWizardFinished = (message?: string, focusDate?: string) => {
    if (focusDate) {
      setWeekAnchor(focusDate);
      setSelectedDate(focusDate);
      void loadDay(focusDate);
    } else {
      void loadDay(selectedDate);
    }
    void loadWeekCounts();
    if (message) setCreatedBanner(message);
  };

  const downloadPlanPdf = async () => {
    if (!studyPlan) return;
    setPdfBusy(true);
    try {
      await downloadStudyPlanPdf(studyPlan);
      toast.success('تم تحميل الخطة PDF');
    } catch {
      toast.error('تعذر تحميل الملف');
    } finally {
      setPdfBusy(false);
    }
  };

  const shiftWeek = (amount: number) => {
    const nextAnchor = addDaysISO(weekStart, amount * 7);
    const nextDays = getWeekDays(nextAnchor);
    const currentIndex = weekDays.findIndex((day) => day.date === selectedDate);
    setWeekAnchor(nextAnchor);
    setSelectedDate(nextDays[currentIndex >= 0 ? currentIndex : 0]?.date ?? nextAnchor);
    setCreatedBanner(null);
  };

  const prayerBlocks: ScheduleEntry[] = times
    ? (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((id) => ({
        id: `prayer-${id}`,
        user_id: user?.id ?? 'prayer',
        schedule_date: selectedDate,
        start_time: times[id],
        end_time: ((mins: number) => {
          const hours = Math.floor(mins / 60) % 24;
          const rest = mins % 60;
          return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
        })(timeToMinutes(times[id]) + 20),
        activity: `صلاة ${id === 'fajr' ? 'الفجر' : id === 'dhuhr' ? 'الظهر' : id === 'asr' ? 'العصر' : id === 'maghrib' ? 'المغرب' : 'العشاء'}`,
        activity_type: 'prayer',
        subject_name: null,
        color: ACTIVITY_COLORS.prayer,
        task_id: null,
        completed: false,
      }))
    : [];

  const userBlocks = schedule.filter((entry) => entry.activity_type !== 'prayer');
  // Skip prayer overlay when the wizard already merged prayers into the generated schedule.
  const hasGeneratedPrayers = schedule.some((entry) => ['wake', 'meal'].includes(entry.activity_type));
  const timeline = [...(hasGeneratedPrayers ? [] : prayerBlocks), ...userBlocks].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const studyMinutes = useMemo(() => dailyStudyMinutes(schedule), [schedule]);
  const completionStats = useMemo(() => taskCompletionStats(schedule), [schedule]);
  const subjectSlices = useMemo(() => subjectTimeDistribution(schedule), [schedule]);
  const tip = useMemo(() => labibScheduleTip(completionStats.percent, studyMinutes), [completionStats.percent, studyMinutes]);
  const modeHint = (() => {
    switch (scheduleMode) {
      case 'same':
        return 'جدول مكرر محفوظ — نفس اليوم من كل أسبوع يطلع نفس الجدول';
      case 'different':
        return 'كل يوم مستقل — الجدول لهذا التاريخ فقط وما بيتكرر';
      case 'custom':
        return 'الأيام المحددة محفوظة وتتكرر كل أسبوع بنفس الجدول';
      case null:
        return formatWeekRange(weekDays);
      default: {
        const exhaustive: never = scheduleMode;
        return exhaustive;
      }
    }
  })();

  const wizardCta = scheduleMode === 'same'
    ? 'تعديل متقدم ليوم واحد'
    : scheduleMode === 'custom'
      ? 'تعديل الأيام المحددة'
      : 'تعديل متقدم لليوم';

  const todayFocus = studyPlan?.weekDays.find((day) => day.weekday === weekdayIndex(selectedDate));

  const TasksTodayCard = (
    <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg viewBox="0 0 40 40" className="h-16 w-16 -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--accent))" strokeWidth="4" />
            <circle
              cx="20" cy="20" r="16" fill="none" stroke="#2563EB" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 16}`}
              strokeDashoffset={`${2 * Math.PI * 16 * (1 - completionStats.percent / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-sm font-bold">{completionStats.completed}/{completionStats.total}</span>
        </div>
        <div className="min-w-0">
          <div className="font-semibold">مهامك اليوم</div>
          <div className="text-xs text-muted-foreground">مهام مكتملة</div>
          <div className="mt-1 text-xs text-primary">{completionStats.percent >= 70 ? 'الوقت كافٍ، استمري!' : 'يلا كمّلي مهامك اليوم'}</div>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 lg:pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">تنظيم الوقت</h1>
          <p className="text-sm text-muted-foreground">خطتان مربوطتان: خطتك الدراسية، بعدين جدولك مع الالتزامات</p>
        </div>
        <Button variant="outline" className="h-11 w-full rounded-xl sm:w-auto" onClick={() => setWizardOpen(true)}>
          <Sparkles className="h-4 w-4" />
          {wizardCta}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <button
          type="button"
          onClick={() => setPlanWizardOpen(true)}
          className="rounded-3xl glass-card p-5 text-right shadow-soft transition hover:scale-[1.01]"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl gradient-primary text-sm font-bold text-white">1</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-bold">
                <Target className="h-4 w-4 text-primary" />
                عمل خطة دراسة
              </div>
              {studyPlan ? (
                <>
                  <p className="mt-1 truncate text-sm">{studyPlan.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    جدول متكرر · {studyPlan.hoursPerDay} ساعات يومياً · هدف {studyPlan.targetAverage}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">جدول لكل أيام الأسبوع ويتكرر لوحده. بعدين نسألك عن ساعاتك وموادك وهدفك.</p>
              )}
            </div>
          </div>
        </button>
        <div className="hidden items-center justify-center text-xs font-semibold text-muted-foreground sm:flex">بعدين</div>
        <button
          type="button"
          disabled={!studyPlan}
          onClick={() => setOrganizeOpen(true)}
          className={`rounded-3xl p-5 text-right shadow-soft transition ${
            studyPlan ? 'glass-card hover:scale-[1.01]' : 'bg-muted/40 text-muted-foreground'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
              studyPlan ? 'gradient-primary text-white' : 'bg-muted'
            }`}>2</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-bold">
                <CalendarClock className="h-4 w-4 text-primary" />
                نظّم وقتك مع خطتك
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {studyPlan
                  ? 'أضف المدرسة والمركز والنادي، ونولّد الجدول النهائي المتكرر'
                  : 'بعد ما تخلص الخطة، رتب التزاماتك وولّد الجدول'}
              </p>
            </div>
          </div>
        </button>
      </div>

      {studyPlan ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl sm:w-auto"
            disabled={pdfBusy}
            onClick={() => void downloadPlanPdf()}
          >
            <Download className="h-4 w-4" />
            {pdfBusy ? 'جارٍ تجهيز الملف...' : 'تحميل الخطة PDF'}
          </Button>
        </div>
      ) : null}

      {todayFocus ? (
        <Card className="rounded-3xl border-0 bg-primary/8 p-4 shadow-soft">
          <p className="text-xs font-semibold text-primary">تركيز {selectedDay?.name}</p>
          <p className="mt-1 font-semibold">
            {studyPlan?.focusSubjects && studyPlan.focusSubjects.length > 0
              ? `كل المواد، مع تركيز على ${studyPlan.focusSubjects.join(' و ')}`
              : 'كل المواد اليوم'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{todayFocus.note}</p>
        </Card>
      ) : null}

      {createdBanner && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-4 w-4" />
          {createdBanner}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div>
            <span className="text-sm font-semibold">أيام الأسبوع</span>
            <p className="text-[11px] text-muted-foreground">{modeHint}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              aria-label="الأسبوع السابق"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="min-w-[9.5rem] text-center text-[11px] text-muted-foreground">{formatWeekRange(weekDays)}</span>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              aria-label="الأسبوع الجاي"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((day) => {
            const active = day.date === selectedDate;
            const isToday = day.date === today;
            const count = weekCounts[day.date] ?? 0;
            const empty = count === 0 && scheduleMode !== 'same';
            const grouped = scheduleMode === 'custom' && customDays.includes(weekdayIndex(day.date));
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  setSelectedDate(day.date);
                  setCreatedBanner(null);
                }}
                className={`min-h-[4.75rem] rounded-2xl px-0.5 py-2 text-center transition-all sm:px-1 sm:py-3 ${
                  active ? 'gradient-primary text-white shadow-glow' : 'glass-card hover:shadow-soft'
                }`}
              >
                <div className="text-[11px] opacity-80">{day.short}</div>
                <div className="mt-1 text-base font-bold sm:text-lg">{day.dayNumber}</div>
                <div
                  className="mx-auto mt-1 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: count > 0 ? (active ? '#fff' : '#2563EB') : empty ? (active ? 'rgba(255,255,255,0.4)' : '#94A3B8') : 'transparent' }}
                />
                {grouped && !active && <div className="mt-1 text-[9px] text-primary">مشترك</div>}
                {isToday && !active && !grouped && <div className="mt-1 text-[10px] text-primary">اليوم</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:hidden">{TasksTodayCard}</div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="rounded-3xl border-0 glass-card p-4 shadow-soft sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold">{formatScheduleHeading(selectedDate, selectedDay.name)}</h2>
              </div>
              <Button size="icon" className="h-11 w-11 rounded-full gradient-primary shadow-glow" onClick={openCreate}>
                <Plus className="h-5 w-5" />
                <span className="sr-only">أضف نشاط</span>
              </Button>
            </div>

            <PrayerTimesCard
              times={times}
              loading={prayerLoading}
              error={prayerError}
              cityName={cityName}
              onCityChange={setCityName}
              showNext={selectedDate === today}
              compact
            />

            <div className="mt-4">
              {userBlocks.length === 0 ? (
                <div className="rounded-2xl bg-accent/40 px-4 py-8 text-center">
                  <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <h3 className="font-semibold">لا يوجد جدول ليوم {selectedDay.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {studyPlan
                      ? 'ولّد الجدول من خطتك مع المدرسة والمركز والنادي'
                      : scheduleMode === 'same'
                        ? 'الجدول المكرر محفوظ ويتكرر كل أسبوع. اضغط إعادة التنظيم إذا بدك تغيّره'
                        : 'ابدأ بخطة دراسة، بعدين نظّم وقتك معها'}
                  </p>
                  <Button
                    className="mt-4 rounded-xl gradient-primary"
                    onClick={() => (studyPlan ? setOrganizeOpen(true) : setPlanWizardOpen(true))}
                  >
                    <Sparkles className="h-4 w-4" />
                    {studyPlan ? 'نظّم وقتك مع خطتك' : 'عمل خطة دراسة'}
                  </Button>
                </div>
              ) : (
                <ScheduleTimeline
                  entries={timeline}
                  onToggle={toggleDone}
                  onEdit={openEdit}
                  onDelete={deleteEntry}
                />
              )}
            </div>
          </Card>
        </div>

        <div className="hidden space-y-4 lg:block">
          {TasksTodayCard}

          <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 font-semibold"><ListChecks className="h-4 w-4 text-primary" /> ملخص اليوم</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">إجمالي ساعات الدراسة</span>
                <span className="font-bold">{Math.round((studyMinutes / 60) * 10) / 10} ساعة</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">المهام المكتملة</span>
                <span className="font-bold">{completionStats.completed}</span>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">نسبة الإنجاز</span>
                  <span className="font-bold">{completionStats.percent}%</span>
                </div>
                <Progress value={completionStats.percent} className="h-2" />
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft">
            <h3 className="mb-4 flex items-center gap-2 font-semibold"><PieChartIcon className="h-4 w-4 text-primary" /> توزيع المواد</h3>
            {subjectSlices.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={subjectSlices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {subjectSlices.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {subjectSlices.map((slice) => (
                    <div key={slice.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />
                        {slice.name}
                      </div>
                      <span className="text-muted-foreground">{slice.percent}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">لا توجد مواد مجدولة اليوم بعد</p>
            )}
          </Card>

          <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="mb-1 font-semibold">ملاحظات لبيب</div>
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {user && (
        <>
          <StudyPlanWizard
            open={planWizardOpen}
            onOpenChange={setPlanWizardOpen}
            userId={user.id}
            studentName={profile?.full_name ?? 'الطالب'}
            userSubjects={subjects}
            onCreated={setStudyPlan}
            onOrganize={(plan) => {
              setStudyPlan(plan);
              setOrganizeOpen(true);
            }}
          />
          <TimeWithPlanWizard
            open={organizeOpen}
            onOpenChange={setOrganizeOpen}
            userId={user.id}
            plan={studyPlan}
            prayerTimes={times}
            userSubjects={subjects}
            onFinished={onWizardFinished}
          />
          <ScheduleWizard
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            userId={user.id}
            selectedDate={selectedDate}
            selectedDayName={selectedDay.name}
            weekDays={weekDays}
            prayerTimes={times}
            userSubjects={subjects}
            onFinished={onWizardFinished}
          />
        </>
      )}

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
