import { NextResponse } from 'next/server';
import { persistOriginalFile, deleteResource, findResource, getAdminSession, saveResource } from '@/lib/admin-server';
import { extractQuestionsFromBytes, loadPublishedBytes } from '@/lib/practice-extract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
    }

    await deleteResource(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'تعذر حذف الملف بالكامل. حاول مرة أخرى.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
    }

    const form = await request.formData();
    const uploaded = form.get('file');
    const providedPath = String(form.get('filePath') || '').trim();
    const providedUrl = String(form.get('fileUrl') || '').trim();
    if ((!(uploaded instanceof File) || uploaded.size === 0) && !providedPath) {
      return NextResponse.json({ error: 'ارفع الملف الأصلي PDF' }, { status: 400 });
    }

    const current = await findResource(params.id);
    if (!current) {
      return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });
    }

    const bytes = uploaded instanceof File && uploaded.size > 0 ? Buffer.from(await uploaded.arrayBuffer()) : null;
    const fileName = uploaded instanceof File && uploaded.size > 0 ? uploaded.name : current.fileName || 'file.pdf';
    const fileMime = uploaded instanceof File && uploaded.size > 0 ? uploaded.type : current.fileMime;

    let filePath: string;
    let fileUrl: string;
    try {
      const uploadedCloud = await persistOriginalFile({
        id: params.id,
        fileName,
        mime: fileMime || 'application/pdf',
        bytes,
        filePath: providedPath || null,
        fileUrl: providedUrl || null,
      });
      filePath = uploadedCloud.filePath;
      fileUrl = uploadedCloud.fileUrl;
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: 'تعذر حفظ الملف الأصلي. حاول مرة أخرى.' }, { status: 500 });
    }

    let extractedText = current.extractedText;
    let questions = current.questions;
    try {
      const sourceBytes = bytes && bytes.length > 0
        ? bytes
        : await loadPublishedBytes({ filePath, fileUrl });
      if (sourceBytes && sourceBytes.length > 0) {
        const extracted = await extractQuestionsFromBytes({
          fileName,
          mime: fileMime || 'application/pdf',
          bytes: sourceBytes,
        });
        if (extracted.questions.length >= questions.length) {
          questions = extracted.questions;
          extractedText = extracted.extractedText || extractedText;
        }
      }
    } catch (error) {
      console.error(error);
    }

    const item = await saveResource({
      ...current,
      fileName,
      fileMime: fileMime || current.fileMime,
      filePath,
      fileUrl,
      extractedText,
      questions,
    });
    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'تعذر حفظ الملف الأصلي. حاول مرة أخرى.' }, { status: 500 });
  }
}
