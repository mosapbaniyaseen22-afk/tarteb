import type {
  AiConversation,
  Note,
  Profile,
  QuranProgress,
  Routine,
  SchedulePreferences,
  ScheduleEntry,
  ScheduleTemplateBlock,
  StudySession,
  QuizAttempt,
  Task,
  UserSubject,
} from './supabase';
import type { StudyPlan } from './study-plan';

export const PROFILE_STORAGE_KEY = 'labib-profile';
export const SUBJECTS_STORAGE_KEY = 'labib-user-subjects';
const TASKS_KEY = 'labib-tasks';
const NOTES_KEY = 'labib-notes';
const BOOKMARKS_KEY = 'labib-bookmarks';
const QURAN_KEY = 'labib-quran';
const SCHEDULE_KEY = 'labib-schedule';
const AI_KEY = 'labib-ai';
const SESSIONS_KEY = 'labib-sessions';
const QUIZ_KEY = 'labib-quiz-attempts';
const ROUTINES_KEY = 'labib-routines';
const SCHEDULE_PREFS_KEY = 'labib-schedule-preferences';
const TEMPLATES_KEY = 'labib-schedule-templates';
const STUDY_PLAN_KEY = 'labib-study-plan';

const ALL_KEYS = [
  PROFILE_STORAGE_KEY,
  SUBJECTS_STORAGE_KEY,
  TASKS_KEY,
  NOTES_KEY,
  BOOKMARKS_KEY,
  QURAN_KEY,
  SCHEDULE_KEY,
  AI_KEY,
  SESSIONS_KEY,
  QUIZ_KEY,
  ROUTINES_KEY,
  SCHEDULE_PREFS_KEY,
  TEMPLATES_KEY,
  STUDY_PLAN_KEY,
];

const SUBJECT_META: Record<string, { id: string; color: string; name: string }> = {
  الرياضيات: { id: 'math', color: '#2563EB', name: 'Mathematics' },
  رياضيات: { id: 'math', color: '#2563EB', name: 'Mathematics' },
  'اللغة العربية': { id: 'arabic', color: '#F59E0B', name: 'Arabic' },
  'التربية الإسلامية': { id: 'islamic', color: '#059669', name: 'Islamic Education' },
  'تاريخ الأردن': { id: 'jordan-history', color: '#D97706', name: 'Jordan History' },
  أحياء: { id: 'biology', color: '#0EA5E9', name: 'Biology' },
  كيمياء: { id: 'chemistry', color: '#14B8A6', name: 'Chemistry' },
  فيزياء: { id: 'physics', color: '#8B5CF6', name: 'Physics' },
  'إنجليزي متقدم': { id: 'english-adv', color: '#6366F1', name: 'Advanced English' },
  'علوم أرض': { id: 'earth', color: '#78716C', name: 'Earth Science' },
  'رياضيات أعمال': { id: 'business-math', color: '#0891B2', name: 'Business Math' },
  'ثقافة مالية': { id: 'finance', color: '#0D9488', name: 'Financial Literacy' },
  'علم الاجتماع': { id: 'sociology', color: '#DB2777', name: 'Sociology' },
  'علم النفس': { id: 'psychology', color: '#EC4899', name: 'Psychology' },
  فلسفة: { id: 'philosophy', color: '#A855F7', name: 'Philosophy' },
  الفلسفة: { id: 'philosophy', color: '#A855F7', name: 'Philosophy' },
  تاريخ: { id: 'history', color: '#B45309', name: 'History' },
  جغرافيا: { id: 'geography', color: '#65A30D', name: 'Geography' },
  'دين تخصص': { id: 'islamic-adv', color: '#047857', name: 'Islamic Studies' },
  'عربي تخصص': { id: 'arabic-adv', color: '#C2410C', name: 'Advanced Arabic' },
};

const FALLBACK_COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#8B5CF6', '#0EA5E9', '#22C55E'];

