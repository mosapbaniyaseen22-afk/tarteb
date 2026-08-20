'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sparkles, Plus, Trash2, Moon, School, Building2, Dumbbell, Wand2,
  CalendarClock, CalendarDays, Repeat, Check, ChevronLeft, ChevronRight, BookMarked, BookOpen,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  addRoutine, addTask, deleteRoutine, deleteTask, loadPreferences, loadRoutines,
  loadTasks, replaceSchedule, savePreferences, saveWeekdayTemplate,
} from '@/lib/app-data';
import { buildDaySchedule } from '@/lib/schedule-generator';
import { formatPrayerClock, type PrayerTimes } from '@/lib/prayer-times';
import { weekdayIndex, formatWeekdayList, SCHOOL_WEEKDAYS, ARABIC_DAYS, ARABIC_SHORT, WEEK_ORDER, upcomingWeekdayOnOrAfter, useJordanToday, type WeekDay } from '@/lib/week';
import { normalizeScheduleMode, normalizeTaskKind, routineNeedsDays, type Routine, type RoutineIcon, type ScheduleMode, type Task, type TaskKind, type UserSubject } from '@/lib/supabase';

const ROUTINE_META: Record<RoutineIcon, { label: string; icon: typeof Moon; color: string }> = {
  sleep: { label: 'نوم', icon: Moon, color: '#0F172A' },
  school: { label: 'مدرسة', icon: School, color: '#2563EB' },
  center: { label: 'مركز', icon: Building2, color: '#8B5CF6' },
  sport: { label: 'رياضة', icon: Dumbbell, color: '#F59E0B' },
  custom: { label: 'مخصص', icon: Wand2, color: '#0EA5E9' },
};

const ROUTINE_ICON_OPTIONS = (['sleep', 'school', 'center', 'custom'] as const).map((id) => ({ id, ...ROUTINE_META[id] }));

const DURATION_PRESETS = [
  { label: '30 د', minutes: 30 },
  { label: 'ساعة', minutes: 60 },
  { label: 'ساعة ونصف', minutes: 90 },
  { label: 'ساعتان', minutes: 120 },
];

const PRIORITY_OPTIONS: { id: Task['priority']; label: string; color: string }[] = [
  { id: 'high', label: 'عالية', color: '#EF4444' },
  { id: 'medium', label: 'متوسطة', color: '#F59E0B' },
  { id: 'low', label: 'منخفضة', color: '#22C55E' },
];

const MODE_OPTIONS: { id: ScheduleMode; title: string; desc: string; icon: typeof Sparkles }[] = [
  { id: 'different', title: 'جدول كل يوم', desc: 'كل يوم له جدوله الخاص لهذا التاريخ فقط، وما بيتكرر بعدين', icon: CalendarDays },
  { id: 'same', title: 'جدول مكرر', desc: 'نفس الجدول يتكرر كل أسبوع تلقائياً، حتى بعد شهور', icon: Repeat },
  { id: 'custom', title: 'مخصص', desc: 'الأيام اللي تختاريها تنحفظ وتتكرر كل أسبوع، السبت الجاي نفس سبت اليوم', icon: Wand2 },
];

const STEP_LABELS = ['نوابتي', 'مهامي', 'ملاحظاتي'];

const TASK_KIND_OPTIONS: { id: TaskKind; label: string; title: string; icon: typeof Moon; color: string }[] = [
  { id: 'sport', label: 'رياضة', title: 'الرياضة', icon: Dumbbell, color: '#B45309' },
  { id: 'quran', label: 'قرآن', title: 'القرآن الكريم', icon: BookMarked, color: '#059669' },
  { id: 'study', label: 'دراسة', title: '', icon: BookOpen, color: '#4C1D95' },
  { id: 'custom', label: 'مخصص', title: '', icon: Wand2, color: '#0EA5E9' },
];

const ROUTINE_DEFAULT_TITLES: Partial<Record<RoutineIcon, string>> = {
  sleep: 'النوم',
  school: 'المدرسة',
  center: 'المركز',
};

