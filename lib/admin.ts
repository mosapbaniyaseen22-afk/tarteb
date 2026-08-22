import { supabase } from './supabase';
import { FIRST_YEAR_SUBJECTS, normalizeTawjihiStage, type TawjihiStage } from './utils';

export type AdminResourceType =
  | 'material'
  | 'summary'
  | 'dossier'
  | 'ministerial_exam'
  | 'suggested_exam'
  | 'electronic_exam'
  | 'questions'
  | 'video';

export const ADMIN_RESOURCE_TYPE_IDS: AdminResourceType[] = [
  'material',
  'summary',
  'dossier',
  'ministerial_exam',
  'suggested_exam',
  'electronic_exam',
  'questions',
  'video',
];

export function isAdminResourceType(value: string): value is AdminResourceType {
  return ADMIN_RESOURCE_TYPE_IDS.includes(value as AdminResourceType);
}

export type AdminQuestion = {
  number: number;
  prompt: string;
  options: { key: string; text: string }[];
  answerKey: string | null;
  unit: string | null;
  lesson: string | null;
};

export function normalizeAdminQuestion(
  question: Partial<AdminQuestion> & Pick<AdminQuestion, 'number' | 'prompt'>,
): AdminQuestion {
  return {
    number: Number(question.number) || 0,
    prompt: String(question.prompt ?? '').trim(),
    options: Array.isArray(question.options) ? question.options : [],
    answerKey: question.answerKey ?? null,
    unit: typeof question.unit === 'string' && question.unit.trim() ? question.unit.trim() : null,
    lesson: typeof question.lesson === 'string' && question.lesson.trim() ? question.lesson.trim() : null,
  };
}

export type AppSubscriber = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  stage: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  loggedOutAt: string | null;
  subscribed: boolean;
  subscriptionExpiresAt: string | null;
};

export type SubscriberPresence = 'online' | 'logged_out' | 'away';

export const SUBSCRIBER_ONLINE_MS = 5 * 60 * 1000;

export function isSubscriberOnline(lastSeenAt: string, now = Date.now()) {
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) return false;
  return now - seen < SUBSCRIBER_ONLINE_MS;
}

export function getSubscriberPresence(
  row: Pick<AppSubscriber, 'lastSeenAt' | 'loggedOutAt'>,
  now = Date.now(),
): SubscriberPresence {
  const loggedOut = row.loggedOutAt ? new Date(row.loggedOutAt).getTime() : NaN;
  const seen = new Date(row.lastSeenAt).getTime();
  if (Number.isFinite(loggedOut) && (!Number.isFinite(seen) || loggedOut >= seen)) {
    return 'logged_out';
  }
  if (isSubscriberOnline(row.lastSeenAt, now)) return 'online';
  return 'away';
}

export type AdminResource = {
  id: string;
  type: AdminResourceType;
  title: string;
  description: string;
  subjectName: string;
  year: number | null;
  stage: TawjihiStage;
  fileName: string | null;
  fileMime: string | null;
  filePath: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  extractedText: string | null;
  questions: AdminQuestion[];
  autoClassified: boolean;
  published: boolean;
  createdAt: string;
};

