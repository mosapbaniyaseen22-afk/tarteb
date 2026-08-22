import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAdminResourceType, normalizeAdminResource, type AdminResource } from '@/lib/admin';
import { getAdminSession, readResources, saveUpload, writeResources } from '@/lib/admin-server';
import { uploadCloudFile } from '@/lib/admin-cloud';
import { classifyDocument, isExtractableDocument } from '@/lib/document-ingest';
import { normalizeTawjihiStage } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const items = await readResources();
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
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
  const file = form.get('file');

  if (!isAdminResourceType(typeValue)) {
    return NextResponse.json({ error: 'نوع المحتوى غير صالح' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: 'أدخل عنوان المحتوى' }, { status: 400 });
  }

  const year = yearRaw ? Number(yearRaw) : null;
  const uploaded = file instanceof File && file.size > 0 ? file : null;

  if (!uploaded && !externalUrl) {
    return NextResponse.json({ error: 'ارفع ملفاً أو أضف رابطاً' }, { status: 400 });
  }

  const id = randomBytes(12).toString('hex');
  let extractedText: string | null = null;
  let questions: AdminResource['questions'] = [];
  let filePath: string | null = null;
  let fileUrl: string | null = null;

  if (uploaded) {
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    await saveUpload(id, bytes);
    const uploadedCloud = await uploadCloudFile(id, bytes, uploaded.type || 'application/octet-stream', uploaded.name);
    filePath = uploadedCloud.filePath;
    fileUrl = uploadedCloud.fileUrl;
    if (isExtractableDocument(uploaded.name, uploaded.type)) {
      try {
        const classified = await classifyDocument({
          fileName: uploaded.name,
          mime: uploaded.type,
          buffer: bytes,
        });
        extractedText = classified.extractedText || null;
        questions = classified.questions;
      } catch {
        extractedText = null;
      }
    }
  }

  const item = normalizeAdminResource({
    id,
    type: typeValue,
    title,
    description,
    subjectName,
    year: Number.isFinite(year) ? year : null,
    stage,
    fileName: uploaded?.name ?? null,
    fileMime: uploaded?.type || null,
    filePath,
    fileUrl,
    externalUrl: externalUrl || null,
    extractedText,
    questions,
    autoClassified: false,
    published: true,
    createdAt: new Date().toISOString(),
  });

  const items = await readResources();
  items.unshift(item);
  await writeResources(items);

  return NextResponse.json({ item });
}
