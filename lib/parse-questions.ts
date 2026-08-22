import type { AdminQuestion } from './admin';

const MAX_QUESTIONS = 500;

export function compactSpaces(text: string) {
  return text.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
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

function toAsciiDigits(text: string) {
  return text.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function optionKey(raw: string) {
  const value = raw.trim();
  if (/^[اأ]/.test(value)) return 'أ';
  if (value.startsWith('ب')) return 'ب';
  if (value.startsWith('ج')) return 'ج';
  if (value.startsWith('د')) return 'د';
  if (value.startsWith('ه')) return 'ه';
  return value.toUpperCase();
}

function ordinalLabel(token: string, kind: 'unit' | 'lesson'): string {
  const value = normalize(toAsciiDigits(token)).replace(/^ال/, '');
  switch (value) {
    case '1':
    case 'اولى':
    case 'اولي':
    case 'اول':
      return kind === 'unit' ? 'الأولى' : 'الأول';
    case '2':
    case 'ثانيه':
    case 'ثاني':
      return kind === 'unit' ? 'الثانية' : 'الثاني';
    case '3':
    case 'ثالثه':
    case 'ثالث':
      return kind === 'unit' ? 'الثالثة' : 'الثالث';
    case '4':
    case 'رابعه':
    case 'رابع':
      return kind === 'unit' ? 'الرابعة' : 'الرابع';
    case '5':
    case 'خامسه':
    case 'خامس':
      return kind === 'unit' ? 'الخامسة' : 'الخامس';
    case '6':
    case 'سادسه':
    case 'سادس':
      return kind === 'unit' ? 'السادسة' : 'السادس';
    case '7':
    case 'سابعه':
    case 'سابع':
      return kind === 'unit' ? 'السابعة' : 'السابع';
    case '8':
    case 'ثامنه':
    case 'ثامن':
      return kind === 'unit' ? 'الثامنة' : 'الثامن';
    case '9':
    case 'تاسعه':
    case 'تاسع':
      return kind === 'unit' ? 'التاسعة' : 'التاسع';
    case '10':
    case 'عاشره':
    case 'عاشر':
      return kind === 'unit' ? 'العاشرة' : 'العاشر';
    default:
      return token.trim();
  }
}

type HeadingHit = { ordinal: string; title: string };

const UNIT_HEADING =
  /^(?:ال)?وحد[ةه](?:\s*رقم)?\s*(?:ال)?(\d+|[أا]ول[ىي]?|ثاني[ةه]?|ثالث[ةه]?|رابع[ةه]?|خامس[ةه]?|سادس[ةه]?|سابع[ةه]?|ثامن[ةه]?|تاسع[ةه]?|عاشر[ةه]?)(?:\s*[:.\-–]?\s*(.*))?$/;
const CHAPTER_HEADING =
  /^(?:ال)?فصل(?:\s*رقم)?\s*(?:ال)?(\d+|[أا]ول|ثاني|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر)(?:\s*[:.\-–]?\s*(.*))?$/;
const LESSON_HEADING =
  /^(?:ال)?درس(?:\s*رقم)?\s*(?:ال)?(\d+|[أا]ول|ثاني|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر)(?:\s*[:.\-–]?\s*(.*))?$/;

function parseUnitHeading(line: string): HeadingHit | null {
  const raw = toAsciiDigits(line).replace(/\s+/g, ' ').trim();
  if (raw.length > 140) return null;
  const match = raw.match(UNIT_HEADING) ?? raw.match(CHAPTER_HEADING);
  if (!match) return null;
  return { ordinal: match[1] ?? '', title: (match[2] ?? '').trim() };
}

function parseLessonHeading(line: string): HeadingHit | null {
  const raw = toAsciiDigits(line).replace(/\s+/g, ' ').trim();
  if (raw.length > 140) return null;
  const match = raw.match(LESSON_HEADING);
  if (!match) return null;
  return { ordinal: match[1] ?? '', title: (match[2] ?? '').trim() };
}

function formatUnit(hit: HeadingHit) {
  const label = ordinalLabel(hit.ordinal, 'unit');
  return hit.title ? `الوحدة ${label}: ${hit.title}` : `الوحدة ${label}`;
}

function formatLesson(hit: HeadingHit) {
  const label = ordinalLabel(hit.ordinal, 'lesson');
  return hit.title ? `الدرس ${label}: ${hit.title}` : `الدرس ${label}`;
}

function isAnswerHeading(line: string) {
  const n = normalize(line);
  return /^(الاجابات?|الاجابه|نموذج الاجاب|الاجابه النموذجيه|الحلول)\s*:?\s*$/.test(n);
}

function isQuestionBankHeading(line: string) {
  const n = normalize(line);
  return (
    /^(?:اسئله|اسال[ةه])\s*(?:ال)?(درس|وحده|فصل)/.test(n)
    || /^(ضع دائره|اختر (?:الاجابه|الرمز) الصحيح)/.test(n)
    || /^تقويم(?:\s+الدرس)?$/.test(n)
  );
}

function isUnitQuestionsHeading(line: string) {
  return /^(?:اسئله|اسال[ةه])\s*(?:ال)?وحده/.test(normalize(line));
}

function isTitleLine(line: string) {
  if (line.length < 4 || line.length > 90) return false;
  if (parseUnitHeading(line) || parseLessonHeading(line)) return false;
  if (isAnswerHeading(line) || isQuestionBankHeading(line)) return false;
  if (/^(?:س(?:ؤال)?\s*)?\d{1,3}\s*[\-.:)）]/.test(line)) return false;
  if (/^(?:\(?\s*)[أاببججددههA-Da-d](?:\s*\)|\s*[\-.:])/.test(line)) return false;
  return true;
}

function isPureHeading(text: string) {
  if (!parseUnitHeading(text) && !parseLessonHeading(text)) return false;
  if (/[؟?]/.test(text)) return false;
  return !/(تحدث|يعد|تأسس|قام|اذكر|وضح|فسر|علل|ما هي|ما هو|من أشهر|من اهم|من أهم)/.test(text);
}

function splitInlineOptions(text: string) {
  const matches = Array.from(text.matchAll(/([أاببججددههA-Da-d])\s*[).\-]\s*/g));
  if (matches.length < 2) return { prompt: text.trim(), options: [] as AdminQuestion['options'] };

  const firstIndex = matches[0]?.index ?? 0;
  const prompt = text.slice(0, firstIndex).trim();
  const options = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1]?.index ?? text.length) : text.length;
    return {
      key: optionKey(match[1] ?? ''),
      text: text.slice(start, end).trim(),
    };
  }).filter((option) => option.text.length > 0);

  return { prompt: prompt || text.trim(), options };
}

