export const QURAN_PAGES = 604;
export const QURAN_JUZ = 30;
export const QURAN_AYAHS = 6236;

export type KhatmaPresetId = 7 | 10 | 15 | 30 | 40 | 60 | 90;

export const KHATMA_PRESETS: { days: KhatmaPresetId; label: string; hint: string }[] = [
  { days: 7, label: '7 أيام', hint: 'ورد مكثّف' },
  { days: 10, label: '10 أيام', hint: 'ثلاثة أجزاء يومياً' },
  { days: 15, label: '15 يوم', hint: 'جزءان يومياً' },
  { days: 30, label: '30 يوم', hint: 'جزء كل يوم' },
  { days: 40, label: '40 يوم', hint: 'ورد هادئ' },
  { days: 60, label: '60 يوم', hint: 'نصف جزء يومياً' },
  { days: 90, label: '90 يوم', hint: 'ختمة طويلة' },
];

export type KhatmaPlan = {
  days: number;
  startDate: string;
  completedDates: string[];
};

const STORAGE_KEY = 'labib-khatma-plan';

export function khatmaDaily(days: number) {
  const safeDays = Math.max(1, Math.round(days));
  let pagesPerDay = Math.max(1, Math.round(QURAN_PAGES / safeDays));
  let lastDayPages = QURAN_PAGES - pagesPerDay * (safeDays - 1);
  if (lastDayPages <= 0) {
    pagesPerDay = Math.max(1, Math.floor(QURAN_PAGES / safeDays));
    lastDayPages = QURAN_PAGES - pagesPerDay * (safeDays - 1);
  }
  return {
    days: safeDays,
    pagesPerDay,
    lastDayPages,
    juzPerDay: Number((QURAN_JUZ / safeDays).toFixed(2)),
    ayahsPerDay: Math.ceil(QURAN_AYAHS / safeDays),
  };
}

export function khatmaPortion(days: number, dayIndex: number) {
  const { pagesPerDay, lastDayPages } = khatmaDaily(days);
  const clamped = Math.min(Math.max(dayIndex, 0), days - 1);
  const isLast = clamped === days - 1;
  const start = clamped * pagesPerDay + 1;
  const end = isLast ? QURAN_PAGES : Math.min(QURAN_PAGES, (clamped + 1) * pagesPerDay);
  return { start, end, pages: isLast ? lastDayPages : end - start + 1 };
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));
}

export function loadKhatmaPlan(): KhatmaPlan | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KhatmaPlan;
    if (!parsed.days || !parsed.startDate) return null;
    return {
      days: parsed.days,
      startDate: parsed.startDate,
      completedDates: Array.isArray(parsed.completedDates) ? parsed.completedDates : [],
    };
  } catch {
    return null;
  }
}

export function saveKhatmaPlan(plan: KhatmaPlan | null) {
  if (typeof window === 'undefined') return;
  if (!plan) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}
