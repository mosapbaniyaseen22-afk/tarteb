import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAdminResourceType, normalizeAdminResource, type AdminResource } from '@/lib/admin';
import { getAdminSession, persistOriginalFile, readResources, saveResource } from '@/lib/admin-server';
import { extractQuestionsFromBytes, loadPublishedBytes } from '@/lib/practice-extract';
import { normalizeTawjihiStage } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const items = await readResources();
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
    }

    const form = await request.formData();
    const typeValue = String(form.get('type') || '');
    const title = String(form.get('title') || '').trim();
    const description = String(form.get('description') || '').trim();
    const subjectName = String(form.get('subjectName') || 'الكل').trim() || 'الكل';
    const yearRaw = String(form.get('year') || '').trim();
    const externalUrl = String(form.get('externalUrl') || '').trim();
    const stage = normalizeTawjihiStage(String(form.get('stage') || 'tawjihi_first'));
    const providedId = String(form.get('id') || '').trim();
    const providedPath = String(form.get('filePath') || '').trim();
    const providedUrl = String(form.get('fileUrl') || '').trim();
    const file = form.get('file');

    if (!isAdminResourceType(typeValue)) {
      return NextResponse.json({ error: 'نوع المحتوى غير صالح' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'أدخل عنوان المحتوى' }, { status: 400 });
    }

    const year = yearRaw ? Number(yearRaw) : null;
    const uploaded = file instanceof File && file.size > 0 ? file : null;

    if (!uploaded && !providedPath && !externalUrl) {
      return NextResponse.json({ error: 'ارفع ملفاً أو أضف رابطاً' }, { status: 400 });
    }

    const id = providedId || randomBytes(12).toString('hex');
    let extractedText: string | null = null;
    let questions: AdminResource['questions'] = [];
    let filePath: string | null = providedPath || null;
    let fileUrl: string | null = providedUrl || null;
    const fileName = uploaded?.name || String(form.get('fileName') || '').trim() || 'file.pdf';
    const fileMime = uploaded?.type || String(form.get('fileMime') || '').trim() || 'application/pdf';
    const uploadedBytes = uploaded ? Buffer.from(await uploaded.arrayBuffer()) : null;

    if (uploaded || providedPath) {
      try {
        const uploadedCloud = await persistOriginalFile({
          id,
          fileName,
          mime: fileMime,
          bytes: uploadedBytes,
          filePath: providedPath || null,
          fileUrl: providedUrl || null,
        });
        filePath = uploadedCloud.filePath;
        fileUrl = uploadedCloud.fileUrl;
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'تعذر حفظ الملف الأصلي للتحميل. حاول مرة أخرى.' }, { status: 500 });
      }

      try {
        const bytes = uploadedBytes && uploadedBytes.length > 0
          ? uploadedBytes
          : await loadPublishedBytes({ filePath, fileUrl });
        if (bytes && bytes.length > 0) {
          const extracted = await extractQuestionsFromBytes({ fileName, mime: fileMime, bytes });
          questions = extracted.questions;
          extractedText = extracted.extractedText || null;
        }
      } catch (error) {
        console.error(error);
      }
    }

    const item = await saveResource(
      normalizeAdminResource({
        id,
        type: typeValue,
        title,
        description,
        subjectName,
        year: Number.isFinite(year) ? year : null,
        stage,
        fileName: uploaded?.name || String(form.get('fileName') || '').trim() || null,
        fileMime: uploaded?.type || String(form.get('fileMime') || '').trim() || fileMime,
        filePath,
        fileUrl,
        externalUrl: externalUrl || null,
        extractedText,
        questions,
        autoClassified: false,
        published: true,
        createdAt: new Date().toISOString(),
      }),
    );
    return NextResponse.json({ item });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && error.message && !/forbidden/i.test(error.message)
      ? error.message
      : 'تعذر نشر المحتوى. حاول مرة أخرى.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
