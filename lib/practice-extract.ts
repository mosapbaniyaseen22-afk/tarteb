import { type AdminQuestion, type AdminResource } from './admin';
import { cloudPublicFileUrl, downloadCloudFile } from './admin-cloud';
import { classifyDocument, isExtractableDocument } from './document-ingest';
import { isMcqQuestion, isPracticeSourceType, NO_PRACTICE_SENTINEL } from './practice';
import { practiceBankForSubject } from './practice-bank';
import { buildPracticeQuestions } from './practice-build';

const EXTRACT_MAX_BYTES = 80 * 1024 * 1024;

function guessMime(fileName: string, mime?: string | null) {
  if (mime) return mime;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'application/octet-stream';
}

export async function loadPublishedBytes(input: {
  filePath?: string | null;
  fileUrl?: string | null;
}): Promise<Buffer | null> {
  if (input.filePath) {
    const stored = await downloadCloudFile(input.filePath);
    if (stored && stored.byteLength > 0 && stored.byteLength <= EXTRACT_MAX_BYTES) {
      return Buffer.from(stored);
    }
  }

  const href = input.fileUrl || (input.filePath ? cloudPublicFileUrl(input.filePath) : null);
  if (!href) return null;

  const response = await fetch(href.split('?')[0] || href, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) return null;
  const size = Number(response.headers.get('content-length') || 0);
  if (size > EXTRACT_MAX_BYTES) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > EXTRACT_MAX_BYTES) return null;
  return bytes;
}

export async function extractQuestionsFromBytes(input: {
  fileName: string;
  mime?: string | null;
  bytes: Buffer;
}): Promise<{ questions: AdminQuestion[]; extractedText: string }> {
  if (!isExtractableDocument(input.fileName, input.mime || '')) {
    return { questions: [], extractedText: '' };
  }
  const classification = await classifyDocument({
    fileName: input.fileName,
    mime: guessMime(input.fileName, input.mime),
    buffer: input.bytes,
  });
  const extractedText = classification.extractedText;
  const built = extractedText ? buildPracticeQuestions(extractedText) : [];
  const questions = classification.questions.filter(isMcqQuestion).length >= built.filter(isMcqQuestion).length
    ? classification.questions.filter(isMcqQuestion)
    : built.filter(isMcqQuestion);
  return { questions, extractedText };
}

function fallbackQuestions(item: AdminResource): AdminQuestion[] {
  return practiceBankForSubject(item.subjectName);
}

export async function hydrateResourceQuestions(item: AdminResource): Promise<AdminResource> {
  if (!isPracticeSourceType(item.type)) return item;
  const usable = item.questions.filter((question) => question.prompt !== NO_PRACTICE_SENTINEL && isMcqQuestion(question));
  if (usable.length >= 4) return { ...item, questions: usable };

  if (!item.filePath && !item.fileUrl) {
    const bank = fallbackQuestions(item);
    return bank.length > 0 ? { ...item, questions: bank } : item;
  }
  if (!isExtractableDocument(item.fileName || '', item.fileMime || '')) {
    const bank = fallbackQuestions(item);
    return bank.length > 0 ? { ...item, questions: bank } : item;
  }

  const bytes = await loadPublishedBytes({ filePath: item.filePath, fileUrl: item.fileUrl });
  if (!bytes) {
    const bank = fallbackQuestions(item);
    return bank.length > 0 ? { ...item, questions: bank } : item;
  }

  const extracted = await extractQuestionsFromBytes({
    fileName: item.fileName || 'file.pdf',
    mime: item.fileMime,
    bytes,
  });
  const questions = extracted.questions.filter(isMcqQuestion);
  if (questions.length >= 4) {
    return {
      ...item,
      questions,
      extractedText: extracted.extractedText || item.extractedText,
    };
  }

  const bank = fallbackQuestions(item);
  return {
    ...item,
    questions: questions.length > 0 ? questions : bank,
    extractedText: extracted.extractedText || item.extractedText,
  };
}
