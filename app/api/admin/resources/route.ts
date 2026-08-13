import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import type { AdminResource, AdminResourceType } from '@/lib/admin';
import { getAdminSession, readResources, saveUpload, writeResources } from '@/lib/admin-server';
import { classifyDocument, isExtractableDocument } from '@/lib/document-ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RESOURCE_TYPES: AdminResourceType[] = [
  'material',
  'summary',
  'dossier',
  'ministerial_exam',
  'suggested_exam',
  'questions',
  'video',
];

function isResourceType(value: string): value is AdminResourceType {
  return RESOURCE_TYPES.includes(value as AdminResourceType);
}

export async function GET() {
  const items = await readResources();
  return NextResponse.json({ items });
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
  const file = form.get('file');

  if (!isResourceType(typeValue)) {
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

  if (uploaded) {
    const bytes = Buffer.from(await uploaded.arrayBuffer());
    await saveUpload(id, bytes);
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

  const item: AdminResource = {
    id,
    type: typeValue,
    title,
    description,
    subjectName,
    year: Number.isFinite(year) ? year : null,
    fileName: uploaded?.name ?? null,
    fileMime: uploaded?.type || null,
    externalUrl: externalUrl || null,
    extractedText,
    questions,
    autoClassified: false,
    createdAt: new Date().toISOString(),
  };

  const items = await readResources();
  items.unshift(item);
  await writeResources(items);

  return NextResponse.json({ item });
}
