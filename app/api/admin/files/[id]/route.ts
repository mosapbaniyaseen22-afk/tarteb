import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { readResources, uploadPath } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const items = await readResources();
  const item = items.find((row) => row.id === params.id);
  if (!item?.fileName) {
    return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 });
  }

  try {
    const bytes = await readFile(uploadPath(params.id));
    const headers = new Headers();
    headers.set('Content-Type', item.fileMime || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(item.fileName)}`);
    headers.set('Cache-Control', 'private, max-age=3600');
    return new NextResponse(Uint8Array.from(bytes), { headers });
  } catch {
    return NextResponse.json({ error: 'تعذر قراءة الملف' }, { status: 404 });
  }
}
