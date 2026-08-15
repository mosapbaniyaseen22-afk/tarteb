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
};

export const SUBSCRIBER_ONLINE_MS = 5 * 60 * 1000;

export function isSubscriberOnline(lastSeenAt: string, now = Date.now()) {
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) return false;
  return now - seen < SUBSCRIBER_ONLINE_MS;
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

export function isAdminEmail(email: string | null | undefined) {
  return (email ?? '').trim().toLowerCase() === ADMIN_EMAIL;
}

export async function activateAdminSession(accessToken: string) {
  const response = await fetch('/api/admin/google', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.ok;
}
