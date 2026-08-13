import { NextResponse } from 'next/server';
import { isSubscriberOnline } from '@/lib/admin';
import { getAdminSession, readSubscribers } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const subscribers = await readSubscribers();
  const onlineCount = subscribers.filter((row) => isSubscriberOnline(row.lastSeenAt)).length;

  return NextResponse.json({
    count: subscribers.length,
    onlineCount,
    subscribers,
  });
}
