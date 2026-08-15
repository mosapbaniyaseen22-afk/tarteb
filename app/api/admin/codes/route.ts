import { NextResponse } from 'next/server';
import { resolveCodeStatus } from '@/lib/activation';
import { generateActivationCodes, getAdminSession, readActivationCodes } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const items = await readActivationCodes();
  const now = Date.now();
  const withStatus = items.map((item) => ({
    ...item,
    status: resolveCodeStatus(item, now),
  }));

  return NextResponse.json({
    items: withStatus,
    stats: {
      total: withStatus.length,
      unused: withStatus.filter((row) => row.status === 'unused').length,
      active: withStatus.filter((row) => row.status === 'active').length,
      expired: withStatus.filter((row) => row.status === 'expired').length,
      revoked: withStatus.filter((row) => row.status === 'revoked').length,
    },
  });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { count?: number; note?: string } | null;
  const count = Number(body?.count ?? 1);
  if (!Number.isFinite(count) || count < 1) {
    return NextResponse.json({ error: 'أدخل عدد أكواد صالح' }, { status: 400 });
  }

  const created = await generateActivationCodes({ count, note: body?.note });
  return NextResponse.json({ items: created, count: created.length });
}
