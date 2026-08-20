import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const invalidSupabaseHost = Boolean(
  supabaseUrl?.includes('pgvakdzy') || supabaseUrl?.includes('pgvakdzyjybybfkzlywa.supabase.co')
);
const useLocalFallback = invalidSupabaseHost || !supabaseUrl || !supabaseAnonKey;

function randomId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const defaultSubjects = [
  { id: 'math', name: 'Mathematics', name_ar: 'الرياضيات', stage: 'علمي', field: 'علوم', color: '#2563EB' },
  { id: 'physics', name: 'Physics', name_ar: 'الفيزياء', stage: 'علمي', field: 'علوم', color: '#14B8A6' },
  { id: 'arabic', name: 'Arabic', name_ar: 'اللغة العربية', stage: 'أدبي', field: 'لغات', color: '#F59E0B' },
  { id: 'english', name: 'English', name_ar: 'اللغة الإنجليزية', stage: 'العام', field: 'لغات', color: '#8B5CF6' },
  { id: 'biology', name: 'Biology', name_ar: 'الأحياء', stage: 'علمي', field: 'علوم', color: '#0EA5E9' },
];

const demoUserId = 'demo-user';
const demoUser = {
  id: demoUserId,
  email: 'demo@labib.local',
  user_metadata: { full_name: 'طالب تجريبي', avatar_url: null },
};

