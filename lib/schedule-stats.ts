import { timeToMinutes } from './prayer-times';
import type { ScheduleEntry } from './supabase';

const FIXED_TYPES = new Set(['wake', 'sleep', 'prayer', 'meal']);
const PIE_COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#0EA5E9'];

function durationMinutes(entry: ScheduleEntry) {
  const minutes = timeToMinutes(entry.end_time) - timeToMinutes(entry.start_time);
  return minutes > 0 ? minutes : 0;
}

export function dailyStudyMinutes(entries: ScheduleEntry[]) {
  return entries
    .filter((entry) => entry.activity_type === 'study')
    .reduce((sum, entry) => sum + durationMinutes(entry), 0);
}

export type TaskCompletionStats = { completed: number; total: number; percent: number };

export function taskCompletionStats(entries: ScheduleEntry[]): TaskCompletionStats {
  const linked = entries.filter((entry) => entry.task_id);
  const trackable = linked.length > 0 ? linked : entries.filter((entry) => !FIXED_TYPES.has(entry.activity_type) && entry.activity_type !== 'break');

  const total = trackable.length;
  const completed = trackable.filter((entry) => entry.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

export type SubjectSlice = { name: string; value: number; percent: number; color: string };

export function subjectTimeDistribution(entries: ScheduleEntry[]): SubjectSlice[] {
  const studyEntries = entries.filter((entry) => entry.activity_type === 'study' && entry.subject_name);
  const totals = new Map<string, { minutes: number; color: string }>();

  studyEntries.forEach((entry, index) => {
    const name = entry.subject_name as string;
    const current = totals.get(name);
    const minutes = durationMinutes(entry);
    if (current) {
      current.minutes += minutes;
    } else {
      totals.set(name, { minutes, color: entry.color || PIE_COLORS[index % PIE_COLORS.length] });
    }
  });

  const totalMinutes = Array.from(totals.values()).reduce((sum, item) => sum + item.minutes, 0);

  return Array.from(totals.entries()).map(([name, { minutes, color }]) => ({
    name,
    value: minutes,
    percent: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    color,
  }));
}

export function labibScheduleTip(percent: number, studyMinutes: number): string {
  if (studyMinutes === 0) {
    return 'لا يوجد جدول بعد اليوم — نظّمي وقتك من الأعلى لتبدأ رحلة مذاكرتك.';
  }
  if (percent >= 80) {
    return 'جدولك اليوم متوازن، أحسنت ترتيب وقتك! تذكري أن تأخذي فترات راحة قصيرة.';
  }
  if (percent >= 50) {
    return 'تقدّم جيد، حاولي إنهاء باقي المهام قبل النوم حتى تبدأي يوم جديد بارتياح.';
  }
  return 'ما زال أمامك مهام كثيرة، ابدئي بالأولوية العالية أولاً ولا تؤجلي.';
}
