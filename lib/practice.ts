import {
  normalizeAdminQuestion,
  resourceMatchesSubject,
  type AdminQuestion,
  type AdminResource,
} from './admin';
import { parseQuestions } from './parse-questions';

export const UNGROUPED_UNIT = 'بدون وحدة';
export const UNGROUPED_LESSON = 'أسئلة عامة';
export const MAX_LESSON_QUIZ = 40;

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

  const stored = (resource.questions ?? []).map(normalizeAdminQuestion);
  const extracted = resource.extractedText?.trim();
  let resolved = stored;
  if (extracted) {
    const parsed = parseQuestions(extracted).map(normalizeAdminQuestion);
    if (parsed.length > 0 && (hasStructure(parsed) || !hasStructure(stored) || parsed.length > stored.length)) {
      resolved = parsed;
    }
  }
  questionCache.set(resource, resolved);
  return resolved;
}

export function isMcqQuestion(question: AdminQuestion) {
  return question.options.length >= 2;
}

export function collectPracticeQuestions(resources: AdminResource[], subjectName: string | null) {
  const pool: PracticeQuestion[] = [];
  resources.forEach((resource) => {
    if (subjectName && !resourceMatchesSubject(resource, subjectName)) return;
    questionsForResource(resource).forEach((question) => {
      pool.push({
        ...question,
        resourceId: resource.id,
        resourceTitle: resource.title,
        subjectName: resource.subjectName,
      });
    });
  });
  return pool;
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
