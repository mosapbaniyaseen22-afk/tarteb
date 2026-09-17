'use client';

import { useEffect, useState } from 'react';
import {
  BookMarked, BookOpen, Building2, Check, ChevronLeft, ChevronRight, Coffee, Dumbbell,
  Plus, School, Sparkles, Trash2, UtensilsCrossed, Users, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { addRoutine, replaceSchedule, savePreferences, saveWeekdayTemplate } from '@/lib/app-data';
import { guestStore } from '@/lib/guest-db';
import { buildDaySchedule, type LifestyleActivity, type LifestyleKind } from '@/lib/schedule-generator';
import { buildStudyPlan, studyTasksFromSubjectPlans, type StudyPlan, type SubjectDayPlan } from '@/lib/study-plan';
import { ARABIC_SHORT, SCHOOL_WEEKDAYS, WEEK_ORDER, upcomingWeekdayOnOrAfter, useJordanToday, weekdayIndex } from '@/lib/week';
import type { PrayerTimes } from '@/lib/prayer-times';
import type { Routine, RoutineIcon, UserSubject } from '@/lib/supabase';

type Commitment = {
  id: string;
  title: string;
  icon: RoutineIcon;
  start: string;
  end: string;
  weekdays: number[];
};

type SubjectDraft = SubjectDayPlan & { selected: boolean };

type LifestyleDraft = LifestyleActivity & { id: string; timed: boolean };

type WizardStep = 'day' | 'subjects' | 'lifestyle';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  studentName: string;
  plan: StudyPlan | null;
  prayerTimes: PrayerTimes | null;
  userSubjects: UserSubject[];
  onCreated: (plan: StudyPlan) => void;
  onFinished: (message: string, focusDate: string) => void;
};

const COMMITMENT_TYPES: { id: RoutineIcon; label: string; icon: typeof School }[] = [
  { id: 'school', label: 'مدرسة', icon: School },
  { id: 'center', label: 'مركز', icon: Building2 },
  { id: 'sport', label: 'نادي', icon: Dumbbell },
  { id: 'custom', label: 'التزام ثاني', icon: Wand2 },
];

const DEFAULT_TIMES: Record<RoutineIcon, { title: string; start: string; end: string; days: number[] }> = {
  school: { title: 'المدرسة', start: '07:30', end: '13:30', days: [...SCHOOL_WEEKDAYS] },
  center: { title: 'المركز', start: '16:00', end: '18:00', days: [0, 2, 4] },
  sport: { title: 'النادي', start: '18:30', end: '19:30', days: [1, 3] },
  custom: { title: 'التزام', start: '15:00', end: '16:00', days: [6] },
  sleep: { title: 'النوم', start: '22:30', end: '22:45', days: [] },
};

const HOUR_PRESETS = [
  { label: 'نصف ساعة', hours: 0.5 },
  { label: 'ساعة', hours: 1 },
  { label: 'ساعة ونصف', hours: 1.5 },
  { label: 'ساعتان', hours: 2 },
  { label: '3 ساعات', hours: 3 },
];

const LIFESTYLE_PRESETS: { kind: LifestyleKind; title: string; durationMinutes: number; startTime: string | null; icon: typeof School }[] = [
  { kind: 'meal', title: 'فطور', durationMinutes: 30, startTime: '06:45', icon: UtensilsCrossed },
  { kind: 'meal', title: 'غداء', durationMinutes: 45, startTime: null, icon: UtensilsCrossed },
  { kind: 'meal', title: 'عشاء', durationMinutes: 40, startTime: null, icon: UtensilsCrossed },
  { kind: 'quran', title: 'قراءة قرآن', durationMinutes: 20, startTime: null, icon: BookMarked },
  { kind: 'friends', title: 'خروج مع الأصدقاء', durationMinutes: 90, startTime: null, icon: Users },
  { kind: 'rest', title: 'راحة', durationMinutes: 30, startTime: null, icon: Coffee },
  { kind: 'custom', title: 'موعد خلال اليوم', durationMinutes: 45, startTime: null, icon: Wand2 },
];

