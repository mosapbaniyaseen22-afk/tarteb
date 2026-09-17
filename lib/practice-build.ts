import { type AdminQuestion } from './admin';
import { compactSpaces, parseQuestions } from './parse-questions';

const KEYS = ['أ', 'ب', 'ج', 'د'] as const;
const MAX_GENERATED = 80;

function repairArabicPdfText(text: string) {
  const replacements: Array<[RegExp, string]> = [
    [/ئةل بنك آس/g, 'بنك أسئلة'],
    [/آسلوب/g, 'أسلوب'],
    [/اجلزم/g, 'الجزم'],
    [/عىل/g, 'على'],
    [/اىل/g, 'إلى'],
    [/األ/g, 'الأ'],
    [/اإل/g, 'الإ'],
    [/اال/g, 'الا'],
    [/اآ/g, 'الآ'],
    [/اهل(?=[\u0600-\u06FF])/g, 'اله'],
    [/امل(?=[\u0600-\u06FF])/g, 'الم'],
    [/التّبية/g, 'التربية'],
    [/مجيع/g, 'جميع'],
    [/األعىل/g, 'الأعلى'],
    [/الدّرايس/g, 'الدراسي'],
    [/الدرايس/g, 'الدراسي'],
    [/القمي الإنسانية/g, 'القيم الإنسانية'],
    [/يف القرآن/g, 'في القرآن'],
    [/يف حب/g, 'في حب'],
    [/صور املبتدآ، واخلرب/g, 'صور المبتدأ والخبر'],
    [/آنواع ما/g, 'أنواع ما'],
  ];
  let next = compactSpaces(text);
  for (const [from, to] of replacements) next = next.replace(from, to);
  next = next.replace(/(?:[\u0600-\u06FF]\s+){2,}[\u0600-\u06FF]/g, (chunk) => chunk.replace(/\s+/g, ''));
  return next;
}

type OutlineLesson = { name: string; title: string };
type OutlineUnit = { name: string; lessons: OutlineLesson[] };

function cleanTitle(value: string) {
  return compactSpaces(value)
    .replace(/^[.\-–—:)\]\s]+/, '')
    .replace(/[.]{2,}.*$/, '')
    .replace(/\d+$/, '')
    .trim();
}

function extractOutline(text: string): OutlineUnit[] {
  const units: OutlineUnit[] = [];
  let current: OutlineUnit | null = null;
  const lines = text.split(/\r?\n/).map((line) => compactSpaces(line)).filter(Boolean);

  for (const line of lines) {
    const unitMatch = line.match(/(?:ال)?وحد[ةه]\s*(?:ال)?(\d+|الأولى|الأول|الثانية|الثاني|الثالثة|الثالث|الرابعة|الخامسة)(?:\s*[:.\-–]?\s*(.*))?/i);
    if (unitMatch && line.length < 160) {
      const title = cleanTitle(unitMatch[2] || '');
      current = {
        name: title ? `الوحدة ${unitMatch[1]}: ${title}` : `الوحدة ${unitMatch[1]}`,
        lessons: [],
      };
      units.push(current);
      continue;
    }

    const lessonMatch = line.match(/\(\s*الدرس\s*(\d+)\s*\)\s*(.+)/) || line.match(/^(?:ال)?درس\s*(\d+)\s*[:.\-–]?\s*(.+)$/);
    if (lessonMatch) {
      const title = cleanTitle(lessonMatch[2] || '');
      if (title.length < 6 || title.length > 90) continue;
      if (!current) {
        current = { name: 'الوحدة الأولى', lessons: [] };
        units.push(current);
      }
      current.lessons.push({
        name: `الدرس ${lessonMatch[1]}: ${title}`,
        title,
      });
    }
  }
  return units.filter((unit) => unit.lessons.length > 0);
}

