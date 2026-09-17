import {
  normalizeAdminQuestion,
  resourceMatchesSubject,
  type AdminQuestion,
  type AdminResource,
  type AdminResourceType,
} from './admin';
import { parseQuestions } from './parse-questions';
import { practiceBankForSubject } from './practice-bank';
import { buildPracticeQuestions } from './practice-build';

export const PRACTICE_SOURCE_TYPES: AdminResourceType[] = [
  'material',
  'summary',
  'dossier',
  'questions',
  'ministerial_exam',
  'suggested_exam',
  'electronic_exam',
];

export function isPracticeSourceType(type: AdminResourceType) {
  return PRACTICE_SOURCE_TYPES.includes(type);
}

export const UNGROUPED_UNIT = 'بدون وحدة';
export const UNGROUPED_LESSON = 'أسئلة عامة';
export const MAX_LESSON_QUIZ = 40;
export const NO_PRACTICE_SENTINEL = '__labib_no_mcq__';

export type PracticeQuestion = AdminQuestion & {
  resourceId: string;
  resourceTitle: string;
  subjectName: string;
};

export type PracticeLesson = {
  name: string;
  questions: PracticeQuestion[];
};

export type PracticeUnit = {
  name: string;
  lessons: PracticeLesson[];
};

function hasStructure(questions: AdminQuestion[]) {
  return questions.some((question) => Boolean(question.unit || question.lesson));
}

const questionCache = new WeakMap<AdminResource, AdminQuestion[]>();

export function questionsForResource(resource: AdminResource): AdminQuestion[] {
  const cached = questionCache.get(resource);
  if (cached) return cached;

  const stored = (resource.questions ?? [])
    .map(normalizeAdminQuestion)
    .filter((question) => question.prompt !== NO_PRACTICE_SENTINEL && isMcqQuestion(question));
  const extracted = resource.extractedText?.trim();
  let resolved = stored;
  if (extracted) {
    const parsed = parseQuestions(extracted).map(normalizeAdminQuestion).filter(isMcqQuestion);
    const built = buildPracticeQuestions(extracted, resource.title, UNGROUPED_LESSON).map(normalizeAdminQuestion);
    const next = parsed.length >= built.length ? parsed : built;
    if (next.length > 0 && (hasStructure(next) || !hasStructure(stored) || next.length > stored.length)) {
      resolved = next;
    }
  }
  if (resolved.length === 0 && isPracticeSourceType(resource.type) && resource.published !== false) {
    resolved = practiceBankForSubject(resource.subjectName).map(normalizeAdminQuestion);
  }
  questionCache.set(resource, resolved);
  return resolved;
}

export function isMcqQuestion(question: AdminQuestion) {
  return question.options.length >= 2;
}

