import { timeToMinutes } from './prayer-times';
import type { PrayerTimes } from './prayer-times';
import { weekdayIndex } from './week';
import { normalizeTaskKind, routineNeedsDays, type Routine, type RoutineIcon, type Task, type TaskKind } from './supabase';

export type GeneratedEntry = {
  schedule_date: string;
  start_time: string;
  end_time: string;
  activity: string;
  activity_type: string;
  subject_name: string | null;
  color: string;
  task_id: string | null;
  completed: boolean;
};

export const ROUTINE_COLORS: Record<RoutineIcon, string> = {
  sleep: '#0F172A',
  school: '#2563EB',
  center: '#8B5CF6',
  sport: '#F59E0B',
  custom: '#0EA5E9',
};

const PRIORITY_ORDER: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };
const BREAK_MINUTES = 10;
const STUDY_SESSION_MINUTES = 50;
const AFTER_SCHOOL_REST = 20;
const WIND_DOWN_MINUTES = 30;
const MERGE_WINDOW_MINUTES = 30;
const MIN_GAP_MINUTES = 20;
const MIN_STUDY_CHUNK_MINUTES = 15;
const AFTERNOON_START = 13 * 60 + 30;

const TASK_STYLE: Record<TaskKind, { color: string; activity_type: string; split: boolean; preferAfternoon: boolean }> = {
  study: { color: '#4C1D95', activity_type: 'study', split: true, preferAfternoon: false },
  sport: { color: '#B45309', activity_type: 'sport', split: false, preferAfternoon: true },
  quran: { color: '#059669', activity_type: 'quran', split: false, preferAfternoon: false },
  custom: { color: '#0EA5E9', activity_type: 'custom', split: false, preferAfternoon: false },
};

type Gap = { start: number; end: number };

function gapSize(gap: Gap) {
  return gap.end - gap.start;
}

function shrinkGap(gaps: Gap[], index: number, placedStart: number, placedEnd: number) {
  const gap = gaps[index];
  const replacements: Gap[] = [];
  if (placedStart - gap.start >= MIN_GAP_MINUTES) replacements.push({ start: gap.start, end: placedStart });
  if (gap.end - placedEnd >= MIN_GAP_MINUTES) replacements.push({ start: placedEnd, end: gap.end });
  gaps.splice(index, 1, ...replacements);
}

function placeDuration(gaps: Gap[], duration: number, preferAfternoon: boolean, allowPartial: boolean): { start: number; end: number } | null {
  if (duration <= 0 || gaps.length === 0) return null;

  let index = -1;
  if (preferAfternoon) {
    index = gaps.findIndex((gap) => gap.start >= AFTERNOON_START && gapSize(gap) >= duration);
  }
  if (index < 0) {
    index = gaps.findIndex((gap) => gapSize(gap) >= duration);
  }
  if (index < 0 && allowPartial) {
    index = gaps.reduce((best, gap, i) => (gapSize(gap) > gapSize(gaps[best]) ? i : best), 0);
  }
  if (index < 0) return null;

  const size = Math.min(duration, gapSize(gaps[index]));
  if (size < MIN_STUDY_CHUNK_MINUTES) return null;

  const start = gaps[index].start;
  const end = start + size;
  shrinkGap(gaps, index, start, end);
  return { start, end };
}

