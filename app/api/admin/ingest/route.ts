import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { normalizeAdminResource } from '@/lib/admin';
import { getAdminSession, readResources, saveUpload, writeResources } from '@/lib/admin-server';
import { uploadCloudFile } from '@/lib/admin-cloud';
import {
  classifyDocument,
  classifyFromFileName,
  documentKindError,
  ingestSummary,
  isExtractableDocument,
} from '@/lib/document-ingest';
import { normalizeTawjihiStage } from '@/lib/utils';

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
  const stage = normalizeTawjihiStage(String(form.get('stage') || 'tawjihi_first'));
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
      console.error(error);
      classification = classifyFromFileName(file.name);
    }

    const id = randomBytes(12).toString('hex');
    try {
      await saveUpload(id, bytes);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: `تعذر حفظ الملف ${file.name}. حاول مرة أخرى.` }, { status: 500 });
    }
    const uploadedCloud = await uploadCloudFile(id, bytes, file.type || 'application/octet-stream', file.name);

    const item = normalizeAdminResource({
      id,
      type: classification.type === 'material' && classification.questions.length >= 8 ? 'questions' : classification.type,
      title: classification.title,
      description: classification.description,
      subjectName: classification.subjectName,
      year: classification.year,
      stage,
      fileName: file.name,
      fileMime: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      filePath: uploadedCloud.filePath,
      fileUrl: uploadedCloud.fileUrl,
      externalUrl: null,
      extractedText: classification.extractedText || null,
      questions: classification.questions,
      autoClassified: true,
      published: true,
      createdAt: new Date().toISOString(),
    });

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
