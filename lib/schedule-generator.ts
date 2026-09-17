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
const SUBJECT_SWITCH_BREAK = 15;
const STUDY_SESSION_MINUTES = 50;
const AFTER_SCHOOL_REST = 20;
const WIND_DOWN_MINUTES = 30;
const MERGE_WINDOW_MINUTES = 30;
const MIN_GAP_MINUTES = 20;
const MIN_FILL_MINUTES = 10;
const MIN_STUDY_CHUNK_MINUTES = 15;
const AFTERNOON_START = 13 * 60 + 30;

export type LifestyleKind = 'meal' | 'quran' | 'friends' | 'rest' | 'custom';

export type LifestyleActivity = {
  title: string;
  kind: LifestyleKind;
  durationMinutes: number;
  startTime: string | null;
  weekdays: number[];
};

const LIFESTYLE_STYLE: Record<LifestyleKind, { color: string; activity_type: string }> = {
  meal: { color: '#1E3A5F', activity_type: 'meal' },
  quran: { color: '#059669', activity_type: 'quran' },
  friends: { color: '#DB2777', activity_type: 'friends' },
  rest: { color: '#F59E0B', activity_type: 'break' },
  custom: { color: '#0EA5E9', activity_type: 'custom' },
};

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

function placeDuration(gaps: Gap[], duration: number, preferAfternoon: boolean, allowPartial: boolean, preferEarliest = false): { start: number; end: number } | null {
  if (duration <= 0 || gaps.length === 0) return null;

  const needed = allowPartial ? MIN_STUDY_CHUNK_MINUTES : duration;
  let index = -1;
  if (preferAfternoon) {
    index = gaps.findIndex((gap) => gap.start >= AFTERNOON_START && gapSize(gap) >= duration);
  }
  if (index < 0 && preferEarliest) {
    index = gaps.findIndex((gap) => gapSize(gap) >= needed);
  }
  if (index < 0) {
    index = gaps.findIndex((gap) => gapSize(gap) >= duration);
  }
  if (index < 0 && allowPartial) {
    index = gaps.findIndex((gap) => gapSize(gap) >= MIN_STUDY_CHUNK_MINUTES);
  }
  if (index < 0) return null;

  const size = Math.min(duration, gapSize(gaps[index]));
  if (size < MIN_STUDY_CHUNK_MINUTES) return null;

  const start = gaps[index].start;
  const end = start + size;
  shrinkGap(gaps, index, start, end);
  return { start, end };
}