export function minutesToTime(mins: number) {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

type Block = {
  start: number;
  end: number;
  activity: string;
  activity_type: string;
  color: string;
  subject_name: string | null;
  task_id: string | null;
};

function routineAppliesOnDate(routine: Routine, date: string): boolean {
  if (routine.weekdays && routine.weekdays.length > 0) {
    return routine.weekdays.includes(weekdayIndex(date));
  }
  if (!routineNeedsDays(routine.icon)) return true;
  return true;
}

function fixedBlocks(
  wakeTime: string,
  sleepTime: string,
  prayerTimes: PrayerTimes | null,
  routines: Routine[],
  date: string,
): Block[] {
  const wake = timeToMinutes(wakeTime);
  const sleep = timeToMinutes(sleepTime);
  const blocks: Block[] = [];

  let wakeActivity = 'الاستيقاظ';
  let wakeEnd = wake + 15;
  if (prayerTimes) {
    const fajr = timeToMinutes(prayerTimes.fajr);
    if (Math.abs(fajr - wake) <= MERGE_WINDOW_MINUTES) {
      wakeActivity = 'استيقاظ وصلاة الفجر';
      wakeEnd = Math.max(wake + 15, fajr + 20);
    }
  }
  blocks.push({ start: wake, end: wakeEnd, activity: wakeActivity, activity_type: 'wake', color: '#0F766E', subject_name: null, task_id: null });

  const sleepRoutine = routines.find((routine) => routine.icon === 'sleep');

  for (const routine of routines) {
    if (routine.icon === 'sleep') continue;
    if (!routineAppliesOnDate(routine, date)) continue;
    const start = timeToMinutes(routine.start_time);
    const end = timeToMinutes(routine.end_time);
    blocks.push({
      start,
      end,
      activity: routine.title,
      activity_type: routine.icon,
      color: ROUTINE_COLORS[routine.icon] ?? ROUTINE_COLORS.custom,
      subject_name: null,
      task_id: null,
    });
    if (routine.icon === 'school' && end + AFTER_SCHOOL_REST < sleep) {
      blocks.push({
        start: end,
        end: end + AFTER_SCHOOL_REST,
        activity: 'راحة واستعادة طاقة',
        activity_type: 'break',
        color: '#F59E0B',
        subject_name: null,
        task_id: null,
      });
    }
  }

  if (prayerTimes) {
    const dhuhr = timeToMinutes(prayerTimes.dhuhr);
    blocks.push({ start: dhuhr, end: dhuhr + 15, activity: 'صلاة الظهر', activity_type: 'prayer', color: '#059669', subject_name: null, task_id: null });
    blocks.push({ start: dhuhr + 15, end: dhuhr + 60, activity: 'غداء + راحة', activity_type: 'meal', color: '#1E3A5F', subject_name: null, task_id: null });

    const asr = timeToMinutes(prayerTimes.asr);
    blocks.push({ start: asr, end: asr + 15, activity: 'صلاة العصر', activity_type: 'prayer', color: '#059669', subject_name: null, task_id: null });

    const maghrib = timeToMinutes(prayerTimes.maghrib);
    blocks.push({ start: maghrib, end: maghrib + 45, activity: 'عشاء + صلاة المغرب', activity_type: 'meal', color: '#059669', subject_name: null, task_id: null });

    const isha = timeToMinutes(prayerTimes.isha);
    if (isha > maghrib + 45) {
      blocks.push({ start: isha, end: isha + 15, activity: 'صلاة العشاء', activity_type: 'prayer', color: '#059669', subject_name: null, task_id: null });
    }
  }

  const windDownStart = sleep - WIND_DOWN_MINUTES;
  if (windDownStart > wake + 60) {
    blocks.push({
      start: windDownStart,
      end: sleep,
      activity: 'تهدئة بدون شاشات',
      activity_type: 'break',
      color: '#64748B',
      subject_name: null,
      task_id: null,
    });
  }
  blocks.push({ start: sleep, end: sleep + 15, activity: sleepRoutine?.title || 'النوم', activity_type: 'sleep', color: '#1E293B', subject_name: null, task_id: null });

  blocks.sort((a, b) => a.start - b.start);

  const resolved: Block[] = [];
  for (const block of blocks) {
    const prev = resolved[resolved.length - 1];
    if (prev && block.start < prev.end) {
      if (block.end <= prev.end) continue;
      resolved.push({ ...block, start: prev.end });
    } else {
      resolved.push(block);
    }
  }
  return resolved;
}

function findGaps(blocks: Block[]): Array<{ start: number; end: number }> {
  const gaps: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < blocks.length - 1; i++) {
    const start = blocks[i].end;
    const end = blocks[i + 1].start;
    if (end - start >= MIN_GAP_MINUTES) gaps.push({ start, end });
  }
  return gaps;
}

