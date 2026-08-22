import { NextResponse } from 'next/server';
import { deleteResource, getAdminSession } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  await deleteResource(params.id);
  return NextResponse.json({ ok: true });
}
