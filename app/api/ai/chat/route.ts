import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { startLabibStream, type ChatTurn } from '@/lib/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readScreen(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const row = value as { text?: unknown; image?: unknown };
  const text = typeof row.text === 'string' ? row.text.trim().slice(0, 4500) : '';
  const image = typeof row.image === 'string' && row.image.startsWith('data:image/') && row.image.length < 500_000
    ? row.image
    : null;
  if (!text && !image) return null;
  return { text, image };
}

function readPage(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const row = value as { path?: unknown; title?: unknown; hint?: unknown };
  const path = typeof row.path === 'string' ? row.path.trim().slice(0, 120) : '';
  const title = typeof row.title === 'string' ? row.title.trim().slice(0, 80) : '';
  const hint = typeof row.hint === 'string' ? row.hint.trim().slice(0, 160) : '';
  if (!path || !title) return null;
  return { path, title, hint };
}

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

  let body: { messages?: unknown; page?: unknown; screen?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const messages = readTurns(body.messages);
  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'اكتب سؤالاً أولاً' }, { status: 400 });
  }

  const page = readPage(body.page);
  const screen = readScreen(body.screen);
  const result = await startLabibStream(messages, page, screen);
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
