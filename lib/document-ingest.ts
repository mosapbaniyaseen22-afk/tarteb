import mammoth from 'mammoth';
import {
  ADMIN_SUBJECT_OPTIONS,
  resourceTypeLabel,
  type AdminQuestion,
  type AdminResourceType,
} from './admin';
import { compactSpaces, parseQuestions } from './parse-questions';

const MAX_TEXT_CHARS = 180000;

const SUBJECT_ALIASES: { name: string; aliases: string[] }[] = [
  { name: 'رياضيات أعمال', aliases: ['رياضيات اعمال', 'رياضيات أعمال'] },
  { name: 'إنجليزي متقدم', aliases: ['انجليزي متقدم', 'إنجليزي متقدم', 'english'] },
  { name: 'التربية الإسلامية', aliases: ['التربيه الاسلاميه', 'التربية الإسلامية', 'التربية الاسلامية', 'اسلامية', 'إسلامية'] },
  { name: 'تاريخ الأردن', aliases: ['تاريخ الاردن', 'تاريخ الأردن'] },
  { name: 'اللغة العربية', aliases: ['اللغه العربيه', 'اللغة العربية', 'العربية', 'عربي'] },
  { name: 'ثقافة مالية', aliases: ['ثقافه ماليه', 'ثقافة مالية'] },
  { name: 'علم الاجتماع', aliases: ['علم الاجتماع'] },
  { name: 'علوم أرض', aliases: ['علوم ارض', 'علوم أرض', 'جيولوجيا'] },
  { name: 'دين تخصص', aliases: ['دين تخصص'] },
  { name: 'عربي تخصص', aliases: ['عربي تخصص'] },
  { name: 'علم النفس', aliases: ['علم النفس'] },
  { name: 'الرياضيات', aliases: ['الرياضيات', 'رياضيات', 'mathematics', 'math'] },
  { name: 'الفلسفة', aliases: ['الفلسفة', 'الفلسفه'] },
  { name: 'جغرافيا', aliases: ['جغرافيا', 'جغرافية'] },
  { name: 'كيمياء', aliases: ['كيمياء', 'كيميا', 'chemistry'] },
  { name: 'فيزياء', aliases: ['فيزياء', 'physics'] },
  { name: 'أحياء', aliases: ['احياء', 'أحياء', 'biology'] },
  { name: 'فلسفة', aliases: ['فلسفة', 'فلسفه', 'philosophy'] },
  { name: 'تاريخ', aliases: ['تاريخ'] },
];

type KeywordRule = { type: AdminResourceType; keywords: string[]; weight: number };

const TYPE_RULES: KeywordRule[] = [
  {
    type: 'ministerial_exam',
    weight: 8,
    keywords: [
      'امتحان وزاري',
      'الامتحان الوزاري',
      'وزاريه',
      'وزارية',
      'وزاري',
      'الدوره الشتويه',
      'الدورة الشتوية',
      'الدوره الصيفيه',
      'الدورة الصيفية',
      'وزارة التربيه',
      'وزارة التربية',
      'شهاده الدراسه الثانويه',
      'شهادة الدراسة الثانوية',
    ],
  },
  {
    type: 'suggested_exam',
    weight: 7,
    keywords: ['امتحان مقترح', 'نموذج امتحان', 'امتحان تجريبي', 'ورقه امتحان', 'ورقة امتحان'],
  },
  {
    type: 'questions',
    weight: 6,
    keywords: [
      'بنك اسئله',
      'بنك أسئلة',
      'اسئله وزاريه',
      'أسئلة وزارية',
      'اختر الاجابه الصحيحه',
      'اختر الإجابة الصحيحة',
      'ضع دائره',
      'ضع دائرة',
      'اجب عن الاسئله',
      'أجب عن الأسئلة',
    ],
  },
  {
    type: 'electronic_exam',
    weight: 7,
    keywords: ['امتحان الكتروني', 'امتحان إلكتروني', 'اختبار الكتروني', 'اختبار إلكتروني'],
  },
  {
    type: 'summary',
    weight: 5,
    keywords: ['تلخيص', 'ملخص', 'مراجعه سريعه', 'مراجعة سريعة'],
  },
  {
    type: 'dossier',
    weight: 5,
    keywords: ['دوسيه', 'دوسية', 'مذكره شامله', 'مذكرة شاملة'],
  },
  {
    type: 'material',
    weight: 3,
    keywords: ['شرح', 'درس', 'الوحده', 'الوحدة', 'الفصل'],
  },
];

export type IngestClassification = {
  type: AdminResourceType;
  subjectName: string;
  title: string;
  year: number | null;
  description: string;
  extractedText: string;
  questions: AdminQuestion[];
  scannedLikely: boolean;
  placement: string;
};

export function isExtractableDocument(fileName: string, mime: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    mime.includes('pdf') ||
    mime.includes('wordprocessingml')
  );
}

export function documentKindError(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
    return 'ملفات Word القديمة ‎.doc غير مدعومة. احفظ الملف كـ PDF أو ‎.docx';
  }
  if (!isExtractableDocument(fileName, '')) {
    return 'ارفع ملف PDF أو Word ‎.docx';
  }
  return null;
}

