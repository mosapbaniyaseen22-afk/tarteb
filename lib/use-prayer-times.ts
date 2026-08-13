'use client';

import { useEffect, useState } from 'react';
import {
  JORDAN_CITIES,
  cityForRegion,
  fetchJordanPrayerTimes,
  type PrayerTimes,
} from './prayer-times';

const CACHE_PREFIX = 'labib-prayer-times';

function cacheKey(cityName: string, dateISO: string) {
  return `${CACHE_PREFIX}:${cityName}:${dateISO}`;
}

function readCache(cityName: string, dateISO: string): PrayerTimes | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(cityName, dateISO));
    return raw ? (JSON.parse(raw) as PrayerTimes) : null;
  } catch {
    return null;
  }
}

function writeCache(times: PrayerTimes, dateISO: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(cacheKey(times.cityName, dateISO), JSON.stringify(times));
}

async function loadTimes(cityName: string, dateISO: string): Promise<PrayerTimes> {
  const params = new URLSearchParams({ region: cityName, date: dateISO });

  try {
    const response = await fetch(`/api/prayer-times?${params.toString()}`, { cache: 'no-store' });
    if (response.ok) {
      const times = (await response.json()) as PrayerTimes;
      writeCache(times, dateISO);
      return times;
    }
  } catch {
    // Fall through to Aladhan.
  }

  const city = JORDAN_CITIES.find((item) => item.name === cityName) ?? cityForRegion(cityName);
  const times = await fetchJordanPrayerTimes(city, dateISO);
  writeCache(times, dateISO);
  return times;
}

export function usePrayerTimes(region?: string | null, dateISO?: string) {
  const initialCity = cityForRegion(region).name;
  const [cityName, setCityName] = useState(initialCity);
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (region) setCityName(cityForRegion(region).name);
  }, [region]);

  useEffect(() => {
    if (!dateISO) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      const cached = readCache(cityName, dateISO);
      if (cached) setTimes(cached);

      try {
        const next = await loadTimes(cityName, dateISO);
        if (!cancelled) setTimes(next);
      } catch {
        if (!cancelled && !cached) setError('تعذر تحديث مواقيت الصلاة');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [cityName, dateISO]);

  return { times, loading, error, cityName, setCityName };
}