function placeDurationInWindows(
  gaps: Gap[],
  duration: number,
  windows: Array<{ start: number; end: number }>,
  fallback: boolean,
): { start: number; end: number } | null {
  const minSize = Math.min(MIN_FILL_MINUTES, duration);
  const tryRange = (rangeStart: number | null, rangeEnd: number | null) => {
    for (let i = 0; i < gaps.length; i++) {
      const gap = gaps[i];
      const start = rangeStart == null ? gap.start : Math.max(gap.start, rangeStart);
      const endLimit = rangeEnd == null ? gap.end : Math.min(gap.end, rangeEnd);
      const available = endLimit - start;
      if (available < minSize) continue;
      const size = Math.min(duration, available);
      if (size < minSize) continue;
      const end = start + size;
      shrinkGap(gaps, i, start, end);
      return { start, end };
    }
    return null;
  };

  for (const window of windows) {
    const placed = tryRange(window.start, window.end);
    if (placed) return placed;
  }
  if (fallback) return tryRange(null, null);
  return null;
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

function lifestyleAppliesOnDate(item: LifestyleActivity, date: string): boolean {
  if (!item.weekdays.length) return true;
  return item.weekdays.includes(weekdayIndex(date));
}

function canPlaceBeforeSchool(kind: LifestyleKind): boolean {
  switch (kind) {
    case 'meal':
    case 'quran':
    case 'rest':
    case 'custom':
      return true;
    case 'friends':
      return false;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function preferredLifestyleWindows(
  item: LifestyleActivity,
  wake: number,
  sleep: number,
  schoolEnd: number | null,
  prayerTimes: PrayerTimes | null,
): Array<{ start: number; end: number }> {
  const afterSchool = schoolEnd ?? AFTERNOON_START;
  const maghrib = prayerTimes ? timeToMinutes(prayerTimes.maghrib) : 19 * 60;
  const title = item.title;

  switch (item.kind) {
    case 'meal':
      if (title.includes('فطور')) return [{ start: wake, end: schoolEnd ?? wake + 120 }];
      if (title.includes('غداء')) return [{ start: afterSchool, end: afterSchool + 150 }];
      if (title.includes('عشاء')) return [{ start: maghrib - 15, end: maghrib + 90 }];
      return [{ start: afterSchool, end: sleep - 60 }];
    case 'quran':
      return [
        { start: maghrib + 20, end: Math.min(sleep - 40, maghrib + 140) },
        { start: wake, end: schoolEnd ?? wake + 90 },
      ];
    case 'friends':
      return [{ start: Math.max(afterSchool, 16 * 60), end: Math.min(sleep - 90, 21 * 60) }];
    case 'rest':
      return [{ start: afterSchool, end: afterSchool + 90 }];
    case 'custom':
      return [{ start: afterSchool, end: sleep - 60 }];
    default: {
      const exhaustive: never = item.kind;
      return exhaustive;
    }
  }
}

function schoolStudyStart(blocks: Block[]): number | null {
  const school = blocks.find((block) => block.activity_type === 'school');
  if (!school) return null;
  const rest = blocks.find((block) => block.activity_type === 'break' && block.start === school.end);
  return rest ? rest.end : school.end;
}

function filterGapsAfter(gaps: Gap[], start: number | null): Gap[] {
  if (start == null) return gaps.map((gap) => ({ ...gap }));
  return gaps
    .map((gap) => ({ start: Math.max(gap.start, start), end: gap.end }))
    .filter((gap) => gap.end - gap.start >= MIN_GAP_MINUTES);
}

function lifestyleBlock(item: LifestyleActivity, start: number, end: number): Block {
  const style = LIFESTYLE_STYLE[item.kind];
  return {
    start,
    end,
    activity: item.title,
    activity_type: style.activity_type,
    color: style.color,
    subject_name: null,
    task_id: null,
  };
}

function placeLifestyleActivities(
  gaps: Gap[],
  items: LifestyleActivity[],
  wake: number,
  sleep: number,
  schoolEnd: number | null,
  prayerTimes: PrayerTimes | null,
): Block[] {
  const blocks: Block[] = [];
  const ordered = [...items].sort((a, b) => {
    const rank = (kind: LifestyleKind) => {
      switch (kind) {
        case 'meal':
          return 0;
        case 'quran':
          return 1;
        case 'rest':
          return 2;
        case 'friends':
          return 3;
        case 'custom':
          return 4;
        default: {
          const exhaustive: never = kind;
          return exhaustive;
        }
      }
    };
    return rank(a.kind) - rank(b.kind);
  });

  for (const item of ordered) {
    const duration = Math.max(MIN_FILL_MINUTES, item.durationMinutes);
    const windows = preferredLifestyleWindows(item, wake, sleep, schoolEnd, prayerTimes);
    const fallback = canPlaceBeforeSchool(item.kind);
    const placed = placeDurationInWindows(gaps, duration, windows, fallback);
    if (!placed) continue;
    if (!canPlaceBeforeSchool(item.kind) && schoolEnd != null && placed.start < schoolEnd) continue;
    blocks.push(lifestyleBlock(item, placed.start, placed.end));
  }
  return blocks;
}

function stitchDetailedBreaks(blocks: Block[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const stitched: Block[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = stitched[stitched.length - 1];
    if (prev && current.start < prev.end) {
      if (current.end <= prev.end) continue;
      stitched.push({ ...current, start: prev.end });
    } else {
      stitched.push(current);
    }

    const placed = stitched[stitched.length - 1];
    const next = sorted[i + 1];
    if (!placed || !next) continue;
    const hole = next.start - placed.end;
    if (hole < 5) continue;

    const prevStudy = placed.activity_type === 'study';
    const nextStudy = next.activity_type === 'study';
    const switchSubject = Boolean(
      prevStudy && nextStudy && placed.subject_name && next.subject_name && placed.subject_name !== next.subject_name,
    );

    let activity = 'وقت حر';
    if (switchSubject) activity = 'استراحة وتبديل مادة';
    else if (next.activity_type === 'school') activity = 'تجهيز للمدرسة';
    else if (placed.activity_type === 'wake' && next.activity_type !== 'study') activity = 'تجهيز للصباح';
    else if (prevStudy && nextStudy) activity = hole <= 15 ? 'استراحة قصيرة' : 'استراحة بين الجلسات';
    else if (prevStudy || nextStudy) activity = hole <= 20 ? 'استراحة قصيرة' : 'فاصل وراحة';
    else if (hole <= 10) activity = 'فاصل قصير';
    else if (hole <= 20) activity = 'فاصل';

    stitched.push({
      start: placed.end,
      end: next.start,
      activity,
      activity_type: 'break',
      color: '#F59E0B',
      subject_name: null,
      task_id: null,
    });
  }

  return stitched;
}

function fixedBlocks(
  wakeTime: string,
  sleepTime: string,
  prayerTimes: PrayerTimes | null,
  routines: Routine[],
  date: string,
  extra: Block[] = [],
  skipAutoMeals = false,
): Block[] {
  const wake = timeToMinutes(wakeTime);
  const sleep = timeToMinutes(sleepTime);
  const blocks: Block[] = [...extra];

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
    if (!skipAutoMeals) {
      blocks.push({ start: dhuhr + 15, end: dhuhr + 60, activity: 'غداء + راحة', activity_type: 'meal', color: '#1E3A5F', subject_name: null, task_id: null });
    }

    const asr = timeToMinutes(prayerTimes.asr);
    blocks.push({ start: asr, end: asr + 15, activity: 'صلاة العصر', activity_type: 'prayer', color: '#059669', subject_name: null, task_id: null });

    const maghrib = timeToMinutes(prayerTimes.maghrib);
    if (skipAutoMeals) {
      blocks.push({ start: maghrib, end: maghrib + 15, activity: 'صلاة المغرب', activity_type: 'prayer', color: '#059669', subject_name: null, task_id: null });
    } else {
      blocks.push({ start: maghrib, end: maghrib + 45, activity: 'عشاء + صلاة المغرب', activity_type: 'meal', color: '#059669', subject_name: null, task_id: null });
    }

    const isha = timeToMinutes(prayerTimes.isha);
    const maghribEnd = skipAutoMeals ? maghrib + 15 : maghrib + 45;
    if (isha > maghribEnd) {
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

    const lastStudy = [...blocks].reverse().find((block) => block.activity_type === 'study');
    if (
      breakEnabled
      && lastStudy
      && lastStudy.subject_name
      && task.subject_name
      && lastStudy.subject_name !== task.subject_name
    ) {
      const follow = gaps.findIndex(
        (gap) => gap.start === lastStudy.end && gapSize(gap) >= SUBJECT_SWITCH_BREAK + MIN_STUDY_CHUNK_MINUTES,
      );
      if (follow >= 0) {
        const breakEnd = lastStudy.end + SUBJECT_SWITCH_BREAK;
        blocks.push({
          start: lastStudy.end,
          end: breakEnd,
          activity: 'استراحة وتبديل مادة',
          activity_type: 'break',
          color: '#F59E0B',
          subject_name: null,
          task_id: null,
        });
        shrinkGap(gaps, follow, lastStudy.end, breakEnd);
      }
    }

    while (remaining >= MIN_STUDY_CHUNK_MINUTES) {
      const chunk = Math.min(remaining, STUDY_SESSION_MINUTES);
      const placed = placeDuration(gaps, chunk, false, true, true);
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
            activity: 'استراحة بين الجلسات',
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
  lifestyle?: LifestyleActivity[];
}): GeneratedEntry[] {
  const { date, wakeTime, sleepTime, prayerTimes, routines, tasks, breakEnabled, subjectColors = {}, lifestyle = [] } = params;
  const dayLifestyle = lifestyle.filter((item) => lifestyleAppliesOnDate(item, date));
  const skipAutoMeals = dayLifestyle.some((item) => item.kind === 'meal');
  const timedLifestyle = dayLifestyle.filter((item) => item.startTime);
  const flexibleLifestyle = dayLifestyle.filter((item) => !item.startTime);
  const extra = timedLifestyle.map((item) => {
    const start = timeToMinutes(item.startTime as string);
    const end = start + Math.max(MIN_FILL_MINUTES, item.durationMinutes);
    return lifestyleBlock(item, start, end);
  });

  const fixed = fixedBlocks(wakeTime, sleepTime, prayerTimes, routines, date, extra, skipAutoMeals);
  const schoolEnd = schoolStudyStart(fixed);
  const wake = timeToMinutes(wakeTime);
  const sleep = timeToMinutes(sleepTime);

  const lifestyleGaps = findGaps(fixed);
  const lifestyleBlocks = placeLifestyleActivities(
    lifestyleGaps,
    flexibleLifestyle,
    wake,
    sleep,
    schoolEnd,
    prayerTimes,
  );

  const withLifestyle = [...fixed, ...lifestyleBlocks].sort((a, b) => a.start - b.start);
  const remainingGaps = findGaps(withLifestyle);

  const studyTasks = tasks.filter((task) => normalizeTaskKind(task.kind, task.title, task.subject_name) === 'study');
  const otherTasks = tasks.filter((task) => normalizeTaskKind(task.kind, task.title, task.subject_name) !== 'study');

  const otherBlocks = fillGapsWithTasks(remainingGaps, otherTasks, breakEnabled, subjectColors);
  const afterOthers = [...withLifestyle, ...otherBlocks].sort((a, b) => a.start - b.start);
  const studyGaps = filterGapsAfter(findGaps(afterOthers), schoolEnd);
  const studyBlocks = fillGapsWithTasks(studyGaps, studyTasks, breakEnabled, subjectColors);

  const all = stitchDetailedBreaks([...afterOthers, ...studyBlocks]);

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
