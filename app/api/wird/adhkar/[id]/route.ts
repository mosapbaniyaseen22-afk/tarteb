import { NextResponse } from 'next/server';
import { parseHisnPayload } from '@/lib/wird';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

const cache = new Map<string, { expires: number; data: unknown }>();

export async function GET(_request: Request, context: RouteContext) {
  const id = Number(context.params.id);
  if (!Number.isInteger(id) || id < 1 || id > 200) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 });
  }

  const cacheKey = `adhkar-${id}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const urls = [
      `https://www.hisnmuslim.com/api/ar/${id}.json`,
      `http://www.hisnmuslim.com/api/ar/${id}.json`,
    ];
    let lastError: unknown = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('hisn api failed');
        const raw = await response.text();
        const payload = JSON.parse(raw.replace(/^\uFEFF/, '')) as unknown;
        const items = parseHisnPayload(payload);
        const data = { id, items };
        cache.set(cacheKey, { expires: Date.now() + 12 * 60 * 60 * 1000, data });
        return NextResponse.json(data);
      } catch (error) {
        lastError = error;
      }
    }
    console.error(lastError);
    return NextResponse.json({ error: 'تعذر تحميل الأذكار' }, { status: 502 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'تعذر تحميل الأذكار' }, { status: 502 });
  }
}
