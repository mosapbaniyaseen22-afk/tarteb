import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'الدخول أصبح بحساب جوجل الأدمن فقط' },
    { status: 403 },
  );
}