function applyLessonAnswer(questions: AdminQuestion[], unit: string | null, lesson: string | null, number: number, key: string) {
  for (let index = questions.length - 1; index >= 0; index -= 1) {
    const question = questions[index];
    if (!question) continue;
    if (question.number !== number) continue;
    if (question.unit !== unit) continue;
    if (question.lesson !== lesson) continue;
    if (!question.answerKey) question.answerKey = key;
    return;
  }
}

export function parseQuestions(text: string): AdminQuestion[] {
  const prepared = compactSpaces(text).replace(/(?<!\d)((?:س(?:ؤال)?\s*)?\d{1,3}\s*[\-.:)）])/g, '\n$1');
  const lines = prepared
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => toAsciiDigits(line));

  const questionStart = /^(?:س(?:ؤال)?\s*)?(\d{1,3})\s*[\-.:)）]\s*(.+)$/;
  const optionStart = /^(?:\(?\s*)([أاببججددههA-Da-d])(?:\s*\)|\s*[\-.:])\s*(.+)$/;
  const answerLine = /^(?:س(?:ؤال)?\s*)?(\d{1,3})\s*[\-.:)）]\s*([أاببججددههA-Da-d1-4])\s*$/;

  const questions: AdminQuestion[] = [];
  let current: AdminQuestion | null = null;
  let currentUnit: string | null = null;
  let currentLesson: string | null = null;
  let inAnswers = false;

  const pushCurrent = () => {
    if (!current) return;
    if (current.options.length < 2) {
      const inline = splitInlineOptions(current.prompt);
      current.prompt = inline.prompt;
      if (inline.options.length >= 2) current.options = inline.options;
    }
    const prompt = current.prompt.trim();
    if (prompt.length < 8) {
      current = null;
      return;
    }
    questions.push(current);
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const unitHit = parseUnitHeading(line);
    const lessonHit = parseLessonHeading(line);

    if (unitHit) {
      pushCurrent();
      inAnswers = false;
      let title = unitHit.title;
      const next = lines[index + 1];
      if (!title && next && isTitleLine(next)) {
        title = next;
        index += 1;
      }
      currentUnit = formatUnit({ ...unitHit, title });
      currentLesson = null;
      continue;
    }

    if (lessonHit) {
      pushCurrent();
      inAnswers = false;
      let title = lessonHit.title;
      const next = lines[index + 1];
      if (!title && next && isTitleLine(next)) {
        title = next;
        index += 1;
      }
      currentLesson = formatLesson({ ...lessonHit, title });
      continue;
    }

    if (isAnswerHeading(line)) {
      pushCurrent();
      inAnswers = true;
      continue;
    }

    if (isUnitQuestionsHeading(line)) {
      pushCurrent();
      inAnswers = false;
      currentLesson = 'أسئلة الوحدة';
      continue;
    }

    if (isQuestionBankHeading(line)) {
      pushCurrent();
      inAnswers = false;
      continue;
    }

    if (inAnswers) {
      const match = line.match(answerLine);
      if (match) {
        applyLessonAnswer(questions, currentUnit, currentLesson, Number(match[1]), optionKey(match[2] ?? ''));
        continue;
      }
      if (questionStart.test(line) || optionStart.test(line)) {
        inAnswers = false;
      } else {
        continue;
      }
    }

    const questionMatch = line.match(questionStart);
    const optionMatch = line.match(optionStart);

    if (questionMatch) {
      const rest = (questionMatch[2] ?? '').trim();
      const numberedUnit = parseUnitHeading(rest);
      const numberedLesson = parseLessonHeading(rest);
      if (numberedUnit && isPureHeading(rest)) {
        pushCurrent();
        inAnswers = false;
        currentUnit = formatUnit(numberedUnit);
        currentLesson = null;
        continue;
      }
      if (numberedLesson && isPureHeading(rest)) {
        pushCurrent();
        inAnswers = false;
        currentLesson = formatLesson(numberedLesson);
        continue;
      }
      if (isQuestionBankHeading(rest)) {
        continue;
      }
      if (!current || current.options.length > 0 || Number(questionMatch[1]) !== current.number) {
        pushCurrent();
        current = {
          number: Number(questionMatch[1]),
          prompt: rest,
          options: [],
          answerKey: null,
          unit: currentUnit,
          lesson: currentLesson,
        };
        continue;
      }
    }

    if (current && optionMatch) {
      current.options.push({
        key: optionKey(optionMatch[1] ?? ''),
        text: (optionMatch[2] ?? '').trim(),
      });
      continue;
    }

    if (current && !optionMatch && current.options.length < 2 && line.length > 3 && !/^[-_=*]{3,}$/.test(line)) {
      current.prompt = `${current.prompt} ${line}`.trim();
    }
  }
  pushCurrent();

  const usable = questions.filter((item) => item.prompt.length >= 8).slice(0, MAX_QUESTIONS);
  const hasStructured = usable.some((item) => item.options.length >= 2);
  if (usable.length >= 3 || hasStructured) return usable;
  return [];
}