function normalize(text: string) {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[_‐‑–—-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_‐‑–—-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectYear(text: string) {
  const match = text.match(/\b(20(?:1[5-9]|2[0-9]|3[0-6]))\b/);
  return match ? Number(match[1]) : null;
}

function detectSubject(haystack: string) {
  const normalized = normalize(haystack);
  for (const subject of SUBJECT_ALIASES) {
    if (!ADMIN_SUBJECT_OPTIONS.includes(subject.name)) continue;
    if (subject.aliases.some((alias) => normalized.includes(normalize(alias)))) {
      return subject.name;
    }
  }
  return 'الكل';
}

function detectType(haystack: string, questionCount: number): AdminResourceType {
  const normalized = normalize(haystack);
  let best: { type: AdminResourceType; score: number } = { type: 'material', score: 0 };

  for (const rule of TYPE_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (normalized.includes(normalize(keyword))) score += rule.weight;
    }
    if (score > best.score) best = { type: rule.type, score };
  }

  if (best.type === 'material' && questionCount >= 3) return 'questions';
  if (best.score === 0 && questionCount >= 3) return 'questions';
  if (normalized.includes(normalize('امتحان')) && best.type === 'questions') {
    return normalized.includes(normalize('مقترح')) || normalized.includes(normalize('تجريبي'))
      ? 'suggested_exam'
      : 'ministerial_exam';
  }
  return best.type;
}

export { parseQuestions };

async function extractPdf(buffer: Buffer) {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await Promise.race([
        parser.getText(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('pdf-timeout')), 12000);
        }),
      ]);
      return compactSpaces((result.text || '').replace(/\n--\s*\d+\s+of\s+\d+\s*--\s*/gi, '\n'));
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  } catch (error) {
    console.error('pdf extract failed', error);
    return '';
  }
}

async function extractDocx(buffer: Buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return compactSpaces(result.value || '');
  } catch (error) {
    console.error('docx extract failed', error);
    return '';
  }
}

export function classifyFromFileName(fileName: string): IngestClassification {
  const type = detectType(fileName, 0);
  const subjectName = detectSubject(fileName);
  const year = detectYear(fileName);
  const title = titleFromFileName(fileName) || 'محتوى مرفوع';
  return {
    type,
    subjectName,
    title,
    year,
    description: `رُفع ${fileName}`,
    extractedText: '',
    questions: [],
    scannedLikely: true,
    placement: placementFor(type, subjectName),
  };
}

export async function extractDocumentText(fileName: string, mime: string, buffer: Buffer) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mime.includes('pdf')) return extractPdf(buffer);
  if (lower.endsWith('.docx') || mime.includes('wordprocessingml')) return extractDocx(buffer);
  throw new Error(documentKindError(fileName) || 'صيغة الملف غير مدعومة');
}

export function placementFor(type: AdminResourceType, subjectName: string) {
  switch (type) {
    case 'material':
      return subjectName === 'الكل' ? 'تبويب الشرح في صفحات المواد' : `شرح مادة ${subjectName}`;
    case 'summary':
      return subjectName === 'الكل' ? 'تبويب التلخيصات' : `تلخيصات مادة ${subjectName}`;
    case 'dossier':
      return subjectName === 'الكل' ? 'تبويب الدوسيات' : `دوسيات مادة ${subjectName}`;
    case 'ministerial_exam':
      return 'الامتحانات الوزارية وصفحة المادة';
    case 'suggested_exam':
      return 'الامتحانات المقترحة وصفحة المادة';
    case 'questions':
      return subjectName === 'الكل' ? 'تبويب الأسئلة في المواد واختبر نفسك' : `أسئلة مادة ${subjectName}`;
    case 'electronic_exam':
      return 'الامتحانات الإلكترونية واختبر نفسك';
    case 'video':
      return 'تبويب الفيديوهات';
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export async function classifyDocument(input: {
  fileName: string;
  mime: string;
  buffer: Buffer;
}): Promise<IngestClassification> {
  const extractedText = (await extractDocumentText(input.fileName, input.mime, input.buffer)).slice(0, MAX_TEXT_CHARS);
  const questions = parseQuestions(extractedText);
  const haystack = `${input.fileName}\n${extractedText}`;
  const type = detectType(haystack, questions.length);
  const subjectName = detectSubject(haystack);
  const year = detectYear(haystack);
  const fileTitle = titleFromFileName(input.fileName);
  const firstLine = extractedText.split('\n').map((line) => line.trim()).find((line) => line.length >= 8 && line.length <= 80);
  const title = fileTitle || firstLine || 'محتوى مرفوع';
  const scannedLikely = extractedText.replace(/\s/g, '').length < 80;

  const descriptionParts = [
    `استُخرج تلقائياً من ${input.fileName}`,
    questions.length ? `${questions.length} سؤال` : null,
    scannedLikely ? 'النص قليل وقد يكون الملف صورة ممسوحة' : null,
  ].filter(Boolean);

  return {
    type,
    subjectName,
    title,
    year,
    description: descriptionParts.join(' • '),
    extractedText,
    questions,
    scannedLikely,
    placement: placementFor(type, subjectName),
  };
}

export function ingestSummary(classification: IngestClassification) {
  return `${resourceTypeLabel(classification.type)} • ${classification.subjectName}${
    classification.year ? ` • ${classification.year}` : ''
  } → ${classification.placement}`;
}
