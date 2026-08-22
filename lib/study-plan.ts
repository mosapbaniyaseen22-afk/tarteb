import type { Task } from './supabase';
import { weekdayIndex } from './week';

export type PlanHorizon = 'daily' | 'weekly' | 'monthly';
export type HoursFit = 'ok' | 'tight' | 'low';

export type StudyPlan = {
  id: string;
  userId: string;
  studentName: string;
  title: string;
  horizon: PlanHorizon;
  hoursPerDay: number;
  requiredHours: number;
  expectedAverage: number;
  hoursFit: HoursFit;
  warning: string | null;
  subjectCount: number;
  subjects: string[];
  goal: string;
  targetAverage: number;
  weeklyHours: number;
  subjectMinutes: { name: string; minutesPerDay: number; weeklySessions: number; hard: boolean; focused: boolean }[];
  weekDays: { weekday: number; label: string; focus: string[]; minutes: number; note: string }[];
  monthPhases: { week: number; theme: string; detail: string }[] | null;
  focusNote?: string;
  focusSubjects?: string[];
  rules: string[];
  createdAt: string;
};

const HARD_SUBJECTS = ['الرياضيات', 'رياضيات', 'فيزياء', 'كيمياء', 'أحياء', 'رياضيات أعمال'];

export function horizonLabel(horizon: PlanHorizon): string {
  switch (horizon) {
    case 'daily':
      return 'يومية';
    case 'weekly':
      return 'أسبوعية';
    case 'monthly':
      return 'شهرية';
    default: {
      const exhaustive: never = horizon;
      return exhaustive;
    }
  }
}

export function requiredHoursForTarget(targetAverage: number, subjectCount: number): number {
  let base = 2.25;
  if (targetAverage >= 98) base = 7;
  else if (targetAverage >= 95) base = 6.5;
  else if (targetAverage >= 90) base = 5.5;
  else if (targetAverage >= 85) base = 4.5;
  else if (targetAverage >= 80) base = 4;
  else if (targetAverage >= 75) base = 3.25;
  else if (targetAverage >= 70) base = 2.75;
  const extra = Math.max(0, subjectCount - 4) * 0.25;
  return Math.round((base + extra) * 10) / 10;
}

export function expectedAverageFromHours(hoursPerDay: number, subjectCount: number): number {
  const effective = hoursPerDay / (1 + 0.08 * Math.max(0, subjectCount - 4));
  if (effective >= 6.5) return 96;
  if (effective >= 5.5) return 92;
  if (effective >= 4.5) return 87;
  if (effective >= 4) return 82;
  if (effective >= 3.25) return 77;
  if (effective >= 2.5) return 72;
  return 65;
}

export function hoursFitStatus(hoursPerDay: number, required: number): HoursFit {
  if (hoursPerDay + 0.05 < required * 0.72) return 'low';
  if (hoursPerDay + 0.05 < required) return 'tight';
  return 'ok';
}

function isHardSubject(name: string) {
  return HARD_SUBJECTS.some((item) => name.includes(item) || item.includes(name));
}

function normalizeName(value: string) {
  return value.replace(/^ال/, '').replace(/\s+/g, '').trim();
}

export function parseFocusSubjects(note: string, subjects: string[]): string[] {
  const text = note.trim();
  if (!text) return [];
  return subjects.filter((name) => {
    if (text.includes(name)) return true;
    const short = normalizeName(name);
    return short.length >= 3 && text.includes(short);
  });
}