const DEFAULT_WAKE_TIME = '06:30';
const DEFAULT_SLEEP_TIME = '22:30';

function targetDates(mode: ScheduleMode, selectedDate: string, customDays: number[], today: string): string[] {
  switch (mode) {
    case 'same':
      return WEEK_ORDER.map((day) => upcomingWeekdayOnOrAfter(today, day)).sort();
    case 'different':
      return [selectedDate];
    case 'custom':
      return customDays.map((day) => upcomingWeekdayOnOrAfter(today, day)).sort();
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

function joinDayNames(dates: string[]) {
  const names = dates.map((date) => ARABIC_DAYS[weekdayIndex(date)]);
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} و${names[1]}`;
  return `${names.slice(0, -1).join('، ')} و${names[names.length - 1]}`;
}

function attendancePlace(icon: RoutineIcon) {
  switch (icon) {
    case 'center':
      return 'المركز';
    case 'school':
      return 'المدرسة';
    case 'sleep':
    case 'sport':
    case 'custom':
      return 'الدوام';
    default: {
      const exhaustive: never = icon;
      return exhaustive;
    }
  }
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} د`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`;
  return `${hours} س و ${rest} د`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  selectedDate: string;
  selectedDayName: string;
  weekDays: WeekDay[];
  prayerTimes: PrayerTimes | null;
  userSubjects: UserSubject[];
  onFinished: (message?: string, focusDate?: string) => void;
};

export function ScheduleWizard({
  open, onOpenChange, userId, selectedDate, selectedDayName, weekDays, prayerTimes, userSubjects, onFinished,
}: Props) {
  const today = useJordanToday();
  const [phase, setPhase] = useState<'mode' | 'details'>('mode');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState('');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('different');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [breakEnabled, setBreakEnabled] = useState(true);
  const [generating, setGenerating] = useState(false);


  const [addingRoutine, setAddingRoutine] = useState(false);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineIcon, setRoutineIcon] = useState<RoutineIcon>('custom');
  const [routineStart, setRoutineStart] = useState('16:00');
  const [routineEnd, setRoutineEnd] = useState('17:00');
  const [routineDays, setRoutineDays] = useState<number[]>(SCHOOL_WEEKDAYS);

  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskKind, setTaskKind] = useState<TaskKind>('study');
  const [taskSubject, setTaskSubject] = useState<string>('none');
  const [taskDuration, setTaskDuration] = useState(60);
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium');

  const subjectColors = useMemo(
    () => Object.fromEntries(userSubjects.map((us) => [us.subjects.name_ar, us.subjects.color])),
    [userSubjects],
  );

  useEffect(() => {
    if (!open) return;
    setPhase('mode');
    setStep(1);
    setLoading(true);
    const load = async () => {
      const [nextRoutines, allTasks, prefs] = await Promise.all([
        loadRoutines(userId),
        loadTasks(userId),
        loadPreferences(userId),
      ]);
      setRoutines(nextRoutines);
      setTasks(allTasks.filter((task) => task.task_date === selectedDate));
      if (prefs) {
        setNotes(prefs.notes);
        setScheduleMode(normalizeScheduleMode(prefs.schedule_mode));
        setBreakEnabled(prefs.break_enabled);
        setCustomDays(prefs.custom_days.length > 0 ? prefs.custom_days : [weekdayIndex(selectedDate)]);
      } else {
        setCustomDays([weekdayIndex(selectedDate)]);
      }
      setLoading(false);
    };
    void load();
  }, [open, userId, selectedDate]);

  const goNext = () => setStep((current) => (current < 3 ? ((current + 1) as 2 | 3) : current));
  const goBack = () => {
    if (step === 1) {
      setPhase('mode');
      return;
    }
    setStep((current) => (current > 1 ? ((current - 1) as 1 | 2) : current));
  };

  const toggleCustomDay = (index: number) => {
    setCustomDays((prev) => (prev.includes(index) ? prev.filter((day) => day !== index) : [...prev, index].sort((a, b) => a - b)));
  };

  const startDetails = () => {
    if (scheduleMode === 'custom' && customDays.length === 0) {
      toast.error('حددي يوم واحد على الأقل');
      return;
    }
    setPhase('details');
    setStep(1);
  };

  const toggleRoutineDay = (index: number) => {
    setRoutineDays((prev) => (prev.includes(index) ? prev.filter((day) => day !== index) : [...prev, index].sort((a, b) => a - b)));
  };

  const submitRoutine = async () => {
    if (!routineTitle.trim()) {
      toast.error('اكتبي اسم النشاط الثابت');
      return;
    }
    if (routineNeedsDays(routineIcon) && routineDays.length === 0) {
      toast.error('حددي أيام الدوام');
      return;
    }
    const next = await addRoutine({
      user_id: userId,
      title: routineTitle.trim(),
      icon: routineIcon,
      start_time: routineStart,
      end_time: routineEnd,
      weekdays: routineNeedsDays(routineIcon) ? routineDays : [],
    });
    setRoutines((prev) => [...prev, next].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setRoutineTitle('');
    setAddingRoutine(false);
  };

  const removeRoutine = async (id: string) => {
    await deleteRoutine(id);
    setRoutines((prev) => prev.filter((item) => item.id !== id));
  };

  const submitTask = async () => {
    if (!taskTitle.trim()) {
      toast.error('اكتبي اسم المهمة');
      return;
    }
    const subject = taskKind === 'study' ? userSubjects.find((us) => us.subject_id === taskSubject) : undefined;
    const kindLabel = (() => {
      switch (taskKind) {
        case 'study':
          return subject?.subjects.name_ar ?? null;
        case 'sport':
          return 'رياضة';
        case 'quran':
          return 'قرآن';
        case 'custom':
          return null;
        default: {
          const exhaustive: never = taskKind;
          return exhaustive;
        }
      }
    })();
    const next = await addTask({
      user_id: userId,
      title: taskTitle.trim(),
      subject_id: subject?.subject_id ?? null,
      subject_name: kindLabel,
      task_date: selectedDate,
      start_time: null,
      end_time: null,
      duration_minutes: taskDuration,
      kind: taskKind,
      priority: taskPriority,
      status: 'pending',
    });
    if (next) {
      setTasks((prev) => [...prev, { ...next, kind: normalizeTaskKind(next.kind, next.title, next.subject_name) }]);
    }
    setTaskTitle('');
    setAddingTask(false);
  };

  const removeTask = async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((item) => item.id !== id));
  };

  const finish = async () => {
    setGenerating(true);
    try {
      const sleepRoutine = routines.find((routine) => routine.icon === 'sleep');
      const wakeTime = sleepRoutine?.end_time.slice(0, 5) ?? DEFAULT_WAKE_TIME;
      const sleepTime = sleepRoutine?.start_time.slice(0, 5) ?? DEFAULT_SLEEP_TIME;

      await savePreferences(userId, {
        wake_time: wakeTime,
        sleep_time: sleepTime,
        notes,
        schedule_mode: scheduleMode,
        custom_days: scheduleMode === 'custom' ? customDays : [],
        break_enabled: breakEnabled,
      });

      const pendingTasks = tasks.filter((task) => task.status !== 'completed');
      const targets = targetDates(scheduleMode, selectedDate, customDays, today);
      if (targets.length === 0) {
        toast.error('ما في أيام محددة لإنشاء الجدول');
        return;
      }

      for (const date of targets) {
        const generated = buildDaySchedule({
          date,
          wakeTime,
          sleepTime,
          prayerTimes,
          routines,
          tasks: pendingTasks,
          breakEnabled,
          subjectColors,
        });
        await replaceSchedule(userId, date, generated.map((entry) => ({ ...entry, user_id: userId })));
        if (scheduleMode !== 'different') {
          await saveWeekdayTemplate(userId, weekdayIndex(date), generated);
        }
      }

      const grouped = joinDayNames(targets);
      const message = (() => {
        switch (scheduleMode) {
          case 'same':
            return 'تم حفظ الجدول المكرر — بيتكرر كل أسبوع تلقائياً';
          case 'different':
            return `تم إنشاء جدول ${selectedDayName} لهذا اليوم فقط`;
          case 'custom':
            return `تم حفظ جدول ${grouped} — بيتكرر كل أسبوع`;
          default: {
            const exhaustive: never = scheduleMode;
            return exhaustive;
          }
        }
      })();
      onFinished(message, targets[0]);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ، حاولي مرة أخرى');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.25rem)] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            نظّم وقتك مع لبيب
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : phase === 'mode' ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">كيف بدك يكون الجدول؟</h3>
              <p className="text-xs text-muted-foreground">اختاري طريقة التنظيم قبل ما نبدأ</p>
            </div>
            <div className="space-y-2">
              {MODE_OPTIONS.map((opt) => {
                const active = scheduleMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setScheduleMode(opt.id);
                      if (opt.id === 'custom' && customDays.length === 0) {
                        setCustomDays([weekdayIndex(selectedDate)]);
                      }
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-right transition-all ${
                      active ? 'border-primary bg-primary/5 shadow-soft' : 'border-border/60'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'gradient-primary text-white' : 'bg-accent text-muted-foreground'}`}>
                      <opt.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{opt.title}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                    {active && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
            {scheduleMode === 'custom' && (
              <div className="space-y-2 rounded-2xl border border-border/60 p-3">
                <p className="text-sm font-medium">حددي الأيام اللي تشترك بنفس الجدول</p>
                <p className="text-[11px] text-muted-foreground">السبت المختار ينحفظ ويتكرر على كل سبت جاي</p>
                <div className="grid grid-cols-7 gap-1">
                  {WEEK_ORDER.map((index) => {
                    const active = customDays.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleCustomDay(index)}
                        className={`rounded-xl px-0.5 py-2 text-center transition-all ${
                          active ? 'gradient-primary text-white shadow-glow' : 'bg-accent/60 text-muted-foreground'
                        }`}
                      >
                        <div className="text-xs font-bold">{ARABIC_SHORT[index]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <Button onClick={startDetails} className="w-full rounded-xl gradient-primary">
              التالي <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              {STEP_LABELS.map((label, index) => {
                const num = index + 1;
                const active = step === num;
                const done = step > num;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(num as 1 | 2 | 3)}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        active || done ? 'gradient-primary text-white shadow-glow' : 'bg-accent text-muted-foreground'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : num}
                    </div>
                    <span className={`text-[11px] ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {step === 1 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">نوابتي</h3>
                      <p className="text-xs text-muted-foreground">أشياء ثابتة بوقت محدد مثل النوم والمدرسة والمركز. الرياضة والمذاكرة من المهام وتتنزل في الفراغ.</p>
                    </div>

                    <div className="space-y-2">
                      {routines.map((routine) => {
                        const meta = ROUTINE_META[routine.icon];
                        const Icon = meta.icon;
                        return (
                          <div key={routine.id} className="flex items-center gap-3 rounded-2xl glass-card p-3 shadow-soft">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{routine.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatPrayerClock(routine.start_time)} - {formatPrayerClock(routine.end_time)}
                                {routineNeedsDays(routine.icon) ? ` • ${formatWeekdayList(routine.weekdays ?? [])}` : ''}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => removeRoutine(routine.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      {routines.length === 0 && !addingRoutine && (
                        <p className="rounded-2xl bg-accent/40 p-4 text-center text-xs text-muted-foreground">لا يوجد نوابت بعد</p>
                      )}
                    </div>

                    {addingRoutine ? (
                      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                        <Input value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} placeholder="مثال: المركز - رياضيات" className="rounded-xl" />
                        <div className="flex flex-wrap gap-2">
                          {ROUTINE_ICON_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setRoutineIcon(opt.id);
                                setRoutineTitle(ROUTINE_DEFAULT_TITLES[opt.id] ?? '');
                                if (routineNeedsDays(opt.id) && routineDays.length === 0) {
                                  setRoutineDays(SCHOOL_WEEKDAYS);
                                }
                              }}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                                routineIcon === opt.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                              }`}
                            >
                              <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="mb-1.5 block text-xs">من</Label>
                            <Input type="time" value={routineStart} onChange={(e) => setRoutineStart(e.target.value)} className="rounded-xl" />
                          </div>
                          <div>
                            <Label className="mb-1.5 block text-xs">إلى</Label>
                            <Input type="time" value={routineEnd} onChange={(e) => setRoutineEnd(e.target.value)} className="rounded-xl" />
                          </div>
                        </div>
                        {routineNeedsDays(routineIcon) && (
                          <div className="space-y-2">
                            <Label className="block text-xs">أيام الدوام</Label>
                            <p className="text-[11px] text-muted-foreground">
                              حددي الأيام اللي بداومين فيها على {attendancePlace(routineIcon)}
                            </p>
                            <div className="grid grid-cols-7 gap-1">
                              {weekDays.map((day) => {
                                const index = weekdayIndex(day.date);
                                const active = routineDays.includes(index);
                                return (
                                  <button
                                    key={day.date}
                                    type="button"
                                    onClick={() => toggleRoutineDay(index)}
                                    className={`rounded-xl px-0.5 py-2 text-center transition-all ${
                                      active ? 'gradient-primary text-white shadow-glow' : 'bg-accent/60 text-muted-foreground'
                                    }`}
                                  >
                                    <div className="text-[10px] opacity-80">{day.short}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button onClick={submitRoutine} className="flex-1 rounded-xl gradient-primary">إضافة</Button>
                          <Button variant="outline" onClick={() => setAddingRoutine(false)} className="rounded-xl">إلغاء</Button>
                        </div>
                      </div>
                    ) : (
                        <Button variant="outline" onClick={() => {
                          setAddingRoutine(true);
                          setRoutineDays(SCHOOL_WEEKDAYS);
                        }} className="w-full rounded-xl">
                        <Plus className="h-4 w-4" /> أضيفي شيء ثابت
                      </Button>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">مهامي</h3>
                      <p className="text-xs text-muted-foreground">حددي المدة فقط — لبيب يوزّع الرياضة والدراسة وباقي المهام على وقت فراغك بعد النوابت.</p>
                    </div>

                    <div className="space-y-2">
                      {tasks.map((task) => {
                        const priority = PRIORITY_OPTIONS.find((opt) => opt.id === task.priority) ?? PRIORITY_OPTIONS[1];
                        const color = task.subject_name ? subjectColors[task.subject_name] ?? '#2563EB' : '#94A3B8';
                        return (
                          <div key={task.id} className="flex items-center gap-3 rounded-2xl glass-card p-3 shadow-soft">
                            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{task.title}</div>
                              {task.subject_name && <div className="text-xs text-muted-foreground">{task.subject_name}</div>}
                            </div>
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">
                              {durationLabel(task.duration_minutes ?? 60)}
                            </span>
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `${priority.color}18`, color: priority.color }}>
                              {priority.label}
                            </span>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => removeTask(task.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      {tasks.length === 0 && !addingTask && (
                        <p className="rounded-2xl bg-accent/40 p-4 text-center text-xs text-muted-foreground">لا توجد مهام بعد</p>
                      )}
                    </div>

                    {addingTask ? (
                      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
                        <div className="flex flex-wrap gap-2">
                          {TASK_KIND_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setTaskKind(opt.id);
                                if (opt.title) setTaskTitle(opt.title);
                                if (opt.id !== 'study') setTaskSubject('none');
                              }}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                                taskKind === opt.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                              }`}
                            >
                              <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                            </button>
                          ))}
                        </div>
                        <Input
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder={taskKind === 'study' ? 'مثال: مراجعة الوحدة الثانية' : 'اسم المهمة'}
                          className="rounded-xl"
                        />
                        {taskKind === 'study' && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setTaskSubject('none')}
                              className={`rounded-full border px-3 py-1.5 text-xs transition-all ${taskSubject === 'none' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                            >
                              بدون مادة
                            </button>
                            {userSubjects.map((us) => (
                              <button
                                key={us.subject_id}
                                type="button"
                                onClick={() => setTaskSubject(us.subject_id)}
                                className={`rounded-full border px-3 py-1.5 text-xs transition-all ${taskSubject === us.subject_id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                              >
                                {us.subjects.name_ar}
                              </button>
                            ))}
                          </div>
                        )}
                        <div>
                          <Label className="mb-1.5 block text-xs">المدة — بدون ساعة محددة، تتنزل في الفراغ</Label>
                          <div className="flex flex-wrap gap-2">
                            {DURATION_PRESETS.map((preset) => (
                              <button
                                key={preset.minutes}
                                type="button"
                                onClick={() => setTaskDuration(preset.minutes)}
                                className={`rounded-full border px-3 py-1.5 text-xs transition-all ${taskDuration === preset.minutes ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                              >
                                {preset.label}
                              </button>
                            ))}
                            <Input
                              type="number"
                              min={15}
                              max={240}
                              step={15}
                              value={taskDuration}
                              onChange={(e) => setTaskDuration(Math.max(15, Number(e.target.value) || 15))}
                              className="h-8 w-20 rounded-full text-center text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="mb-1.5 block text-xs">الأولوية</Label>
                          <div className="flex gap-2">
                            {PRIORITY_OPTIONS.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setTaskPriority(opt.id)}
                                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                                  taskPriority === opt.id ? 'text-white' : 'text-muted-foreground'
                                }`}
                                style={taskPriority === opt.id ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={submitTask} className="flex-1 rounded-xl gradient-primary">إضافة</Button>
                          <Button variant="outline" onClick={() => setAddingTask(false)} className="rounded-xl">إلغاء</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => setAddingTask(true)} className="w-full rounded-xl">
                        <Plus className="h-4 w-4" /> إضافة مهمة جديدة
                      </Button>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">ملاحظاتي</h3>
                      <p className="text-xs text-muted-foreground">أي ملاحظات خاصة؟</p>
                    </div>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                      maxLength={200}
                      placeholder="مثال: أريد وقت راحة أطول بعد المدرسة، لا أستطيع الدراسة بعد العشاء..."
                      className="min-h-[140px] rounded-xl"
                    />
                    <p className="text-left text-xs text-muted-foreground">{notes.length}/200</p>
                    <div className="flex items-center justify-between rounded-2xl bg-accent/40 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        تفعيل وقت الراحة بين المهام
                      </div>
                      <Switch checked={breakEnabled} onCheckedChange={setBreakEnabled} />
                    </div>
                    <Button onClick={finish} disabled={generating} className="w-full rounded-xl gradient-primary shadow-glow">
                      {generating ? 'جاري الإنشاء...' : <><Sparkles className="h-4 w-4" /> أنشئ جدولي</>}
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {step < 3 && (
              <div className="flex items-center justify-between border-t border-border/40 pt-4">
                <Button variant="ghost" onClick={goBack} className="rounded-xl">
                  <ChevronRight className="h-4 w-4" /> السابق
                </Button>
                <Button onClick={goNext} className="rounded-xl gradient-primary">
                  التالي <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}
            {step === 3 && (
              <div className="flex items-center justify-start border-t border-border/40 pt-4">
                <Button variant="ghost" onClick={goBack} className="rounded-xl">
                  <ChevronRight className="h-4 w-4" /> السابق
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
