import { useEffect, useState } from 'react';
import { jordanDateISO } from './prayer-times';

export type WeekDay = {
  date: string;
  name: string;
  short: string;
  dayNumber: string;
};

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] as const;
const ARABIC_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'] as const;

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

