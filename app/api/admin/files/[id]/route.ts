import { NextResponse } from 'next/server';
import { cloudPublicFileUrl } from '@/lib/admin-cloud';
import { findResource } from '@/lib/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function originalFileName(fileName: string | null, title: string, mime: string | null) {
  const raw = (fileName || title || 'file').replace(/[/\\?%*:|"<>]/g, '_').trim() || 'file';
  if (/\.[a-z0-9]{2,8}$/i.test(raw)) return raw;
  if ((mime || '').includes('pdf') || raw.toLowerCase().includes('pdf')) return `${raw}.pdf`;
  return raw;
}

function isTrustedFileUrl(url: string) {
  try {
    const allowed = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!allowed) return false;
    return new URL(url).origin === new URL(allowed).origin;
  } catch {
    return false;
  }
}

function downloadRedirect(url: string, fileName: string) {
  const next = new URL(url);
  next.searchParams.set('download', fileName);
  return NextResponse.redirect(next.toString(), 302);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const item = await findResource(params.id);
  if (!item || (!item.filePath && !item.fileUrl)) {
    return NextResponse.json({ error: 'الملف الأصلي غير محفوظ. ارفع الـ PDF مرة ثانية.' }, { status: 404 });
  }

  const fileName = originalFileName(item.fileName, item.title, item.fileMime);
  const publicUrl = item.fileUrl || (item.filePath ? cloudPublicFileUrl(item.filePath) : null);
  if (publicUrl && isTrustedFileUrl(publicUrl)) {
    return downloadRedirect(publicUrl, fileName);
  }

  return NextResponse.json({ error: 'تعذر قراءة الملف الأصلي' }, { status: 404 });
}
