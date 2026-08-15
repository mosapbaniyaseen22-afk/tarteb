import { NextResponse } from 'next/server';
import { deleteActivationCode, getAdminSession, revokeActivationCode } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (body?.action !== 'revoke') {
    return NextResponse.json({ error: 'عملية غير صالحة' }, { status: 400 });
  }

  const item = await revokeActivationCode(context.params.id);
  if (!item) {
    return NextResponse.json({ error: 'الكود غير موجود' }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const result = await deleteActivationCode(context.params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
