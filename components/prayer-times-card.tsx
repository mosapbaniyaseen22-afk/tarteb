'use client';

import { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  JORDAN_CITIES,
  formatPrayerClock,
  getNextPrayer,
  prayerLabel,
  type PrayerId,
  type PrayerTimes,
} from '@/lib/prayer-times';

const PRAYERS: PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function countdownLabel(minutesLeft: number) {
  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;
  if (hours <= 0) return `بعد ${minutes} د`;
  return `بعد ${hours} س و ${minutes} د`;
}

type PrayerTimesCardProps = {
  times: PrayerTimes | null;
  loading: boolean;
  error: string | null;
  cityName: string;
  onCityChange: (city: string) => void;
  showNext?: boolean;
};

export function PrayerTimesCard({ times, loading, error, cityName, onCityChange, showNext = true }: PrayerTimesCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const next = times ? getNextPrayer(times, now) : null;

  return (
    <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Moon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">مواقيت الصلاة</h2>
            <p className="text-xs text-muted-foreground">حسب وزارة الأوقاف الأردنية وتتحدّث يومياً</p>
          </div>
        </div>
        <Select value={cityName} onValueChange={onCityChange}>
          <SelectTrigger className="rounded-xl sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {JORDAN_CITIES.map((city) => (
              <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && !times ? (
        <div className="flex justify-center py-6">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error && !times ? (
        <p className="py-4 text-center text-sm text-destructive">{error}</p>
      ) : times ? (
        <>
          {showNext && next && (
            <div className="mb-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">الصلاة القادمة: {prayerLabel(next.id)}</span>
              <span className="mr-2 text-muted-foreground">{formatPrayerClock(next.time)} • {countdownLabel(next.minutesLeft)}</span>
            </div>
          )}
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {PRAYERS.map((id) => {
              const active = Boolean(showNext && next?.id === id);
              return (
                <div
                  key={id}
                  className={`rounded-2xl px-1 py-2 text-center sm:px-2 sm:py-3 ${active ? 'gradient-primary text-white shadow-glow' : 'bg-accent/50'}`}
                >
                  <div className="text-[10px] opacity-80 sm:text-xs">{prayerLabel(id)}</div>
                  <div className="mt-1 text-[11px] font-bold sm:text-sm">{formatPrayerClock(times[id])}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </Card>
  );
}