function allocateSubjectMinutes(
  subjects: string[],
  usableMinutes: number,
  focusSubjects: string[],
): StudyPlan['subjectMinutes'] {
  const focus = new Set(focusSubjects);
  const ranked = [...subjects].sort((a, b) => {
    const score = (name: string) => (focus.has(name) ? 2 : 0) + (isHardSubject(name) ? 1 : 0);
    return score(b) - score(a);
  });
  const weights = ranked.map((name) => {
    if (focus.has(name)) return 2.2;
    if (isHardSubject(name)) return 1.2;
    return 1;
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const rows = ranked.map((name, index) => ({
    name,
    minutesPerDay: Math.max(8, Math.round(usableMinutes * (weights[index] / totalWeight))),
    weeklySessions: 7,
    hard: isHardSubject(name),
    focused: focus.has(name),
  }));
  const delta = usableMinutes - rows.reduce((sum, row) => sum + row.minutesPerDay, 0);
  if (rows[0] && delta !== 0) {
    rows[0] = { ...rows[0], minutesPerDay: Math.max(8, rows[0].minutesPerDay + delta) };
  }
  return rows;
}

const WEEKDAY_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function buildStudyPlan(input: {
  userId: string;
  studentName: string;
  hoursPerDay: number;
  subjects: string[];
  goal: string;
  targetAverage: number;
  focusNote?: string;
}): StudyPlan {
  const hoursPerDay = Math.min(12, Math.max(1, input.hoursPerDay));
  const subjects = input.subjects.length ? input.subjects : ['مذاكرة عامة'];
  const focusNote = input.focusNote?.trim() ?? '';
  const focusSubjects = parseFocusSubjects(focusNote, subjects);
  const requiredHours = requiredHoursForTarget(input.targetAverage, subjects.length);
  const hoursFit = hoursFitStatus(hoursPerDay, requiredHours);
  const expectedAverage = expectedAverageFromHours(hoursPerDay, subjects.length);
  const usableMinutes = Math.round(hoursPerDay * 50);
  const subjectMinutes = allocateSubjectMinutes(subjects, usableMinutes, focusSubjects);
  const subjectNames = subjectMinutes.map((item) => item.name);

  const weekOrder = [6, 0, 1, 2, 3, 4, 5];
  const weekDays = weekOrder.map((weekday) => {
    const friday = weekday === 5;
    const saturday = weekday === 6;
    const minutes = friday ? Math.round(usableMinutes * 0.8) : usableMinutes;
    const note = friday
      ? 'كل المواد موجودة، بوقت أخف شوي حتى ترتاح'
      : saturday
        ? 'نفس الجدول اليومي، ويتكرر كل سبت إلا إذا عدّلت يوم'
        : focusSubjects.length
          ? `كل المواد اليوم، مع تركيز أعلى على ${focusSubjects.join(' و ')}`
          : 'كل المواد اليوم. الجدول نفسه يتكرر كل أسبوع';
    return { weekday, label: WEEKDAY_LABELS[weekday] ?? 'يوم', focus: subjectNames, minutes, note };
  });

  const warning = (() => {
    switch (hoursFit) {
      case 'low':
        return `هاي الساعات مش كافية لتحقيق حلمك. بمعدل ${hoursPerDay} ساعات يومياً، المتوقع حوالي ${expectedAverage} مش ${input.targetAverage}. زِد ساعة أو ساعتين، أو قلّل المواد المركّزة.`;
      case 'tight':
        return `الساعات على الحد. تقدر تقارب ${input.targetAverage} إذا التزمت كل يوم وما ضيّعت الوقت بعد المدرسة.`;
      case 'ok':
        return null;
      default: {
        const exhaustive: never = hoursFit;
        return exhaustive;
      }
    }
  })();

  const studentName = input.studentName.trim() || 'الطالب';
  return {
    id: `plan_${Date.now().toString(36)}`,
    userId: input.userId,
    studentName,
    title: `خطة ${studentName} للوصول إلى معدل ${input.targetAverage}`,
    horizon: 'weekly',
    hoursPerDay,
    requiredHours,
    expectedAverage,
    hoursFit,
    warning,
    subjectCount: subjects.length,
    subjects,
    goal: input.goal.trim() || 'رفع المعدل',
    targetAverage: input.targetAverage,
    weeklyHours: Math.round((weekDays.reduce((sum, day) => sum + day.minutes, 0) / 60) * 10) / 10,
    subjectMinutes,
    weekDays,
    monthPhases: null,
    focusNote,
    focusSubjects,
    rules: [
      'الجدول لكل أيام الأسبوع ويتكرر لوحده، وعدّل يوم بس إذا احتجت',
      'كل المواد تُدرس كل يوم، والمادة اللي كتبت عليها ملاحظة تاخد وقت أكبر',
      'أول جلسة بعد المدرسة للمادة الأهم أو الأضعف',
      'جلسة الدراسة 50 دقيقة ثم 10 راحة',
      'لا دراسة بعد 30 دقيقة من موعد النوم',
      'الجمعة أخف شوي، ومن غير ما نشيل أي مادة',
      'ورد قرآن أو ذكر قصير يثبت التركيز قبل المذاكرة',
    ],
    createdAt: new Date().toISOString(),
  };
}

function makeTask(
  userId: string,
  date: string,
  index: number,
  title: string,
  minutes: number,
  subjectName: string | null,
  priority: Task['priority'],
): Task {
  return {
    id: `plan-task-${date}-${index}`,
    user_id: userId,
    title,
    subject_id: null,
    subject_name: subjectName,
    task_date: date,
    start_time: null,
    end_time: null,
    duration_minutes: minutes,
    kind: 'study',
    priority,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
}

export function studyTasksForDate(plan: StudyPlan, userId: string, date: string): Task[] {
  const weekday = weekdayIndex(date);
  const day = plan.weekDays.find((item) => item.weekday === weekday) ?? plan.weekDays[0];
  if (!day) return [];

  const baseMinutes = plan.subjectMinutes.reduce((sum, item) => sum + item.minutesPerDay, 0) || day.minutes;
  const scale = baseMinutes > 0 ? day.minutes / baseMinutes : 1;
  const rows = plan.subjectMinutes.length
    ? plan.subjectMinutes
    : plan.subjects.map((name) => ({ name, minutesPerDay: 25, weeklySessions: 7, hard: false, focused: false }));

  return rows.map((item, index) =>
    makeTask(
      userId,
      date,
      index,
      `دراسة ${item.name}`,
      Math.max(12, Math.round(item.minutesPerDay * scale)),
      item.name,
      item.focused || index === 0 ? 'high' : item.hard ? 'high' : 'medium',
    ),
  );
}