export function normalizeAdminResource(item: Partial<AdminResource> & Pick<AdminResource, 'id' | 'title'>): AdminResource {
  const type = isAdminResourceType(String(item.type ?? '')) ? item.type : 'material';
  return {
    id: item.id,
    type,
    title: String(item.title ?? '').trim() || 'محتوى',
    description: String(item.description ?? '').trim(),
    subjectName: String(item.subjectName ?? 'الكل').trim() || 'الكل',
    year: typeof item.year === 'number' && Number.isFinite(item.year) ? item.year : null,
    stage: normalizeTawjihiStage(item.stage),
    fileName: item.fileName ?? null,
    fileMime: item.fileMime ?? null,
    filePath: item.filePath ?? null,
    fileUrl: item.fileUrl ?? null,
    externalUrl: item.externalUrl ?? null,
    extractedText: item.extractedText ?? null,
    questions: (Array.isArray(item.questions) ? item.questions : []).map(normalizeAdminQuestion),
    autoClassified: Boolean(item.autoClassified),
    published: item.published !== false,
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export const ADMIN_RESOURCE_TYPES: { id: AdminResourceType; label: string; hint: string }[] = [
  { id: 'material', label: 'شرح المواد', hint: 'دروس وشرح يظهر في صفحة المادة' },
  { id: 'summary', label: 'ملخصات', hint: 'تلخيصات سريعة للمراجعة' },
  { id: 'dossier', label: 'دوسيات', hint: 'دوسيات شاملة للطلاب' },
  { id: 'questions', label: 'بنك الأسئلة', hint: 'أسئلة الدروس واختبر نفسك' },
  { id: 'ministerial_exam', label: 'أسئلة وزارية', hint: 'امتحانات الوزارة السابقة' },
  { id: 'suggested_exam', label: 'أسئلة مقترحة', hint: 'نماذج امتحانات مقترحة' },
  { id: 'electronic_exam', label: 'امتحانات إلكترونية', hint: 'اختبار داخل التطبيق بوضع دائرة' },
  { id: 'video', label: 'فيديوهات', hint: 'شرح فيديو أو رابط يوتيوب' },
];

export const ADMIN_SUBJECT_OPTIONS = [
  'الكل',
  'الرياضيات',
  'اللغة العربية',
  'التربية الإسلامية',
  'تاريخ الأردن',
  'أحياء',
  'كيمياء',
  'فيزياء',
  'إنجليزي متقدم',
  'علوم أرض',
  'رياضيات أعمال',
  'ثقافة مالية',
  'علم الاجتماع',
  'علم النفس',
  'فلسفة',
  'الفلسفة',
  'تاريخ',
  'جغرافيا',
  'دين تخصص',
  'عربي تخصص',
];

export function resourceTypeLabel(type: AdminResourceType): string {
  switch (type) {
    case 'material':
      return 'شرح مادة';
    case 'summary':
      return 'ملخص';
    case 'dossier':
      return 'دوسية';
    case 'ministerial_exam':
      return 'أسئلة وزارية';
    case 'suggested_exam':
      return 'أسئلة مقترحة';
    case 'electronic_exam':
      return 'امتحان إلكتروني';
    case 'questions':
      return 'بنك أسئلة';
    case 'video':
      return 'فيديو';
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function resourceMatchesSubject(resource: AdminResource, subjectName: string): boolean {
  if (resource.subjectName === 'الكل') return true;
  return resource.subjectName === subjectName;
}

export function resourceMatchesStage(resource: AdminResource, stage: TawjihiStage | null | undefined): boolean {
  if (!stage) return true;
  return resource.stage === stage;
}

export function subjectsForPublishStage(stage: TawjihiStage): string[] {
  if (stage === 'tawjihi_first') return ['الكل', ...FIRST_YEAR_SUBJECTS];
  return ADMIN_SUBJECT_OPTIONS;
}

export function resourceFileHref(resource: AdminResource) {
  if (resource.fileUrl) return resource.fileUrl;
  if (resource.fileName) return adminFileUrl(resource.id);
  return null;
}

const RESOURCES_CACHE_KEY = 'labib-admin-resources';

export async function loadAdminResources(): Promise<AdminResource[]> {
  try {
    const response = await fetch(`/api/admin/resources?t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const payload = (await response.json()) as { items?: AdminResource[] };
      const items = (payload.items ?? []).map((item) => normalizeAdminResource(item));
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RESOURCES_CACHE_KEY, JSON.stringify(items));
      }
      return items;
    }
  } catch (error) {
    console.error(error);
  }

  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RESOURCES_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AdminResource[]).map((item) => normalizeAdminResource(item)) : [];
  } catch {
    return [];
  }
}

export function adminFileUrl(id: string) {
  return `/api/admin/files/${id}`;
}

export const ADMIN_EMAIL = 'ahmadqudomi777@gmail.com';

export function emailsFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ identity_data?: Record<string, unknown> | null }> | null;
} | null | undefined): string[] {
  if (!user) return [];
  const values = [
    user.email,
    user.user_metadata?.email,
    ...(user.identities ?? []).map((item) => item.identity_data?.email),
  ];
  return [...new Set(
    values
      .map((value) => String(value ?? '').trim().toLowerCase())
      .filter(Boolean),
  )];
}

export function isAdminEmail(email: string | null | undefined) {
  return emailsFromUser({ email }).includes(ADMIN_EMAIL);
}

export function isAdminUser(user: Parameters<typeof emailsFromUser>[0]) {
  return emailsFromUser(user).includes(ADMIN_EMAIL);
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

export async function adminRequest(input: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers, credentials: 'include' });
}

export async function activateAdminSession(accessToken: string) {
  const response = await adminRequest('/api/admin/google', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken }),
  });
  return response.ok;
}
