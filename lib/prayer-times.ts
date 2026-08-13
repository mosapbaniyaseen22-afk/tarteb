export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerTimes = {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  sunrise: string;
  cityName: string;
  date: string;
  source: string;
};

export type JordanCity = {
  name: string;
  english: string;
  latitude: number;
  longitude: number;
};

export const JORDAN_CITIES: JordanCity[] = [
  { name: 'عمان', english: 'Amman', latitude: 31.9454, longitude: 35.9284 },
  { name: 'إربد', english: 'Irbid', latitude: 32.5556, longitude: 35.85 },
  { name: 'الزرقاء', english: 'Zarqa', latitude: 32.0728, longitude: 36.088 },
  { name: 'البلقاء', english: 'Salt', latitude: 32.0392, longitude: 35.7272 },
  { name: 'المفرق', english: 'Mafraq', latitude: 32.3429, longitude: 36.208 },
  { name: 'جرش', english: 'Jerash', latitude: 32.2808, longitude: 35.8993 },
  { name: 'عجلون', english: 'Ajloun', latitude: 32.3326, longitude: 35.7517 },
  { name: 'مأدبا', english: 'Madaba', latitude: 31.716, longitude: 35.7939 },
  { name: 'الكرك', english: 'Karak', latitude: 31.1853, longitude: 35.7048 },
  { name: 'الطفيلة', english: 'Tafilah', latitude: 30.8375, longitude: 35.6044 },
  { name: 'معان', english: 'Maan', latitude: 30.1962, longitude: 35.7341 },
  { name: 'العقبة', english: 'Aqaba', latitude: 29.5267, longitude: 35.0078 },
];

const DEFAULT_CITY = JORDAN_CITIES[0];
const JORDAN_METHOD = 23;
const JORDAN_SCHOOL = 0;

export function cityForRegion(region?: string | null): JordanCity {
  if (!region) return DEFAULT_CITY;
  return JORDAN_CITIES.find((city) => city.name === region) ?? DEFAULT_CITY;
}

export function prayerLabel(id: PrayerId): string {
  switch (id) {
    case 'fajr':
      return 'الفجر';
    case 'dhuhr':
      return 'الظهر';
    case 'asr':
      return 'العصر';
    case 'maghrib':
      return 'المغرب';
    case 'isha':
      return 'العشاء';
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

export function parseApiTime(value: string): string {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '00:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = parseApiTime(value).split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatPrayerClock(value: string): string {
  const [hoursRaw, minutes] = parseApiTime(value).split(':');
  const hours = Number(hoursRaw);
  const period = hours >= 12 ? 'م' : 'ص';
  const display = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${display}:${minutes} ${period}`;
}

export function getNextPrayer(times: PrayerTimes, now = new Date()): { id: PrayerId; time: string; minutesLeft: number } {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const order: PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const id of order) {
    const prayerMinutes = timeToMinutes(times[id]);
    if (prayerMinutes > currentMinutes) {
      return { id, time: times[id], minutesLeft: prayerMinutes - currentMinutes };
    }
  }

  const tomorrowFajr = timeToMinutes(times.fajr) + 24 * 60;
  return { id: 'fajr', time: times.fajr, minutesLeft: tomorrowFajr - currentMinutes };
}

export function jordanDateISO(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman' }).format(date);
}

export function dateKeyFromISO(dateISO: string) {
  const [year, month, day] = dateISO.split('-');
  return `${day}-${month}-${year}`;
}

export async function fetchJordanPrayerTimes(city: JordanCity, dateISO = jordanDateISO()): Promise<PrayerTimes> {
  const dateKey = dateKeyFromISO(dateISO);
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'LabibTawjihi/1.0',
  };

  const byCoords = new URL(`https://api.aladhan.com/v1/timings/${dateKey}`);
  byCoords.searchParams.set('latitude', String(city.latitude));
  byCoords.searchParams.set('longitude', String(city.longitude));
  byCoords.searchParams.set('method', String(JORDAN_METHOD));
  byCoords.searchParams.set('school', String(JORDAN_SCHOOL));
  byCoords.searchParams.set('timezonestring', 'Asia/Amman');

  let response = await fetch(byCoords.toString(), { cache: 'no-store', headers });
  if (!response.ok) {
    const byCity = new URL('https://api.aladhan.com/v1/timingsByCity');
    byCity.searchParams.set('city', city.english);
    byCity.searchParams.set('country', 'Jordan');
    byCity.searchParams.set('method', String(JORDAN_METHOD));
    byCity.searchParams.set('school', String(JORDAN_SCHOOL));
    byCity.searchParams.set('date', dateKey);
    response = await fetch(byCity.toString(), { cache: 'no-store', headers });
  }

  if (!response.ok) {
    throw new Error('تعذر جلب مواقيت الصلاة');
  }

  const payload = (await response.json()) as {
    data?: {
      timings?: Record<string, string>;
      date?: { gregorian?: { date?: string } };
      meta?: { method?: { name?: string } };
    };
  };

  const timings = payload.data?.timings;
  if (!timings?.Fajr || !timings.Dhuhr || !timings.Asr || !timings.Maghrib || !timings.Isha) {
    throw new Error('مواقيت الصلاة غير مكتملة');
  }

  return {
    fajr: parseApiTime(timings.Fajr),
    dhuhr: parseApiTime(timings.Dhuhr),
    asr: parseApiTime(timings.Asr),
    maghrib: parseApiTime(timings.Maghrib),
    isha: parseApiTime(timings.Isha),
    sunrise: parseApiTime(timings.Sunrise || timings.Fajr),
    cityName: city.name,
    date: payload.data?.date?.gregorian?.date || dateKey,
    source: payload.data?.meta?.method?.name || 'وزارة الأوقاف الأردنية',
  };
}