const DURATION_PRESETS = [
  { label: '15 د', minutes: 15 },
  { label: '30 د', minutes: 30 },
  { label: '45 د', minutes: 45 },
  { label: 'ساعة', minutes: 60 },
  { label: 'ساعة ونصف', minutes: 90 },
  { label: 'ساعتان', minutes: 120 },
];

function defaultSubjectDrafts(names: string[], plan: StudyPlan | null): SubjectDraft[] {
  const saved = new Map((plan?.subjectSchedules ?? []).map((item) => [item.name, item]));
  const selectedNames = plan?.subjects?.length ? plan.subjects : names;
  return names.map((name) => {
    const match = saved.get(name);
    return {
      name,
      selected: selectedNames.includes(name),
      hoursPerDay: match?.hoursPerDay ?? 1,
      weekdays: match?.weekdays?.length ? match.weekdays : [...WEEK_ORDER],
    };
  });
}

function hoursLabel(hours: number) {
  if (hours === 0.5) return 'نصف ساعة';
  if (hours === 1) return 'ساعة';
  if (hours === 1.5) return 'ساعة ونصف';
  if (hours === 2) return 'ساعتان';
  return `${hours} ساعات`;
}

export function TimeWithPlanWizard({
  open, onOpenChange, userId, studentName, plan, prayerTimes, userSubjects, onCreated, onFinished,
}: Props) {
  const today = useJordanToday();
  const [step, setStep] = useState<WizardStep>('day');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [sleepTime, setSleepTime] = useState('22:30');
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [subjects, setSubjects] = useState<SubjectDraft[]>([]);
  const [customSubject, setCustomSubject] = useState('');
  const [lifestyle, setLifestyle] = useState<LifestyleDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('day');
    setSaving(false);
    setCustomSubject('');
    const names = userSubjects.map((item) => item.subjects.name_ar).filter(Boolean);
    setSubjects(defaultSubjectDrafts(names, plan));
    setLifestyle([]);
  }, [open]);

  const selectedSubjects = subjects.filter((item) => item.selected && item.hoursPerDay > 0 && item.weekdays.length > 0);

  const addCommitment = (icon: RoutineIcon) => {
    const meta = DEFAULT_TIMES[icon];
    setCommitments((current) => [
      ...current,
      {
        id: `${icon}-${Date.now()}`,
        title: meta.title,
        icon,
        start: meta.start,
        end: meta.end,
        weekdays: meta.days,
      },
    ]);
  };

  const updateCommitment = (id: string, patch: Partial<Commitment>) => {
    setCommitments((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const toggleCommitmentDay = (id: string, day: number) => {
    setCommitments((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const weekdays = item.weekdays.includes(day)
          ? item.weekdays.filter((value) => value !== day)
          : [...item.weekdays, day];
        return { ...item, weekdays };
      }),
    );
  };

  const updateSubject = (name: string, patch: Partial<SubjectDraft>) => {
    setSubjects((current) => current.map((item) => (item.name === name ? { ...item, ...patch } : item)));
  };

  const toggleSubjectDay = (name: string, day: number) => {
    setSubjects((current) =>
      current.map((item) => {
        if (item.name !== name) return item;
        const weekdays = item.weekdays.includes(day)
          ? item.weekdays.filter((value) => value !== day)
          : [...item.weekdays, day];
        return { ...item, weekdays };
      }),
    );
  };

  const addCustomSubject = () => {
    const name = customSubject.trim();
    if (!name) return;
    if (subjects.some((item) => item.name === name)) {
      updateSubject(name, { selected: true });
      setCustomSubject('');
      return;
    }
    setSubjects((current) => [
      ...current,
      { name, selected: true, hoursPerDay: 1, weekdays: [...WEEK_ORDER] },
    ]);
    setCustomSubject('');
  };

  const addLifestyle = (preset: (typeof LIFESTYLE_PRESETS)[number]) => {
    setLifestyle((current) => [
      ...current,
      {
        id: `${preset.kind}-${Date.now()}`,
        title: preset.title,
        kind: preset.kind,
        durationMinutes: preset.durationMinutes,
        startTime: preset.startTime,
        weekdays: [...WEEK_ORDER],
        timed: Boolean(preset.startTime),
      },
    ]);
  };

  const updateLifestyle = (id: string, patch: Partial<LifestyleDraft>) => {
    setLifestyle((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const toggleLifestyleDay = (id: string, day: number) => {
    setLifestyle((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const weekdays = item.weekdays.includes(day)
          ? item.weekdays.filter((value) => value !== day)
          : [...item.weekdays, day];
        return { ...item, weekdays };
      }),
    );
  };

  const goNext = () => {
    switch (step) {
      case 'day':
        setStep('subjects');
        return;
      case 'subjects':
        if (selectedSubjects.length === 0) {
          toast.error('اختاري مادة، وحددي الساعات والأيام');
          return;
        }
        setStep('lifestyle');
        return;
      case 'lifestyle':
        return;
      default: {
        const exhaustive: never = step;
        return exhaustive;
      }
    }
  };

  const goBack = () => {
    switch (step) {
      case 'day':
        onOpenChange(false);
        return;
      case 'subjects':
        setStep('day');
        return;
      case 'lifestyle':
        setStep('subjects');
        return;
      default: {
        const exhaustive: never = step;
        return exhaustive;
      }
    }
  };

  const generate = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('اختاري مادة واحدة على الأقل');
      return;
    }
    setSaving(true);
    try {
      const subjectSchedules: SubjectDayPlan[] = selectedSubjects.map((item) => ({
        name: item.name,
        hoursPerDay: item.hoursPerDay,
        weekdays: item.weekdays,
      }));
      const maxDailyHours = Math.max(
        1,
        ...WEEK_ORDER.map((day) =>
          subjectSchedules
            .filter((item) => item.weekdays.includes(day))
            .reduce((sum, item) => sum + item.hoursPerDay, 0),
        ),
      );
      const nextPlan = buildStudyPlan({
        userId,
        studentName,
        hoursPerDay: maxDailyHours,
        subjects: subjectSchedules.map((item) => item.name),
        goal: plan?.goal ?? 'رفع المعدل',
        targetAverage: plan?.targetAverage ?? 90,
        subjectSchedules,
      });
      guestStore.saveStudyPlan(nextPlan);
      onCreated(nextPlan);

      const savedRoutines: Routine[] = [];
      for (const item of commitments) {
        savedRoutines.push(await addRoutine({
          user_id: userId,
          title: item.title,
          icon: item.icon,
          start_time: item.start,
          end_time: item.end,
          weekdays: item.weekdays,
        }));
      }
      savedRoutines.push(await addRoutine({
        user_id: userId,
        title: 'النوم',
        icon: 'sleep',
        start_time: sleepTime,
        end_time: sleepTime,
        weekdays: [],
      }));

      const colors = Object.fromEntries(userSubjects.map((row) => [row.subjects.name_ar, row.subjects.color]));
      const lifestyleItems: LifestyleActivity[] = lifestyle.map((item) => ({
        title: item.title.trim() || 'موعد',
        kind: item.kind,
        durationMinutes: item.durationMinutes,
        startTime: item.timed ? item.startTime : null,
        weekdays: item.weekdays,
      }));
      const dates = WEEK_ORDER.map((day) => upcomingWeekdayOnOrAfter(today, day));
      for (const date of dates) {
        const tasks = studyTasksFromSubjectPlans(userId, date, subjectSchedules);
        const entries = buildDaySchedule({
          date,
          wakeTime,
          sleepTime,
          prayerTimes,
          routines: savedRoutines,
          tasks,
          breakEnabled: true,
          subjectColors: colors,
          lifestyle: lifestyleItems,
        });
        await replaceSchedule(userId, date, entries.map((entry) => ({ ...entry, user_id: userId })));
        await saveWeekdayTemplate(userId, weekdayIndex(date), entries);
      }
      await savePreferences(userId, { wake_time: wakeTime, sleep_time: sleepTime, schedule_mode: 'same', break_enabled: true });
      toast.success('تم ترتيب جدولك مع البريكات والمواعيد');
      onFinished(`جدول ${nextPlan.studentName} جاهز ويتكرر كل أسبوع`, dates[0] ?? today);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('تعذر توليد الجدول');
    } finally {
      setSaving(false);
    }
  };

  const stepDone = (item: WizardStep) => {
    switch (item) {
      case 'day':
        return step === 'subjects' || step === 'lifestyle';
      case 'subjects':
        return step === 'lifestyle';
      case 'lifestyle':
        return false;
      default: {
        const exhaustive: never = item;
        return exhaustive;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>نظّم يومك مع خطتك</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'day', label: 'يومك' },
            { id: 'subjects', label: 'موادي' },
            { id: 'lifestyle', label: 'خلال اليوم' },
          ] as const).map((item, index) => {
            const active = step === item.id;
            const done = stepDone(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'lifestyle' && selectedSubjects.length === 0) {
                    toast.error('حددي المواد أولاً');
                    return;
                  }
                  setStep(item.id);
                }}
                className={`rounded-2xl px-2 py-2 text-xs font-semibold sm:text-sm ${
                  active || done ? 'gradient-primary text-white shadow-glow' : 'bg-accent text-muted-foreground'
                }`}
              >
                {index + 1}. {item.label}
              </button>
            );
          })}
        </div>

        {step === 'day' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              حددي نومك ومدرستك. الدراسة ما بتنحط قبل المدرسة، وبعدين نختار المواد والمواعيد خلال اليوم.
            </p>

            <div className="space-y-2 rounded-2xl bg-accent/40 p-3 text-xs text-muted-foreground">
              <p>أول جلسة بعد المدرسة للمادة الأصعب.</p>
              <p>جلسة الدراسة 50 دقيقة ثم استراحة، وبريك عند تبديل المادة.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-sm">الاستيقاظ</Label>
                <Input type="time" value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} className="rounded-2xl" />
              </div>
              <div>
                <Label className="mb-2 block text-sm">النوم</Label>
                <Input type="time" value={sleepTime} onChange={(event) => setSleepTime(event.target.value)} className="rounded-2xl" />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">أضف التزام</p>
              <div className="grid grid-cols-4 gap-2">
                {COMMITMENT_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addCommitment(item.id)}
                    className="rounded-2xl glass-card p-3 text-center text-xs font-medium hover:scale-[1.02]"
                  >
                    <item.icon className="mx-auto mb-1 h-4 w-4" />
                    {item.label}
                    <Plus className="mx-auto mt-1 h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {commitments.map((item) => (
                <div key={item.id} className="space-y-3 rounded-2xl glass-card p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.title}
                      onChange={(event) => updateCommitment(item.id, { title: event.target.value })}
                      className="rounded-xl"
                    />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setCommitments((current) => current.filter((row) => row.id !== item.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="time" value={item.start} onChange={(event) => updateCommitment(item.id, { start: event.target.value })} className="rounded-xl" />
                    <Input type="time" value={item.end} onChange={(event) => updateCommitment(item.id, { end: event.target.value })} className="rounded-xl" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {WEEK_ORDER.map((day) => {
                      const active = item.weekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleCommitmentDay(item.id, day)}
                          className={`rounded-full px-2 py-1 text-[11px] ${active ? 'bg-primary text-white' : 'bg-accent text-muted-foreground'}`}
                        >
                          {ARABIC_SHORT[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={goNext} className="h-12 w-full rounded-2xl gradient-primary font-semibold">
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {step === 'subjects' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              موادي: الاسم، الساعات، والأيام
            </div>
            <p className="text-xs text-muted-foreground">
              حددي كل مادة، كم ساعة بدك تدرسيها باليوم، وبأي أيام. الدراسة بتنحط بعد المدرسة فقط.
            </p>
            <div className="space-y-3">
              {subjects.map((item) => (
                <div key={item.name} className={`space-y-3 rounded-2xl p-3 ${item.selected ? 'glass-card' : 'bg-accent/40'}`}>
                  <button
                    type="button"
                    onClick={() => updateSubject(item.name, { selected: !item.selected })}
                    className="flex w-full items-center justify-between text-right"
                  >
                    <span className="font-semibold">{item.name}</span>
                    {item.selected ? <Check className="h-4 w-4 text-primary" /> : <span className="text-xs text-muted-foreground">اضغطي للاختيار</span>}
                  </button>
                  {item.selected ? (
                    <>
                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">كم ساعة باليوم؟ {hoursLabel(item.hoursPerDay)}</p>
                        <div className="flex flex-wrap gap-1">
                          {HOUR_PRESETS.map((preset) => (
                            <button
                              key={preset.hours}
                              type="button"
                              onClick={() => updateSubject(item.name, { hoursPerDay: preset.hours })}
                              className={`rounded-full px-2.5 py-1 text-[11px] ${
                                item.hoursPerDay === preset.hours ? 'bg-primary text-white' : 'bg-accent text-muted-foreground'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs text-muted-foreground">أيام المادة</p>
                        <div className="flex flex-wrap gap-1">
                          {WEEK_ORDER.map((day) => {
                            const active = item.weekdays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleSubjectDay(item.name, day)}
                                className={`rounded-full px-2 py-1 text-[11px] ${active ? 'bg-primary text-white' : 'bg-accent text-muted-foreground'}`}
                              >
                                {ARABIC_SHORT[day]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customSubject}
                onChange={(event) => setCustomSubject(event.target.value)}
                placeholder="مادة ثانية..."
                className="rounded-xl"
              />
              <Button type="button" variant="outline" className="rounded-xl" onClick={addCustomSubject}>
                إضافة
              </Button>
            </div>
            {subjects.length === 0 ? (
              <p className="rounded-2xl bg-accent/40 p-4 text-center text-xs text-muted-foreground">
                ما في مواد بعد. اكتبي اسم المادة فوق وأضيفيها.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={goBack} className="rounded-xl">
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <Button onClick={goNext} disabled={selectedSubjects.length === 0} className="h-12 flex-1 rounded-2xl gradient-primary font-semibold">
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'lifestyle' ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold">خلال اليوم</p>
            <p className="text-xs text-muted-foreground">
              أضيفي الأكل، القرآن، خروج مع الأصدقاء أو أي موعد. إذا ما حطيتي ساعة، الجدول بيحطه بالمكان الأنسب، وبعدين بيرتب الدراسة والبريكات.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LIFESTYLE_PRESETS.map((item) => (
                <button
                  key={`${item.kind}-${item.title}`}
                  type="button"
                  onClick={() => addLifestyle(item)}
                  className="rounded-2xl glass-card p-3 text-right text-xs font-medium hover:scale-[1.01]"
                >
                  <item.icon className="mb-1 h-4 w-4" />
                  {item.title}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {lifestyle.map((item) => (
                <div key={item.id} className="space-y-3 rounded-2xl glass-card p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.title}
                      onChange={(event) => updateLifestyle(item.id, { title: event.target.value })}
                      className="rounded-xl"
                    />
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setLifestyle((current) => current.filter((row) => row.id !== item.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.minutes}
                        type="button"
                        onClick={() => updateLifestyle(item.id, { durationMinutes: preset.minutes })}
                        className={`rounded-full px-2 py-1 text-[11px] ${
                          item.durationMinutes === preset.minutes ? 'bg-primary text-white' : 'bg-accent text-muted-foreground'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-accent/50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">موعد ثابت</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.timed ? 'بنثبته على الساعة اللي تختاريها' : 'الجدول بيحطه بأفضل وقت'}
                      </p>
                    </div>
                    <Switch
                      checked={item.timed}
                      onCheckedChange={(checked) => updateLifestyle(item.id, {
                        timed: checked,
                        startTime: checked ? (item.startTime ?? '16:00') : item.startTime,
                      })}
                    />
                  </div>
                  {item.timed ? (
                    <Input
                      type="time"
                      value={item.startTime ?? '16:00'}
                      onChange={(event) => updateLifestyle(item.id, { startTime: event.target.value })}
                      className="rounded-xl"
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-1">
                    {WEEK_ORDER.map((day) => {
                      const active = item.weekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleLifestyleDay(item.id, day)}
                          className={`rounded-full px-2 py-1 text-[11px] ${active ? 'bg-primary text-white' : 'bg-accent text-muted-foreground'}`}
                        >
                          {ARABIC_SHORT[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={goBack} className="rounded-xl">
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <Button
                onClick={() => void generate()}
                disabled={saving || selectedSubjects.length === 0}
                className="h-12 flex-1 rounded-2xl gradient-primary font-semibold"
              >
                <Sparkles className="h-4 w-4" />
                {saving ? 'عم نرتب جدولك...' : 'أنشئ الجدول'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
