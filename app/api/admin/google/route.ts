import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { AUTH_COOKIE, adminCookieOptions, createAdminSession } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readAccessToken(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  const body = (await request.json().catch(() => null)) as { accessToken?: string } | null;
  return body?.accessToken?.trim() ?? '';
}

export async function POST(request: Request) {
  const accessToken = await readAccessToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'تعذر التحقق من حساب جوجل' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user || !isAdminUser(data.user)) {
    return NextResponse.json({ error: 'هذا الحساب ليس حساب الأدمن' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, email: data.user.email });
  response.cookies.set(AUTH_COOKIE, createAdminSession('admin'), adminCookieOptions());
  return response;
}
