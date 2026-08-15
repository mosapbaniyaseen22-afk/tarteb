import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin';
import { AUTH_COOKIE, adminCookieOptions, createAdminSession } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAccessToken(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

export async function POST(request: Request) {
  const accessToken = getAccessToken(request);
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
  if (error || !data.user || !isAdminEmail(data.user.email)) {
    return NextResponse.json({ error: 'هذا الحساب ليس حساب الأدمن' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, email: data.user.email });
  response.cookies.set(AUTH_COOKIE, createAdminSession('admin'), adminCookieOptions());
  return response;
}