function normalizePrompt(text: string) {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sourceUnitLesson(resource: AdminResource): { unit: string; lesson: string } {
  const title = resource.title.trim() || 'محتوى منشور';
  switch (resource.type) {
    case 'ministerial_exam':
      return {
        unit: 'نمط وزاري',
        lesson: resource.year ? `${title} • ${resource.year}` : title,
      };
    case 'suggested_exam':
      return {
        unit: 'أسئلة مقترحة',
        lesson: resource.year ? `${title} • ${resource.year}` : title,
      };
    case 'electronic_exam':
      return { unit: 'امتحانات إلكترونية', lesson: title };
    case 'questions':
      return { unit: title, lesson: UNGROUPED_LESSON };
    case 'material':
      return { unit: title, lesson: UNGROUPED_LESSON };
    case 'summary':
      return { unit: 'من الملخصات', lesson: title };
    case 'dossier':
      return { unit: 'من الدوسيات', lesson: title };
    case 'video':
      return { unit: UNGROUPED_UNIT, lesson: title };
    default: {
      const exhaustive: never = resource.type;
      return exhaustive;
    }
  }
}

function withSourceGrouping(question: AdminQuestion, resource: AdminResource): AdminQuestion {
  const fallback = sourceUnitLesson(resource);
  return {
    ...question,
    unit: question.unit?.trim() || fallback.unit,
    lesson: question.lesson?.trim() || fallback.lesson,
  };
}

export function collectPracticeQuestions(
  resources: AdminResource[],
  subjectName: string | null,
  allowedSubjects: string[] = [],
) {
  const pool: PracticeQuestion[] = [];
  const seen = new Set<string>();

  resources.forEach((resource) => {
    if (resource.published === false) return;
    if (!isPracticeSourceType(resource.type)) return;
    if (subjectName && !resourceMatchesSubject(resource, subjectName)) return;
    if (!subjectName && allowedSubjects.length > 0) {
      const matchesStudent = allowedSubjects.some((name) => resourceMatchesSubject(resource, name));
      if (!matchesStudent) return;
    }

    questionsForResource(resource).forEach((question) => {
      const grouped = withSourceGrouping(question, resource);
      const key = `${resource.subjectName}:${normalizePrompt(grouped.prompt).slice(0, 140)}`;
      if (seen.has(key)) return;
      seen.add(key);
      pool.push({
        ...grouped,
        resourceId: resource.id,
        resourceTitle: resource.title,
        subjectName: resource.subjectName,
      });
    });
  });
  return pool;
}

export function practiceSourceCount(resources: AdminResource[], subjectName: string | null) {
  return resources.filter((resource) => {
    if (resource.published === false) return false;
    if (!isPracticeSourceType(resource.type)) return false;
    if (subjectName && !resourceMatchesSubject(resource, subjectName)) return false;
    return questionsForResource(resource).length > 0;
  }).length;
}

function unitSortValue(name: string) {
  if (name === UNGROUPED_UNIT) return 1000;
  const digit = name.match(/(\d+)/);
  if (digit) return Number(digit[1]);
  const ordinals = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];
  const index = ordinals.findIndex((item) => name.includes(item));
  return index >= 0 ? index + 1 : 500;
}

function lessonSortValue(name: string) {
  if (name === UNGROUPED_LESSON) return 1000;
  if (name === 'أسئلة الوحدة') return 900;
  const digit = name.match(/(\d+)/);
  if (digit) return Number(digit[1]);
  const ordinals = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
  const index = ordinals.findIndex((item) => name.includes(item));
  return index >= 0 ? index + 1 : 500;
}

export function groupPracticeTree(questions: PracticeQuestion[]): PracticeUnit[] {
  const units = new Map<string, Map<string, PracticeQuestion[]>>();

  questions.forEach((question) => {
    const unitName = question.unit?.trim() || UNGROUPED_UNIT;
    const lessonName = question.lesson?.trim() || UNGROUPED_LESSON;
    const lessons = units.get(unitName) ?? new Map<string, PracticeQuestion[]>();
    const bucket = lessons.get(lessonName) ?? [];
    bucket.push(question);
    lessons.set(lessonName, bucket);
    units.set(unitName, lessons);
  });

  return Array.from(units.entries())
    .sort((left, right) => unitSortValue(left[0]) - unitSortValue(right[0]))
    .map(([name, lessons]) => ({
      name,
      lessons: Array.from(lessons.entries())
        .sort((left, right) => lessonSortValue(left[0]) - lessonSortValue(right[0]))
        .map(([lessonName, lessonQuestions]) => ({
          name: lessonName,
          questions: lessonQuestions,
        })),
    }));
}

export function countMcq(questions: PracticeQuestion[]) {
  return questions.filter(isMcqQuestion).length;
}

export function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swap] as T;
    next[swap] = current as T;
  }
  return next;
}

export function lessonQuiz(questions: PracticeQuestion[]) {
  return shuffle(questions.filter(isMcqQuestion)).slice(0, MAX_LESSON_QUIZ);
}
