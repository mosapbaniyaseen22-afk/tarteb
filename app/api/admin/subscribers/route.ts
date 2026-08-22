import { NextResponse } from 'next/server';
import { getSubscriberPresence } from '@/lib/admin';
import { listCloudUsers, mergeAppUsers } from '@/lib/admin-cloud';
import { getAdminSession, readSubscribers, readUserSubscriptions } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const [cloud, files, subscriptions] = await Promise.all([
    listCloudUsers(),
    readSubscribers(),
    readUserSubscriptions(),
  ]);
  const subscribers = mergeAppUsers(cloud, files, subscriptions);
  const onlineCount = subscribers.filter((row) => getSubscriberPresence(row) === 'online').length;
  const loggedOutCount = subscribers.filter((row) => getSubscriberPresence(row) === 'logged_out').length;
  const subscribedCount = subscribers.filter((row) => row.subscribed).length;

  return NextResponse.json({
    count: subscribers.length,
    onlineCount,
    loggedOutCount,
    subscribedCount,
    subscribers,
  });
}
