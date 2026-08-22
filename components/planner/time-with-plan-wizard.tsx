'use client';

import { useState } from 'react';
import { Building2, Dumbbell, Plus, School, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addRoutine, replaceSchedule, savePreferences, saveWeekdayTemplate } from '@/lib/app-data';
import { buildDaySchedule } from '@/lib/schedule-generator';
import { studyTasksForDate, type StudyPlan } from '@/lib/study-plan';
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  plan: StudyPlan | null;
  prayerTimes: PrayerTimes | null;
  userSubjects: UserSubject[];
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

export function TimeWithPlanWizard({
  open, onOpenChange, userId, plan, prayerTimes, userSubjects, onFinished,
}: Props) {
  const today = useJordanToday();
  const [wakeTime, setWakeTime] = useState('06:30');
  const [sleepTime, setSleepTime] = useState('22:30');
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [saving, setSaving] = useState(false);

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

  const toggleDay = (id: string, day: number) => {
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

  const generate = async () => {
    if (!plan) {
      toast.error('سوّ خطة دراسية أولاً');
      return;
    }
    setSaving(true);
    try {
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
      const dates = WEEK_ORDER.map((day) => upcomingWeekdayOnOrAfter(today, day));
      for (const date of dates) {
        const tasks = studyTasksForDate(plan, userId, date);
        const quranTask: typeof tasks[number] = {
          id: `quran-${date}`,
          user_id: userId,
          title: 'ورد القرآن',
          subject_id: null,
          subject_name: null,
          task_date: date,
          start_time: null,
          end_time: null,
          duration_minutes: 20,
          kind: 'quran',
          priority: 'medium',
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        const entries = buildDaySchedule({
          date,
          wakeTime,
          sleepTime,
          prayerTimes,
          routines: savedRoutines,
          tasks: [...tasks, quranTask],
          breakEnabled: true,
          subjectColors: colors,
        });
        await replaceSchedule(userId, date, entries.map((entry) => ({ ...entry, user_id: userId })));
        await saveWeekdayTemplate(userId, weekdayIndex(date), entries);
      }
      await savePreferences(userId, { wake_time: wakeTime, sleep_time: sleepTime, schedule_mode: 'same', break_enabled: true });
      toast.success('تم توليد الجدول النهائي');
      onFinished(`جدول ${plan.studentName} جاهز ويتكرر كل أسبوع`, dates[0] ?? today);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('تعذر توليد الجدول');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>نظّم وقتك مع خطتك</DialogTitle>
        </DialogHeader>
        {plan ? (
          <div className="rounded-2xl bg-primary/8 p-3 text-sm">
            <p className="font-semibold">{plan.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              منضيف التزاماتك (مدرسة، مركز، نادي...) وبعدين نولّد جدول يدمجها مع خطتك ويتكرر كل أسبوع
            </p>
          </div>
        ) : (
          <p className="text-sm text-destructive">لازم تعمل خطة دراسة أولاً</p>
        )}

        <div className="space-y-2 rounded-2xl bg-accent/40 p-3 text-xs text-muted-foreground">
          <p>أول 90 دقيقة بعد المدرسة للمادة الأصعب، بدون جوال.</p>
          <p>جلسة الدراسة 50 دقيقة ثم 10 راحة، وتهدئة 30 دقيقة قبل النوم.</p>
          <p>الجمعة خفيفة، والسبت لتعويض أي تقصير.</p>
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
            <div key={item.id} className="rounded-2xl glass-card p-3 space-y-3">
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
                      onClick={() => toggleDay(item.id, day)}
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

        <Button
          onClick={() => void generate()}
          disabled={!plan || saving}
          className="h-12 w-full rounded-2xl gradient-primary font-semibold"
        >
          <Sparkles className="h-4 w-4" />
          {saving ? 'عم نولّد جدولك...' : 'توليد الخطة النهائية'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
