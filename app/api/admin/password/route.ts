import { NextResponse } from 'next/server';
import { changeAdminPassword, getAdminSession } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: string;
    nextPassword?: string;
  } | null;

  const currentPassword = body?.currentPassword ?? '';
  const nextPassword = body?.nextPassword ?? '';

  if (!currentPassword || !nextPassword) {
    return NextResponse.json({ error: 'أدخل كلمة السر الحالية والجديدة' }, { status: 400 });
  }

  const result = await changeAdminPassword(currentPassword, nextPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
