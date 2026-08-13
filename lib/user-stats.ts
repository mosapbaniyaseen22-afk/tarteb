import { jordanDateISO } from './prayer-times';
import type { QuizAttempt, StudySession, Task, UserSubject } from './supabase';
import { addDaysISO, getWeekDays } from './week';

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function taskDurationMinutes(task: Task) {
  if (task.status !== 'completed' || !task.start_time || !task.end_time) return 0;
  let mins = timeToMinutes(task.end_time) - timeToMinutes(task.start_time);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

export function completedTaskCount(tasks: Task[]) {
  return tasks.filter((task) => task.status === 'completed').length;
}

export function completedQuizCount(attempts: QuizAttempt[]) {
  return attempts.length;
}

export function activityDates(sessions: StudySession[], attempts: QuizAttempt[]) {
  const dates = new Set<string>();
  sessions.forEach((session) => {
    if (session.session_date) dates.add(session.session_date);
  });
  attempts.forEach((attempt) => {
    if (attempt.attempt_date) dates.add(attempt.attempt_date);
  });
  return dates;
}

export function studyStreakDays(dates: Set<string>, todayISO = jordanDateISO()) {
  let cursor = dates.has(todayISO) ? todayISO : addDaysISO(todayISO, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function totalStudyMinutes(tasks: Task[], sessions: StudySession[]) {
  const fromTasks = tasks.reduce((sum, task) => sum + taskDurationMinutes(task), 0);
  const fromSessions = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
  return fromTasks + fromSessions;
}

export function studyHoursValue(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

export function matchesQuizSubject(attempt: QuizAttempt, subject: UserSubject) {
  return attempt.subject_name === subject.subjects.name_ar;
}

export function subjectProgressPercent(subject: UserSubject, attempts: QuizAttempt[]) {
  const related = attempts.filter((attempt) => matchesQuizSubject(attempt, subject));
  if (related.length === 0) return 0;
  const total = related.reduce((sum, attempt) => sum + (attempt.total > 0 ? attempt.correct / attempt.total : 0), 0);
  return Math.round((total / related.length) * 100);
}

export function averageProgress(subjects: UserSubject[], attempts: QuizAttempt[]) {
  if (subjects.length === 0) return 0;
  const total = subjects.reduce((sum, subject) => sum + subjectProgressPercent(subject, attempts), 0);
  return Math.round(total / subjects.length);
}

function minutesOnDate(tasks: Task[], sessions: StudySession[], date: string) {
  const fromTasks = tasks
    .filter((task) => task.task_date === date)
    .reduce((sum, task) => sum + taskDurationMinutes(task), 0);
  const fromSessions = sessions
    .filter((session) => session.session_date === date)
    .reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
  return fromTasks + fromSessions;
}

export function weeklyPerformance(sessions: StudySession[], attempts: QuizAttempt[], todayISO = jordanDateISO()) {
  return getWeekDays(todayISO).map((day) => ({
    name: day.name,
    ساعات: studyHoursValue(minutesOnDate([], sessions, day.date)),
    اختبارات: attempts.filter((attempt) => attempt.attempt_date === day.date).length,
  }));
}

export function monthlyPerformance(tasks: Task[], sessions: StudySession[], now = new Date()) {
  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + offset, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const inMonth = (iso: string | null | undefined) => {
      if (!iso) return false;
      const [itemYear, itemMonth] = iso.split('-').map(Number);
      return itemYear === year && itemMonth === month;
    };

    const minutes =
      tasks.filter((task) => inMonth(task.task_date)).reduce((sum, task) => sum + taskDurationMinutes(task), 0) +
      sessions.filter((session) => inMonth(session.session_date)).reduce((sum, session) => sum + (session.duration_minutes || 0), 0);

    return {
      name: date.toLocaleDateString('ar-JO', { month: 'long' }),
      ساعات: studyHoursValue(minutes),
    };
  });
}

export function subjectChartData(subjects: UserSubject[], attempts: QuizAttempt[]) {
  return subjects.map((subject) => ({
    name: subject.subjects.name_ar,
    value: subjectProgressPercent(subject, attempts),
    color: subject.subjects.color,
  }));
}
