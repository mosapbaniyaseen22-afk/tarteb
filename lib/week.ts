import { useEffect, useState } from 'react';
import { jordanDateISO } from './prayer-times';

export type WeekDay = {
  date: string;
  name: string;
  short: string;
  dayNumber: string;
};

export const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;
export const ARABIC_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'] as const;

function parseISO(dateISO: string) {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysISO(dateISO: string, amount: number) {
  const date = parseISO(dateISO);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function weekdayIndex(dateISO: string) {
  return parseISO(dateISO).getUTCDay();
}

export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] as const;

export function upcomingWeekdayOnOrAfter(fromISO: string, weekday: number) {
  const current = weekdayIndex(fromISO);
  const delta = (weekday - current + 7) % 7;
  return addDaysISO(fromISO, delta);
}

export function formatWeekdayList(indexes: number[]) {
  const unique = [...new Set(indexes.filter((day) => day >= 0 && day <= 6))];
  if (unique.length === 0 || unique.length === 7) return 'كل الأيام';
  const saturdayFirst = [...unique].sort((a, b) => ((a + 1) % 7) - ((b + 1) % 7));
  return saturdayFirst.map((day) => ARABIC_SHORT[day]).join('، ');
}

export const SCHOOL_WEEKDAYS = [0, 1, 2, 3, 4];

export function saturdayOfWeek(dateISO: string) {
  const index = weekdayIndex(dateISO);
  const fromSaturday = (index + 1) % 7;
  return addDaysISO(dateISO, -fromSaturday);
}

export function getWeekDays(dateISO: string): WeekDay[] {
  const start = saturdayOfWeek(dateISO);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDaysISO(start, offset);
    const index = weekdayIndex(date);
    return {
      date,
      name: ARABIC_DAYS[index],
      short: ARABIC_SHORT[index],
      dayNumber: String(parseISO(date).getUTCDate()),
    };
  });
}

export function formatArabicDate(dateISO: string) {
  const date = parseISO(dateISO);
  return new Intl.DateTimeFormat('ar-JO', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
}

export function formatScheduleHeading(dateISO: string, dayName: string) {
  const date = parseISO(dateISO);
  const month = new Intl.DateTimeFormat('ar-JO', { month: 'short', timeZone: 'UTC' }).format(date);
  return `${dayName} ${date.getUTCDate()} ${month}`;
}

export function formatWeekRange(days: WeekDay[]) {
  if (days.length === 0) return '';
  return `${formatArabicDate(days[0].date)} — ${formatArabicDate(days[days.length - 1].date)}`;
}

export function useJordanToday() {
  const [today, setToday] = useState(jordanDateISO);

  useEffect(() => {
    const tick = () => {
      const next = jordanDateISO();
      setToday((current) => (current === next ? current : next));
    };

    tick();
    const interval = window.setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    window.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      window.removeEventListener('visibilitychange', tick);
    };
  }, []);

  return today;
}

