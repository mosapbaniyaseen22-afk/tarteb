import { NextResponse } from 'next/server';
import { remainingDays } from '@/lib/activation';
import { activateCodeForUser } from '@/lib/admin-server';
import { getRequestAuthUser } from '@/lib/auth-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getRequestAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.full_name || meta.name || user.email?.split('@')[0] || 'طالب');
  const result = await activateCodeForUser({
    code: String(body?.code ?? ''),
    userId: user.id,
    name,
    email: String(user.email || ''),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    subscription: {
      active: true,
      expiresAt: result.subscription.expiresAt,
      daysLeft: remainingDays(result.subscription.expiresAt),
      code: result.subscription.code,
      activatedAt: result.subscription.activatedAt,
    },
  });
}
