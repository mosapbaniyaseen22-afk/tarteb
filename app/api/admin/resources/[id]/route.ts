import { NextResponse } from 'next/server';
import { deleteUpload, getAdminSession, readResources, writeResources } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const items = await readResources();
  const next = items.filter((item) => item.id !== params.id);
  if (next.length === items.length) {
    return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });
  }

  await deleteUpload(params.id);
  await writeResources(next);
  return NextResponse.json({ ok: true });
}
