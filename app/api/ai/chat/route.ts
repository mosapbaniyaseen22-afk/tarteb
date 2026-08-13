import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { startLabibStream, type ChatTurn } from '@/lib/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readTurns(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as { role?: unknown; content?: unknown };
    if ((row.role !== 'user' && row.role !== 'assistant') || typeof row.content !== 'string') return [];
    return [{ role: row.role, content: row.content }];
  });
}

export async function POST(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'سجّل الدخول لاستخدام لبيب AI' }, { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
  }

  let body: { messages?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const messages = readTurns(body.messages);
  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'اكتب سؤالاً أولاً' }, { status: 400 });
  }

  const result = await startLabibStream(messages);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
