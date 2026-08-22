import { NextResponse } from 'next/server';
import { getSurah } from '@/lib/wird-surahs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: { number: string } };

type CloudAyah = {
  numberInSurah: number;
  text: string;
  audio?: string;
};

type CloudSurah = {
  name: string;
  ayahs: CloudAyah[];
};

const cache = new Map<string, { expires: number; data: unknown }>();

export async function GET(_request: Request, context: RouteContext) {
  const number = Number(context.params.number);
  if (!Number.isInteger(number) || number < 1 || number > 114) {
    return NextResponse.json({ error: 'سورة غير صالحة' }, { status: 400 });
  }

  const cacheKey = `surah-${number}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(`https://api.alquran.cloud/v1/surah/${number}/ar.alafasy`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error('quran api failed');
    const payload = (await response.json()) as { data?: CloudSurah };
    const surah = payload.data;
    if (!surah?.ayahs?.length) throw new Error('empty surah');

    const meta = getSurah(number);
    const data = {
      number,
      name: meta?.name ?? surah.name,
      ayahs: surah.ayahs.map((ayah) => ({
        number: ayah.numberInSurah,
        text: ayah.text,
        audio: ayah.audio ? ayah.audio.replace(/^http:\/\//, 'https://') : null,
      })),
    };
    cache.set(cacheKey, { expires: Date.now() + 12 * 60 * 60 * 1000, data });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'تعذر تحميل آيات السورة' }, { status: 502 });
  }
}
