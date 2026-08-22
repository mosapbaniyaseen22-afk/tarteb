'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarDays, Check, Clock, Download, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { guestStore } from '@/lib/guest-db';
import {
  buildStudyPlan,
  parseFocusSubjects,
  requiredHoursForTarget,
  type StudyPlan,
} from '@/lib/study-plan';
import { downloadStudyPlanPdf } from '@/lib/study-plan-pdf';
import type { UserSubject } from '@/lib/supabase';

type Step = 'hours' | 'subjects' | 'goal' | 'result';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  studentName: string;
  userSubjects: UserSubject[];
  onCreated: (plan: StudyPlan) => void;
  onOrganize: (plan: StudyPlan) => void;
};

const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const GPA_OPTIONS = [70, 75, 80, 85, 90, 95, 98];
const GOAL_OPTIONS = ['أرفع معدلي', 'أدخل طب', 'أدخل هندسة', 'أضمن نجاحي', 'أتفوق على نفسي'];

export function StudyPlanWizard({
  open, onOpenChange, userId, studentName, userSubjects, onCreated, onOrganize,
}: Props) {
  const catalog = userSubjects.map((item) => item.subjects.name_ar).filter(Boolean);
  const [step, setStep] = useState<Step>('hours');
  const [hours, setHours] = useState(4);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [goal, setGoal] = useState('أرفع معدلي');
  const [target, setTarget] = useState(90);
  const [focusNote, setFocusNote] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const names = userSubjects.map((item) => item.subjects.name_ar).filter(Boolean);
    setSelectedSubjects((current) => (current.length > 0 ? current : names));
  }, [userSubjects]);

  const required = requiredHoursForTarget(target, Math.max(1, selectedSubjects.length || catalog.length || 1));
  const notedFocus = parseFocusSubjects(focusNote, selectedSubjects);

  const canNext = useMemo(() => {
    switch (step) {
      case 'hours':
        return hours >= 1;
      case 'subjects':
        return selectedSubjects.length > 0;
      case 'goal':
        return target >= 50 && goal.trim().length > 0;
      case 'result':
        return Boolean(plan);
      default: {
        const exhaustive: never = step;
        return exhaustive;
      }
    }
  }, [step, hours, selectedSubjects.length, target, goal, plan]);

  const reset = () => {
    setStep('hours');
    setPlan(null);
  };

  const toggleSubject = (name: string) => {
    setSelectedSubjects((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  };

  const goNext = () => {
    switch (step) {
      case 'hours':
        setStep('subjects');
        return;
      case 'subjects':
        setStep('goal');
        return;
      case 'goal': {
        const next = buildStudyPlan({
          userId,
          studentName,
          hoursPerDay: hours,
          subjects: selectedSubjects,
          goal,
          targetAverage: target,
          focusNote,
        });
        guestStore.saveStudyPlan(next);
        setPlan(next);
        onCreated(next);
        setStep('result');
        toast.success('تم إنشاء خطتك');
        return;
      }
      case 'result':
        return;
      default: {
        const exhaustive: never = step;
        return exhaustive;
      }
    }
  };

  const goBack = () => {
    switch (step) {
      case 'hours':
        onOpenChange(false);
        return;
      case 'subjects':
        setStep('hours');
        return;
      case 'goal':
        setStep('subjects');
        return;
      case 'result':
        setStep('goal');
        return;
      default: {
        const exhaustive: never = step;
        return exhaustive;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            عمل خطة دراسة
          </DialogTitle>
        </DialogHeader>

        {step === 'hours' ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              منعمل جدول لكل أيام الأسبوع ويتكرر لوحده. عدّل يوم بس إذا بدك.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              كم ساعة معك باليوم تدرس؟
            </div>
            <div className="grid grid-cols-4 gap-2">
              {HOUR_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHours(value)}
                  className={`rounded-2xl py-3 text-sm font-semibold ${
                    hours === value ? 'gradient-primary text-white shadow-glow' : 'glass-card'
                  }`}
                >
                  {value} س
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">لمعدل {target} تقريباً تحتاج {required} ساعات يومياً.</p>
          </div>
        ) : null}

        {step === 'subjects' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              اختر موادك. كلها بتندرس كل يوم
            </div>
            <div className="grid grid-cols-2 gap-2">
              {catalog.map((name) => {
                const active = selectedSubjects.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleSubject(name)}
                    className={`rounded-2xl p-3 text-right text-sm font-medium ${
                      active ? 'bg-primary text-white' : 'glass-card'
                    }`}
                  >
                    {active ? <Check className="mb-1 h-4 w-4" /> : null}
                    {name}
                  </button>
                );
              })}
            </div>
            {catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground">ما في مواد محفوظة. أضف موادك من الملف الشخصي أولاً.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {selectedSubjects.length} مواد — كل واحدة إلها حصة كل يوم
              </p>
            )}
          </div>
        ) : null}

        {step === 'goal' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              شو هدفك؟ وكم بدك تجيب معدل؟
            </div>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGoal(item)}
                  className={`rounded-full px-3 py-2 text-sm ${goal === item ? 'gradient-primary text-white' : 'glass-card'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <Input value={goal} onChange={(event) => setGoal(event.target.value)} className="rounded-2xl" placeholder="اكتب هدفك" />
            <Label className="block text-sm">المعدل المطلوب</Label>
            <div className="grid grid-cols-4 gap-2">
              {GPA_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={`rounded-2xl py-3 text-sm font-semibold ${
                    target === value ? 'gradient-primary text-white shadow-glow' : 'glass-card'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <div>
              <Label className="mb-2 block text-sm">ملاحظات (اختياري)</Label>
              <Textarea
                value={focusNote}
                onChange={(event) => setFocusNote(event.target.value)}
                placeholder="مثال: ركز على الرياضيات، عندي ضعف في الفيزياء"
                className="min-h-[88px] rounded-2xl"
              />
              {notedFocus.length > 0 ? (
                <p className="mt-2 text-xs text-primary">تركيز أعلى على: {notedFocus.join(' · ')}</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  إذا ما كتبت ملاحظة، كل المواد تاخد وقت متوازن كل يوم.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {step === 'result' && plan ? (
          <div className="space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-teal-600 p-5 text-white">
              <p className="text-xs text-white/80">جدول أسبوعي متكرر</p>
              <h3 className="mt-1 text-xl font-bold">{plan.title}</h3>
              <p className="mt-2 text-sm text-white/85">الهدف: {plan.goal}</p>
            </div>
            {plan.warning ? (
              <div className="flex gap-2 rounded-2xl bg-amber-500/15 p-3 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {plan.warning}
              </div>
            ) : (
              <p className="rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                الساعات مناسبة. التزم بالجدول اليومي والمعدل قريب.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl glass-card p-3">
                <div className="text-lg font-bold">{plan.hoursPerDay}س</div>
                <div className="text-[11px] text-muted-foreground">يومياً</div>
              </div>
              <div className="rounded-2xl glass-card p-3">
                <div className="text-lg font-bold">{plan.weeklyHours}س</div>
                <div className="text-[11px] text-muted-foreground">أسبوعياً</div>
              </div>
              <div className="rounded-2xl glass-card p-3">
                <div className="text-lg font-bold">{plan.subjects.length}</div>
                <div className="text-[11px] text-muted-foreground">مواد كل يوم</div>
              </div>
            </div>
            {plan.focusSubjects && plan.focusSubjects.length > 0 ? (
              <p className="rounded-2xl bg-primary/8 p-3 text-sm">
                تركيز أعلى على {plan.focusSubjects.join(' و ')}
              </p>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-semibold">توزيع اليوم</p>
              {plan.subjectMinutes.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl glass-card px-3 py-2 text-sm">
                  <span>{item.name}{item.focused ? ' · تركيز' : ''}</span>
                  <span className="text-xs text-muted-foreground">{item.minutesPerDay} د</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {plan.weekDays.map((day) => (
                <div key={day.weekday} className="rounded-2xl glass-card p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{day.label}</span>
                    <span className="text-xs text-muted-foreground">{Math.round(day.minutes / 60 * 10) / 10} س</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{day.note}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {plan.rules.map((rule) => (
                <p key={rule} className="text-xs text-muted-foreground">• {rule}</p>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="h-12 rounded-2xl font-semibold"
                disabled={downloading}
                onClick={() => {
                  void (async () => {
                    setDownloading(true);
                    try {
                      await downloadStudyPlanPdf(plan);
                      toast.success('تم تحميل الخطة PDF');
                    } catch {
                      toast.error('تعذر تحميل الملف');
                    } finally {
                      setDownloading(false);
                    }
                  })();
                }}
              >
                <Download className="h-4 w-4" />
                {downloading ? 'جارٍ التحميل...' : 'تحميل الخطة PDF'}
              </Button>
              <Button
                className="h-12 rounded-2xl gradient-primary font-semibold"
                onClick={() => {
                  onOpenChange(false);
                  onOrganize(plan);
                }}
              >
                <CalendarDays className="h-4 w-4" />
                نظّم وقتك مع خطتك
              </Button>
            </div>
          </div>
        ) : null}

        {step !== 'result' ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-2xl" onClick={goBack}>رجوع</Button>
            <Button className="flex-1 rounded-2xl gradient-primary" disabled={!canNext} onClick={goNext}>
              التالي
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