export type Bookmark = {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  content_type: string;
  created_at: string;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function clearGuestData() {
  if (typeof window === 'undefined') return;
  ALL_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

export function buildUserSubjects(
  names: string[],
  userId: string,
  stage: string | null,
  field: string | null,
): UserSubject[] {
  return names.map((name, index) => {
    const meta = SUBJECT_META[name] ?? {
      id: `sub_${index}_${name.length}`,
      color: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      name,
    };
    return {
      id: `us_${stage ?? 'year'}_${meta.id}`,
      user_id: userId,
      subject_id: meta.id,
      progress: 0,
      stage: stage ?? 'tawjihi_first',
      subjects: {
        id: meta.id,
        name: meta.name,
        name_ar: name,
        stage,
        field,
        color: meta.color,
        icon: 'BookOpen',
      },
    };
  });
}

export const guestStore = {
  getProfile(): Profile | null {
    return readJson<Profile | null>(PROFILE_STORAGE_KEY, null);
  },
  setProfile(profile: Profile) {
    writeJson(PROFILE_STORAGE_KEY, profile);
  },

  getSubjects(): UserSubject[] {
    return readJson<UserSubject[]>(SUBJECTS_STORAGE_KEY, []);
  },
  setSubjects(subjects: UserSubject[]) {
    writeJson(SUBJECTS_STORAGE_KEY, subjects);
  },
  findSubject(subjectId: string) {
    return this.getSubjects().find((item) => item.subject_id === subjectId) ?? null;
  },

  getTasks(): Task[] {
    return readJson<Task[]>(TASKS_KEY, []);
  },
  setTasks(tasks: Task[]) {
    writeJson(TASKS_KEY, tasks);
  },
  addTask(task: Omit<Task, 'id' | 'created_at'>): Task {
    const next: Task = {
      ...task,
      id: newId('task'),
      created_at: new Date().toISOString(),
    };
    this.setTasks([...this.getTasks(), next]);
    return next;
  },
  updateTask(id: string, patch: Partial<Task>) {
    this.setTasks(this.getTasks().map((task) => (task.id === id ? { ...task, ...patch } : task)));
  },
  deleteTask(id: string) {
    this.setTasks(this.getTasks().filter((task) => task.id !== id));
  },

  getNotes(subjectId: string): Note[] {
    return readJson<Note[]>(NOTES_KEY, [])
      .filter((note) => note.subject_id === subjectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  getJournalNotes(): Note[] {
    return readJson<Note[]>(NOTES_KEY, [])
      .filter((note) => !note.subject_id)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  addNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Note {
    const now = new Date().toISOString();
    const next: Note = {
      ...note,
      id: newId('note'),
      mood: note.mood ?? null,
      paper: note.paper ?? 'cream',
      pinned: note.pinned ?? false,
      created_at: now,
      updated_at: now,
    };
    writeJson(NOTES_KEY, [next, ...readJson<Note[]>(NOTES_KEY, [])]);
    return next;
  },
  updateNote(id: string, patch: Partial<Note>): Note | null {
    const now = new Date().toISOString();
    let updated: Note | null = null;
    const next = readJson<Note[]>(NOTES_KEY, []).map((note) => {
      if (note.id !== id) return note;
      updated = { ...note, ...patch, updated_at: patch.updated_at ?? now };
      return updated;
    });
    writeJson(NOTES_KEY, next);
    return updated;
  },
  deleteNote(id: string) {
    writeJson(NOTES_KEY, readJson<Note[]>(NOTES_KEY, []).filter((note) => note.id !== id));
  },

  getBookmarks(subjectId: string): Bookmark[] {
    return readJson<Bookmark[]>(BOOKMARKS_KEY, [])
      .filter((item) => item.subject_id === subjectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  addBookmark(bookmark: Omit<Bookmark, 'id' | 'created_at'>): Bookmark {
    const next: Bookmark = { ...bookmark, id: newId('bm'), created_at: new Date().toISOString() };
    writeJson(BOOKMARKS_KEY, [next, ...readJson<Bookmark[]>(BOOKMARKS_KEY, [])]);
    return next;
  },
  deleteBookmark(id: string) {
    writeJson(BOOKMARKS_KEY, readJson<Bookmark[]>(BOOKMARKS_KEY, []).filter((item) => item.id !== id));
  },

  getQuran(): QuranProgress[] {
    return readJson<QuranProgress[]>(QURAN_KEY, []).sort((a, b) =>
      b.progress_date.localeCompare(a.progress_date),
    );
  },
  upsertQuran(entry: QuranProgress) {
    const rows = this.getQuran();
    const index = rows.findIndex((item) => item.id === entry.id);
    if (index >= 0) rows[index] = entry;
    else rows.unshift(entry);
    writeJson(QURAN_KEY, rows);
  },

  getSchedule(date: string): ScheduleEntry[] {
    return readJson<ScheduleEntry[]>(SCHEDULE_KEY, [])
      .filter((item) => item.schedule_date === date)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  },
  replaceSchedule(date: string, entries: ScheduleEntry[]) {
    const others = readJson<ScheduleEntry[]>(SCHEDULE_KEY, []).filter((item) => item.schedule_date !== date);
    writeJson(SCHEDULE_KEY, [...others, ...entries]);
  },
  addScheduleEntry(entry: Omit<ScheduleEntry, 'id'>): ScheduleEntry {
    const next: ScheduleEntry = { ...entry, id: newId('sched') };
    const rows = readJson<ScheduleEntry[]>(SCHEDULE_KEY, []);
    writeJson(SCHEDULE_KEY, [...rows, next]);
    return next;
  },
  updateScheduleEntry(id: string, patch: Partial<ScheduleEntry>): ScheduleEntry | null {
    const rows = readJson<ScheduleEntry[]>(SCHEDULE_KEY, []);
    const next = rows.map((item) => (item.id === id ? { ...item, ...patch } : item));
    writeJson(SCHEDULE_KEY, next);
    return next.find((item) => item.id === id) ?? null;
  },
  getScheduleRange(start: string, end: string): ScheduleEntry[] {
    return readJson<ScheduleEntry[]>(SCHEDULE_KEY, []).filter(
      (item) => item.schedule_date >= start && item.schedule_date <= end,
    );
  },
  deleteScheduleEntry(id: string) {
    writeJson(
      SCHEDULE_KEY,
      readJson<ScheduleEntry[]>(SCHEDULE_KEY, []).filter((item) => item.id !== id),
    );
  },

  getRoutines(): Routine[] {
    return readJson<Routine[]>(ROUTINES_KEY, []).sort((a, b) => a.start_time.localeCompare(b.start_time));
  },
  addRoutine(routine: Omit<Routine, 'id' | 'created_at'>): Routine {
    const next: Routine = { ...routine, id: newId('routine'), created_at: new Date().toISOString() };
    writeJson(ROUTINES_KEY, [...readJson<Routine[]>(ROUTINES_KEY, []), next]);
    return next;
  },
  deleteRoutine(id: string) {
    writeJson(ROUTINES_KEY, readJson<Routine[]>(ROUTINES_KEY, []).filter((item) => item.id !== id));
  },

  getPreferences(userId: string): SchedulePreferences | null {
    return readJson<SchedulePreferences[]>(SCHEDULE_PREFS_KEY, []).find((item) => item.user_id === userId) ?? null;
  },
  savePreferences(userId: string, patch: Partial<SchedulePreferences>): SchedulePreferences {
    const rows = readJson<SchedulePreferences[]>(SCHEDULE_PREFS_KEY, []);
    const existing = rows.find((item) => item.user_id === userId);
    const next: SchedulePreferences = {
      id: existing?.id ?? newId('prefs'),
      user_id: userId,
      wake_time: existing?.wake_time ?? '06:30',
      sleep_time: existing?.sleep_time ?? '22:30',
      notes: existing?.notes ?? '',
      schedule_mode: existing?.schedule_mode ?? 'different',
      custom_days: existing?.custom_days ?? [],
      break_enabled: existing?.break_enabled ?? true,
      updated_at: new Date().toISOString(),
      ...patch,
    };
    writeJson(SCHEDULE_PREFS_KEY, [...rows.filter((item) => item.user_id !== userId), next]);
    return next;
  },

  getTemplates(userId: string): ScheduleTemplateBlock[] {
    return readJson<ScheduleTemplateBlock[]>(TEMPLATES_KEY, [])
      .filter((item) => item.user_id === userId)
      .sort((a, b) => a.weekday - b.weekday || a.sort_index - b.sort_index);
  },
  replaceWeekdayTemplate(userId: string, weekday: number, blocks: ScheduleTemplateBlock[]) {
    const others = readJson<ScheduleTemplateBlock[]>(TEMPLATES_KEY, []).filter(
      (item) => item.user_id !== userId || item.weekday !== weekday,
    );
    writeJson(TEMPLATES_KEY, [...others, ...blocks]);
  },

  getStudyPlan(userId: string): StudyPlan | null {
    const rows = readJson<StudyPlan[]>(STUDY_PLAN_KEY, []);
    return rows.find((item) => item.userId === userId) ?? null;
  },
  saveStudyPlan(plan: StudyPlan) {
    const rows = readJson<StudyPlan[]>(STUDY_PLAN_KEY, []).filter((item) => item.userId !== plan.userId);
    writeJson(STUDY_PLAN_KEY, [...rows, plan]);
  },

  getAiMessages(): AiConversation[] {
    return readJson<AiConversation[]>(AI_KEY, []);
  },
  addAiMessage(message: Omit<AiConversation, 'id' | 'created_at'>): AiConversation {
    const next: AiConversation = {
      ...message,
      id: newId('ai'),
      created_at: new Date().toISOString(),
    };
    writeJson(AI_KEY, [...this.getAiMessages(), next]);
    return next;
  },

  getSessions(): StudySession[] {
    return readJson<StudySession[]>(SESSIONS_KEY, []);
  },

  getQuizAttempts(): QuizAttempt[] {
    return readJson<QuizAttempt[]>(QUIZ_KEY, []).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  setQuizAttempts(attempts: QuizAttempt[]) {
    writeJson(QUIZ_KEY, attempts);
  },
  addQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'created_at'>): QuizAttempt {
    const next: QuizAttempt = {
      ...attempt,
      id: newId('quiz'),
      created_at: new Date().toISOString(),
    };
    this.setQuizAttempts([next, ...this.getQuizAttempts()]);
    return next;
  },
};
