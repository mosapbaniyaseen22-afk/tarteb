import { NextResponse } from 'next/server';
import { AUTH_COOKIE, adminCookieOptions, createAdminSession, verifyAdminLogin } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; username?: string; password?: string } | null;
  const username = (body?.email ?? body?.username ?? '').trim();
  const password = body?.password ?? '';

  if (!username || !password) {
    return NextResponse.json({ error: 'أدخل البريد الإلكتروني وكلمة السر' }, { status: 400 });
  }

  const adminUser = await verifyAdminLogin(username, password);
  if (!adminUser) {
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, username: adminUser });
  response.cookies.set(AUTH_COOKIE, createAdminSession(adminUser), adminCookieOptions());
  return response;
}
