import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import type { AdminResource } from '@/lib/admin';
import { getAdminSession, readResources, saveUpload, writeResources } from '@/lib/admin-server';
import {
  classifyDocument,
  documentKindError,
  ingestSummary,
  isExtractableDocument,
} from '@/lib/document-ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
  }

  const form = await request.formData();
  const files = form.getAll('file').filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: 'ارفع ملف PDF أو Word' }, { status: 400 });
  }

  const items = await readResources();
  const created: Array<{ item: AdminResource; summary: string; scannedLikely: boolean }> = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `الملف ${file.name} أكبر من 20 ميغابايت` }, { status: 400 });
    }

    const kindError = documentKindError(file.name);
    if (kindError || !isExtractableDocument(file.name, file.type)) {
      return NextResponse.json({ error: kindError || `الملف ${file.name} ليس PDF أو Word` }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    let classification;
    try {
      classification = await classifyDocument({
        fileName: file.name,
        mime: file.type,
        buffer: bytes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر استخراج الملف';
      return NextResponse.json({ error: `${file.name}: ${message}` }, { status: 400 });
    }

    const id = randomBytes(12).toString('hex');
    await saveUpload(id, bytes);

    const item: AdminResource = {
      id,
      type: classification.type,
      title: classification.title,
      description: classification.description,
      subjectName: classification.subjectName,
      year: classification.year,
      fileName: file.name,
      fileMime: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      externalUrl: null,
      extractedText: classification.extractedText || null,
      questions: classification.questions,
      autoClassified: true,
      createdAt: new Date().toISOString(),
    };

    items.unshift(item);
    created.push({
      item,
      summary: ingestSummary(classification),
      scannedLikely: classification.scannedLikely,
    });
  }

  await writeResources(items);
  return NextResponse.json({ items: created });
}