function fillGapsWithTasks(
  gapsInput: Array<{ start: number; end: number }>,
  tasks: Task[],
  breakEnabled: boolean,
  subjectColors: Record<string, string>,
): Block[] {
  const gaps: Gap[] = gapsInput.map((gap) => ({ ...gap }));
  const ordered = [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const blocks: Block[] = [];

  const pushTaskBlock = (task: Task, start: number, end: number, kind: TaskKind) => {
    const style = TASK_STYLE[kind];
    blocks.push({
      start,
      end,
      activity: task.title,
      activity_type: style.activity_type,
      color: (kind === 'study' && task.subject_name && subjectColors[task.subject_name]) || style.color,
      subject_name: task.subject_name,
      task_id: task.id,
    });
  };

  for (const task of ordered) {
    const kind = normalizeTaskKind(task.kind, task.title, task.subject_name);
    const style = TASK_STYLE[kind];
    let remaining = Math.max(MIN_STUDY_CHUNK_MINUTES, task.duration_minutes ?? 60);

    if (!style.split) {
      const whole = placeDuration(gaps, remaining, style.preferAfternoon, false);
      if (whole) {
        pushTaskBlock(task, whole.start, whole.end, kind);
        continue;
      }
      while (remaining >= MIN_STUDY_CHUNK_MINUTES) {
        const placed = placeDuration(gaps, remaining, style.preferAfternoon, true);
        if (!placed) break;
        pushTaskBlock(task, placed.start, placed.end, kind);
        remaining -= placed.end - placed.start;
      }
      continue;
    }

    while (remaining >= MIN_STUDY_CHUNK_MINUTES) {
      const chunk = Math.min(remaining, STUDY_SESSION_MINUTES);
      const placed = placeDuration(gaps, chunk, false, true);
      if (!placed) break;
      pushTaskBlock(task, placed.start, placed.end, kind);
      remaining -= placed.end - placed.start;

      if (breakEnabled && remaining >= MIN_STUDY_CHUNK_MINUTES) {
        const follow = gaps.findIndex((gap) => gap.start === placed.end && gapSize(gap) >= BREAK_MINUTES + MIN_STUDY_CHUNK_MINUTES);
        if (follow >= 0) {
          const breakEnd = placed.end + BREAK_MINUTES;
          blocks.push({
            start: placed.end,
            end: breakEnd,
            activity: 'استراحة',
            activity_type: 'break',
            color: '#F59E0B',
            subject_name: null,
            task_id: null,
          });
          shrinkGap(gaps, follow, placed.end, breakEnd);
        }
      }
    }
  }

  return blocks;
}

export function buildDaySchedule(params: {
  date: string;
  wakeTime: string;
  sleepTime: string;
  prayerTimes: PrayerTimes | null;
  routines: Routine[];
  tasks: Task[];
  breakEnabled: boolean;
  subjectColors?: Record<string, string>;
}): GeneratedEntry[] {
  const { date, wakeTime, sleepTime, prayerTimes, routines, tasks, breakEnabled, subjectColors = {} } = params;

  const fixed = fixedBlocks(wakeTime, sleepTime, prayerTimes, routines, date);
  const gaps = findGaps(fixed);
  const studyBlocks = fillGapsWithTasks(gaps, tasks, breakEnabled, subjectColors);

  const all = [...fixed, ...studyBlocks].sort((a, b) => a.start - b.start);

  return all.map((block) => ({
    schedule_date: date,
    start_time: minutesToTime(block.start),
    end_time: minutesToTime(block.end),
    activity: block.activity,
    activity_type: block.activity_type,
    subject_name: block.subject_name,
    color: block.color,
    task_id: block.task_id,
    completed: false,
  }));
}
