import { NextResponse } from 'next/server';
import { cityForRegion, fetchJordanPrayerTimes, jordanDateISO } from '@/lib/prayer-times';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cache = new Map<string, { expires: number; data: unknown }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const latRaw = searchParams.get('lat');
  const lngRaw = searchParams.get('lng');
  const latitude = latRaw ? Number(latRaw) : Number.NaN;
  const longitude = lngRaw ? Number(lngRaw) : Number.NaN;

  const baseCity = cityForRegion(region);
  const city =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { ...baseCity, latitude, longitude }
      : baseCity;

  const dateISO = searchParams.get('date') || jordanDateISO();
  const cacheKey = `${city.latitude.toFixed(3)},${city.longitude.toFixed(3)},${dateISO}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const times = await fetchJordanPrayerTimes(city, dateISO);
    cache.set(cacheKey, { expires: Date.now() + 30 * 60 * 1000, data: times });
    return NextResponse.json(times);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'تعذر جلب مواقيت الصلاة الآن' }, { status: 502 });
  }
}