function choiceQuestion(
  number: number,
  prompt: string,
  options: string[],
  answerIndex: number,
  unit: string,
  lesson: string,
): AdminQuestion | null {
  const unique = [...new Set(options.map((item) => compactSpaces(item)).filter((item) => item.length >= 4))];
  if (unique.length < 2) return null;
  const picked = unique.slice(0, 4);
  const answer = picked[Math.min(answerIndex, picked.length - 1)];
  if (!answer) return null;
  return {
    number,
    prompt,
    options: picked.map((text, index) => ({ key: KEYS[index] ?? 'أ', text })),
    answerKey: KEYS[picked.indexOf(answer)] ?? 'أ',
    unit,
    lesson,
  };
}

function questionsFromOutline(units: OutlineUnit[]): AdminQuestion[] {
  const questions: AdminQuestion[] = [];
  const allLessons = units.flatMap((unit) => unit.lessons.map((lesson) => ({ unit: unit.name, lesson })));
  if (allLessons.length < 2) return [];

  allLessons.forEach((item, index) => {
    const lessonName = item.lesson.name;
    const distractors = allLessons
      .filter((other) => other.unit !== item.unit)
      .map((other) => other.unit);
    const question = choiceQuestion(
      questions.length + 1,
      `درس «${lessonName.replace(/^الدرس\s+\d+:\s*/, '')}» يتبع أي وحدة؟`,
      [item.unit, ...distractors],
      0,
      item.unit,
      lessonName,
    );
    if (question) questions.push(question);

    if (index === 0 || index === 1) {
      const titles = allLessons.map((row) => row.lesson.name.replace(/^الدرس\s+\d+:\s*/, ''));
      const about = choiceQuestion(
        questions.length + 1,
        `ما موضوع ${lessonName.split(':')[0] || 'هذا الدرس'} في ${item.unit.split(':')[0] || 'الوحدة'}؟`,
        titles,
        allLessons.indexOf(item),
        item.unit,
        lessonName,
      );
      if (about) questions.push(about);
    }
  });

  return questions;
}

function factLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => compactSpaces(line))
    .filter((line) => line.length >= 28 && line.length <= 140)
    .filter((line) => /(هو|هي|يعد|تُعد|تسمى|يسمى|مجال|مداه|علامة جزمه|إذن)/.test(line))
    .filter((line) => !/ISBN|www\.|@|P\.O/.test(line))
    .slice(0, 24);
}

function questionsFromFacts(text: string, unit: string, lesson: string): AdminQuestion[] {
  const facts = factLines(text);
  if (facts.length < 3) return [];
  const questions: AdminQuestion[] = [];
  for (let index = 0; index < facts.length && questions.length < 12; index += 1) {
    const correct = facts[index];
    if (!correct) continue;
    const distractors = facts.filter((_, other) => other !== index);
    const question = choiceQuestion(
      questions.length + 1,
      'أي العبارات الآتية صحيحة بحسب المادة المنشورة؟',
      [correct, ...distractors],
      0,
      unit,
      lesson,
    );
    if (question) questions.push(question);
  }
  return questions;
}

export function buildPracticeQuestions(text: string, fallbackUnit?: string | null, fallbackLesson?: string | null): AdminQuestion[] {
  const repaired = repairArabicPdfText(text);
  const parsed = parseQuestions(repaired).filter((question) => question.options.length >= 2);
  const outline = extractOutline(repaired);
  const fromOutline = questionsFromOutline(outline);
  const unit = outline[0]?.name || fallbackUnit || 'من المادة المنشورة';
  const lesson = outline[0]?.lessons[0]?.name || fallbackLesson || 'أسئلة عامة';
  const fromFacts = questionsFromFacts(repaired, unit, lesson);

  const merged: AdminQuestion[] = [];
  const seen = new Set<string>();
  [...parsed, ...fromOutline, ...fromFacts].forEach((question) => {
    const key = question.prompt.slice(0, 160);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({
      ...question,
      number: merged.length + 1,
      unit: question.unit || unit,
      lesson: question.lesson || lesson,
    });
  });
  return merged.slice(0, MAX_GENERATED);
}
