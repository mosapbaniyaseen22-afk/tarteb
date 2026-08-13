import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { upsertSubscriber } from '@/lib/admin-server';

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

  let body: { name?: string; email?: string; avatarUrl?: string | null; stage?: string | null } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(
    body.name || meta.full_name || meta.name || user.email?.split('@')[0] || 'طالب',
  ).trim();

  const subscriber = await upsertSubscriber({
    id: user.id,
    name,
    email: String(body.email || user.email || '').trim(),
    avatarUrl: (body.avatarUrl || (meta.avatar_url as string | undefined) || (meta.picture as string | undefined) || null),
    stage: body.stage ?? null,
  });

  return NextResponse.json({ ok: true, subscriber });
}