const demoProfile = {
  id: demoUserId,
  full_name: 'طالب تجريبي',
  region: 'الوسط',
  stage: 'علمي',
  tawjihi_year: 2027,
  study_field: 'علوم',
  avatar_url: null,
  onboarding_complete: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const localDatabase = {
  users: [clone(demoUser)],
  profiles: [clone(demoProfile)],
  subjects: clone(defaultSubjects),
  user_subjects: [
    {
      id: 'us_1',
      user_id: demoUserId,
      subject_id: 'math',
      progress: 0,
      subjects: defaultSubjects.find((s) => s.id === 'math'),
    },
  ],
  tasks: [
    {
      id: 'task_1',
      user_id: demoUserId,
      title: 'مراجعة الرياضيات',
      subject_id: 'math',
      subject_name: 'الرياضيات',
      task_date: new Date().toISOString().split('T')[0],
      start_time: '17:00',
      end_time: '18:00',
      duration_minutes: 60,
      kind: 'study',
      priority: 'high',
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  ],
  schedule_entries: [
    {
      id: 'sched_1',
      user_id: demoUserId,
      schedule_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '10:30',
      activity: 'مراجعة الرياضيات',
      activity_type: 'study',
      subject_name: 'الرياضيات',
      color: '#2563EB',
      task_id: null,
      completed: false,
    },
  ],
  user_routines: [],
  schedule_preferences: [],
  schedule_templates: [],
  quran_progress: [],
  notes: [],
  bookmarks: [],
  ai_conversations: [],
  study_sessions: [],
};

function createLocalQueryBuilder(table: keyof typeof localDatabase) {
  const predicates: Array<(row: any) => boolean> = [];
  let orderBy: { field: string; ascending: boolean } | null = null;
  let limitCount: number | null = null;
  let singleMode = false;

  const execute = async () => {
    let rows = clone(localDatabase[table]);

    for (const predicate of predicates) {
      rows = rows.filter(predicate);
    }

    if (orderBy) {
      rows.sort((a, b) => {
        const left = a[orderBy.field];
        const right = b[orderBy.field];
        if (left === right) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return orderBy.ascending ? (left > right ? 1 : -1) : left > right ? -1 : 1;
      });
    }

    if (limitCount !== null) rows = rows.slice(0, limitCount);

    if (singleMode) {
      return { data: rows[0] ?? null, error: null };
    }

    return { data: rows, error: null };
  };

  const builder: any = {
    select() {
      return builder;
    },
    eq(field: string, value: any) {
      predicates.push((row: any) => row[field] === value);
      return builder;
    },
    order(field: string, opts: { ascending?: boolean } = {}) {
      orderBy = { field, ascending: opts.ascending ?? true };
      return builder;
    },
    limit(count: number) {
      limitCount = count;
      return builder;
    },
    maybeSingle() {
      singleMode = true;
      return builder;
    },
    insert(payload: any) {
      const rows = Array.isArray(payload) ? payload : [payload];
      const inserted = rows.map((item) => {
        const row = { id: item.id || randomId(table), ...item };
        localDatabase[table].push(row);
        return clone(row);
      });
      return Promise.resolve({ data: inserted, error: null });
    },
    upsert(payload: any) {
      const rows = Array.isArray(payload) ? payload : [payload];
      const results = rows.map((item) => {
        const id = item.id || randomId(table);
        const existingIndex = localDatabase[table].findIndex((row: any) => row.id === id);
        if (existingIndex >= 0) {
          localDatabase[table][existingIndex] = { ...localDatabase[table][existingIndex], ...item };
        } else {
          localDatabase[table].push({ id, ...item });
        }
        return clone(localDatabase[table].find((row: any) => row.id === id));
      });
      return Promise.resolve({ data: results, error: null });
    },
    update(payload: any) {
      const updated: any[] = [];
      localDatabase[table] = localDatabase[table].map((row: any) => {
        if (predicates.every((predicate) => predicate(row))) {
          const next = { ...row, ...payload };
          updated.push(clone(next));
          return next;
        }
        return row;
      });
      return Promise.resolve({ data: updated, error: null });
    },
    delete() {
      const removed: any[] = [];
      localDatabase[table] = localDatabase[table].filter((row: any) => {
        if (predicates.every((predicate) => predicate(row))) {
          removed.push(clone(row));
          return false;
        }
        return true;
      });
      return Promise.resolve({ data: removed, error: null });
    },
    then(onFulfilled: any, onRejected: any) {
      return execute().then(onFulfilled, onRejected);
    },
    catch(onRejected: any) {
      return execute().catch(onRejected);
    },
  };

  return builder;
}

function createLocalSupabase() {
  let currentSession: any = null;
  const listeners: Array<(event: string, session: any) => void> = [];

  const broadcast = (event: string) => {
    for (const listener of listeners) {
      listener(event, currentSession);
    }
  };

  const createSession = (user: any) => {
    currentSession = { user };
    broadcast('SIGNED_IN');
    return currentSession;
  };

  const auth = {
    getSession: async () => ({ data: { session: currentSession }, error: null }),
    onAuthStateChange: (_callback: any) => {
      listeners.push(_callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = listeners.indexOf(_callback);
              if (index >= 0) listeners.splice(index, 1);
            },
          },
        },
      };
    },
    signInWithOAuth: async () => {
      const user = clone(demoUser);
      createSession(user);
      return { data: { user, session: currentSession }, error: null };
    },
    signUp: async ({ email, password, options }: any) => {
      const id = randomId('user');
      const user = {
        id,
        email,
        user_metadata: {
          full_name: options?.data?.full_name || email.split('@')[0],
          avatar_url: options?.data?.avatar_url ?? null,
        },
      };
      localDatabase.users.push(user);
      localDatabase.profiles.push({
        id,
        full_name: user.user_metadata.full_name,
        region: null,
        stage: null,
        tawjihi_year: null,
        study_field: null,
        avatar_url: user.user_metadata.avatar_url,
        onboarding_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      createSession(user);
      return { data: { user, session: currentSession }, error: null };
    },
    signInWithPassword: async ({ email }: any) => {
      const user = localDatabase.users.find((u: any) => u.email === email) ?? demoUser;
      createSession(user);
      return { data: { user, session: currentSession }, error: null };
    },
    signInWithIdToken: async (opts: any = {}) => {
      const incoming = opts?.user;
      const user = incoming
        ? {
            id: incoming.id || randomId('user'),
            email: incoming.email || `${randomId('user')}@labib.local`,
            user_metadata: {
              full_name: incoming.user_metadata?.full_name || incoming.email?.split('@')[0] || 'طالب',
              avatar_url: incoming.user_metadata?.avatar_url ?? null,
            },
          }
        : clone(demoUser);

      if (!localDatabase.users.some((row: any) => row.id === user.id)) {
        localDatabase.users.push(clone(user));
      }
      if (!localDatabase.profiles.some((row: any) => row.id === user.id)) {
        localDatabase.profiles.push({
          id: user.id,
          full_name: user.user_metadata.full_name,
          region: null,
          stage: null,
          tawjihi_year: null,
          study_field: null,
          avatar_url: user.user_metadata.avatar_url,
          onboarding_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      createSession(user);
      return { data: { user, session: currentSession }, error: null };
    },
    exchangeCodeForSession: async () => ({
      data: { session: currentSession },
      error: currentSession ? null : { message: 'No session to exchange' },
    }),
    signOut: async () => {
      currentSession = null;
      broadcast('SIGNED_OUT');
      return { error: null };
    },
    getUser: async () => {
      if (!currentSession?.user) {
        return { data: { user: null }, error: { message: 'Not authenticated' } };
      }
      return { data: { user: currentSession.user }, error: null };
    },
  };

  return {
    from: (table: keyof typeof localDatabase) => createLocalQueryBuilder(table),
    auth,
  };
}

export const supabase = useLocalFallback
  ? createLocalSupabase()
  : createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

export const isLocalSupabase = useLocalFallback;

export type Profile = {
  id: string;
  full_name: string | null;
  region: string | null;
  stage: string | null;
  tawjihi_year: number | null;
  study_field: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: string;
  name: string;
  name_ar: string;
  stage: string | null;
  field: string | null;
  color: string;
  icon: string;
};

export type UserSubject = {
  id: string;
  user_id: string;
  subject_id: string;
  progress: number;
  subjects: Subject;
};

export type TaskKind = 'study' | 'sport' | 'quran' | 'custom';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  subject_id: string | null;
  subject_name: string | null;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  kind: TaskKind;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  created_at: string;
};

export function normalizeTaskKind(value: string | null | undefined, title = '', subjectName: string | null = null): TaskKind {
  switch (value) {
    case 'study':
    case 'sport':
    case 'quran':
    case 'custom':
      return value;
    default: {
      const haystack = `${title} ${subjectName ?? ''}`;
      if (haystack.includes('رياض')) return 'sport';
      if (haystack.includes('قرآن')) return 'quran';
      if (subjectName) return 'study';
      return 'custom';
    }
  }
}

export type ScheduleEntry = {
  id: string;
  user_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  activity: string;
  activity_type: string;
  subject_name: string | null;
  color: string;
  task_id: string | null;
  completed: boolean;
};

export type ScheduleTemplateBlock = {
  id: string;
  user_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  activity: string;
  activity_type: string;
  subject_name: string | null;
  color: string;
  task_id: string | null;
  sort_index: number;
};

export type RoutineIcon = 'sleep' | 'school' | 'center' | 'sport' | 'custom';

export type Routine = {
  id: string;
  user_id: string;
  title: string;
  icon: RoutineIcon;
  start_time: string;
  end_time: string;
  weekdays: number[];
  created_at: string;
};

export function routineNeedsDays(icon: RoutineIcon): boolean {
  switch (icon) {
    case 'school':
    case 'center':
      return true;
    case 'sleep':
    case 'sport':
    case 'custom':
      return false;
    default: {
      const exhaustive: never = icon;
      return exhaustive;
    }
  }
}

export function normalizeWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export type ScheduleMode = 'same' | 'different' | 'custom';

export function normalizeScheduleMode(value: string | null | undefined): ScheduleMode {
  switch (value) {
    case 'same':
    case 'different':
    case 'custom':
      return value;
    case 'manual':
      return 'custom';
    default:
      return 'different';
  }
}

export function weekdayUsesRepeatingTemplate(
  mode: ScheduleMode,
  customDays: number[],
  weekday: number,
): boolean {
  return repeatingWeekdays(mode, customDays).includes(weekday);
}

export function repeatingWeekdays(mode: ScheduleMode, customDays: number[]): number[] {
  switch (mode) {
    case 'same':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'custom': {
      const unique: number[] = [];
      for (const day of customDays) {
        if (day >= 0 && day <= 6 && !unique.includes(day)) unique.push(day);
      }
      return unique;
    }
    case 'different':
      return [];
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
}

export function normalizePreferences(prefs: SchedulePreferences): SchedulePreferences {
  return {
    ...prefs,
    schedule_mode: normalizeScheduleMode(prefs.schedule_mode),
    custom_days: Array.isArray(prefs.custom_days)
      ? prefs.custom_days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [],
  };
}

export type SchedulePreferences = {
  id: string;
  user_id: string;
  wake_time: string;
  sleep_time: string;
  notes: string;
  schedule_mode: ScheduleMode;
  custom_days: number[];
  break_enabled: boolean;
  updated_at: string;
};

export type QuranProgress = {
  id: string;
  user_id: string;
  progress_date: string;
  surah_name: string;
  pages_read: number;
  target_pages: number;
  completed: boolean;
};

export type StudySession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  subject_name: string | null;
  duration_minutes: number;
  session_date: string;
  created_at: string;
};

export type QuizAttempt = {
  id: string;
  user_id: string;
  subject_name: string;
  resource_id: string | null;
  correct: number;
  total: number;
  attempt_date: string;
  created_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type AiConversation = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};
