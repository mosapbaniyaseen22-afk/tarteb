import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { markCloudLoggedOut } from '@/lib/admin-cloud';
import { markSubscriberLoggedOut } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  const user = data.user;
  if (error || !user) {
    return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
  }

  const subscriber = await markSubscriberLoggedOut(user.id);
  try {
    await markCloudLoggedOut(token, user.id);
  } catch (error) {
    console.error(error);
  }
  return NextResponse.json({ ok: true, subscriber });
}
