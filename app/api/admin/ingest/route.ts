import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { MAX_ADMIN_FILE_BYTES, MAX_ADMIN_FILE_LABEL, normalizeAdminResource, type AdminResource } from '@/lib/admin';
import { getAdminSession, persistOriginalFile, saveResource } from '@/lib/admin-server';
import {
  classifyDocument,
  classifyFromFileName,
  documentKindError,
  ingestSummary,
  isExtractableDocument,
} from '@/lib/document-ingest';
import { loadPublishedBytes } from '@/lib/practice-extract';
import { normalizeTawjihiStage } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function guessMime(fileName: string, mime?: string | null) {
  if (mime) return mime;
  if (fileName.toLowerCase().endsWith('.pdf')) return 'application/pdf';
  if (fileName.toLowerCase().endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'application/octet-stream';
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
    }

    const form = await request.formData();
    const stage = normalizeTawjihiStage(String(form.get('stage') || 'tawjihi_first'));
    const files = form.getAll('file').filter((value): value is File => value instanceof File && value.size > 0);
    const providedPath = String(form.get('filePath') || '').trim();
    const providedUrl = String(form.get('fileUrl') || '').trim();
    const providedName = String(form.get('fileName') || '').trim();
    const providedMime = String(form.get('fileMime') || '').trim();
    const providedId = String(form.get('id') || '').trim();

    if (files.length === 0 && !providedPath) {
      return NextResponse.json({ error: 'ارفع ملف PDF أو Word' }, { status: 400 });
    }

    const created: Array<{ item: AdminResource; summary: string; scannedLikely: boolean }> = [];
    const queue =
      files.length > 0
        ? files.map((file) => ({ file, id: providedId || randomBytes(12).toString('hex') }))
        : [{ file: null, id: providedId || randomBytes(12).toString('hex') }];

    for (const entry of queue) {
      const file = entry.file;
      const fileName = file?.name || providedName || 'file.pdf';
      const mime = guessMime(fileName, file?.type || providedMime);
      if (file && file.size > MAX_ADMIN_FILE_BYTES) {
        return NextResponse.json({ error: `الملف ${file.name} أكبر من ${MAX_ADMIN_FILE_LABEL}` }, { status: 400 });
      }

      const kindError = documentKindError(fileName);
      if (kindError || !isExtractableDocument(fileName, mime)) {
        return NextResponse.json({ error: kindError || `الملف ${fileName} ليس PDF أو Word` }, { status: 400 });
      }

      let uploadedCloud: { filePath: string; fileUrl: string };
      const uploadedBytes = file ? Buffer.from(await file.arrayBuffer()) : null;
      try {
        uploadedCloud = await persistOriginalFile({
          id: entry.id,
          fileName,
          mime,
          bytes: uploadedBytes,
          filePath: providedPath || null,
          fileUrl: providedUrl || null,
        });
      } catch (error) {
        console.error(error);
        return NextResponse.json({ error: `تعذر حفظ الملف الأصلي ${fileName}. حاول مرة أخرى.` }, { status: 500 });
      }

      let classification = classifyFromFileName(fileName);
      const bytes = uploadedBytes && uploadedBytes.length > 0
        ? uploadedBytes
        : await loadPublishedBytes({
            filePath: uploadedCloud.filePath,
            fileUrl: uploadedCloud.fileUrl,
          });
      if (bytes && bytes.length > 0) {
        try {
          classification = await classifyDocument({
            fileName,
            mime,
            buffer: bytes,
          });
        } catch (error) {
          console.error(error);
        }
      }

      const item = await saveResource(
        normalizeAdminResource({
          id: entry.id,
          type: classification.type,
          title: classification.title,
          description: classification.description,
          subjectName: classification.subjectName,
          year: classification.year,
          stage,
          fileName,
          fileMime: mime,
          filePath: uploadedCloud.filePath,
          fileUrl: uploadedCloud.fileUrl,
          externalUrl: null,
          extractedText: classification.extractedText || null,
          questions: classification.questions,
          autoClassified: true,
          published: true,
          createdAt: new Date().toISOString(),
        }),
      );

      created.push({
        item,
        summary: ingestSummary(classification),
        scannedLikely: classification.scannedLikely,
      });
    }

    return NextResponse.json({ items: created });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && error.message && !/forbidden/i.test(error.message)
      ? error.message
      : 'تعذر نشر الملف. حاول مرة أخرى.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
