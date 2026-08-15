import { NextResponse } from 'next/server';
import { isSubscriptionActive, remainingDays } from '@/lib/activation';
import { getUserSubscription } from '@/lib/admin-server';
import { getRequestAuthUser } from '@/lib/auth-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getRequestAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const subscription = await getUserSubscription(user.id);
  const active = isSubscriptionActive(subscription);
  return NextResponse.json({
    active,
    expiresAt: subscription?.expiresAt ?? null,
    daysLeft: remainingDays(subscription?.expiresAt ?? null),
    code: subscription?.code ?? null,
    activatedAt: subscription?.activatedAt ?? null,
  });
}
