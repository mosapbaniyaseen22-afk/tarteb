import { supabase } from './supabase';

export type AdminResourceType =
  | 'material'
  | 'summary'
  | 'dossier'
  | 'ministerial_exam'
  | 'suggested_exam'
  | 'questions'
  | 'video';

export type AdminQuestion = {
  number: number;
  prompt: string;
  options: { key: string; text: string }[];
  answerKey: string | null;
};

export type AppSubscriber = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  stage: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  loggedOutAt: string | null;
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
  if (row.loggedOutAt) return 'logged_out';
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
  fileName: string | null;
  fileMime: string | null;
  externalUrl: string | null;
  extractedText: string | null;
  questions: AdminQuestion[];
  autoClassified: boolean;
  createdAt: string;
};

export const ADMIN_RESOURCE_TYPES: { id: AdminResourceType; label: string }[] = [
  { id: 'material', label: 'مواد / شرح' },
  { id: 'summary', label: 'ملخصات' },
  { id: 'dossier', label: 'دوسيات' },
  { id: 'ministerial_exam', label: 'امتحانات وزارية' },
  { id: 'suggested_exam', label: 'امتحانات مقترحة' },
  { id: 'questions', label: 'أسئلة' },
  { id: 'video', label: 'فيديوهات' },
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
      return 'مادة / شرح';
    case 'summary':
      return 'ملخص';
    case 'dossier':
      return 'دوسية';
    case 'ministerial_exam':
      return 'امتحان وزاري';
    case 'suggested_exam':
      return 'امتحان مقترح';
    case 'questions':
      return 'أسئلة';
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

const RESOURCES_CACHE_KEY = 'labib-admin-resources';

export async function loadAdminResources(): Promise<AdminResource[]> {
  try {
    const response = await fetch('/api/admin/resources', { cache: 'no-store' });
    if (response.ok) {
      const payload = (await response.json()) as { items?: AdminResource[] };
      const items = (payload.items ?? []).map((item) => ({
        ...item,
        extractedText: item.extractedText ?? null,
        questions: Array.isArray(item.questions) ? item.questions : [],
        autoClassified: Boolean(item.autoClassified),
      }));
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
    return raw ? (JSON.parse(raw) as AdminResource[]).map((item) => ({
      ...item,
      extractedText: item.extractedText ?? null,
      questions: Array.isArray(item.questions) ? item.questions : [],
      autoClassified: Boolean(item.autoClassified),
    })) : [];
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
