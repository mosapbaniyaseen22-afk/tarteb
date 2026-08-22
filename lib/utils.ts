import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REGIONS = [
  'عمان', 'إربد', 'الزرقاء', 'البلقاء', 'المفرق', 'جرش', 'عجلون', 'مأدبا',
  'الكرك', 'الطفيلة', 'معان', 'العقبة',
];

export const FIRST_YEAR_SUBJECTS = ['الرياضيات', 'اللغة العربية', 'التربية الإسلامية', 'تاريخ الأردن'];

export const STUDY_FIELDS = [
  { id: 'medical', label: 'الطبي', icon: '🩺', color: '#059669', description: 'طب، صيدلة، طب أسنان، تمريض' },
  { id: 'engineering', label: 'الهندسة والتكنولوجيا', icon: '⚙️', color: '#2563EB', description: 'هندسة، حاسوب، تكنولوجيا' },
  { id: 'business', label: 'الأعمال', icon: '💼', color: '#0891B2', description: 'إدارة، اقتصاد، محاسبة' },
  { id: 'arts', label: 'اللغات والعلوم الإنسانية والاجتماعية', icon: '🌍', color: '#D97706', description: 'آداب، لغات، علوم اجتماعية' },
];

export const FIELD_SUBJECTS: Record<string, { core: string[]; electives: string[] }> = {
  medical: {
    core: ['أحياء', 'كيمياء', 'إنجليزي متقدم'],
    electives: ['علوم أرض', 'فيزياء', 'الرياضيات'],
  },
  engineering: {
    core: ['الرياضيات', 'فيزياء', 'إنجليزي متقدم'],
    electives: ['أحياء', 'كيمياء', 'علوم أرض'],
  },
  business: {
    core: ['رياضيات أعمال', 'ثقافة مالية', 'إنجليزي متقدم'],
    electives: ['علم الاجتماع', 'علم النفس', 'فلسفة', 'تاريخ', 'جغرافيا', 'دين تخصص', 'عربي تخصص'],
  },
  arts: {
    core: ['عربي تخصص', 'دين تخصص', 'إنجليزي متقدم'],
    electives: ['علم الاجتماع', 'علم النفس', 'الفلسفة', 'ثقافة مالية', 'تاريخ', 'جغرافيا'],
  },
};

export function getTawjihiYears(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear + 1, currentYear + 2];
}

export type TawjihiStage = 'tawjihi_first' | 'tawjihi_second';

export function normalizeTawjihiStage(
  value: string | null | undefined,
  fallback: TawjihiStage = 'tawjihi_first',
): TawjihiStage {
  switch (value) {
    case 'tawjihi_second':
    case 'second_year':
      return 'tawjihi_second';
    case 'tawjihi_first':
    case 'first_year':
      return 'tawjihi_first';
    case 'tawjihi':
    case 'other':
    case null:
    case undefined:
    case '':
      return fallback;
    default:
      return fallback;
  }
}

export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    tawjihi: 'التوجيهي',
    tawjihi_first: 'توجيهي سنة أولى',
    tawjihi_second: 'توجيهي سنة ثانية',
    first_year: 'السنة الأولى',
    second_year: 'السنة الثانية',
    other: 'أخرى',
  };
  return labels[stage] || stage;
}

type CatalogSubject = {
  id: string;
  name_ar: string;
  stage?: string | null;
  field?: string | null;
};

function subjectLabelKey(value: string): string {
  return value.replace(/^ال/, '').replace(/\s+/g, '').trim();
}

export function subjectNamesMatch(left: string, right: string): boolean {
  return left === right || subjectLabelKey(left) === subjectLabelKey(right);
}

export function pickCatalogSubjectIds(
  catalog: CatalogSubject[],
  names: string[],
  stage: TawjihiStage,
  field?: string | null,
): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const matches = catalog.filter((subject) => subjectNamesMatch(subject.name_ar, name));
    const preferred =
      matches.find((subject) => normalizeTawjihiStage(subject.stage, stage) === stage && subject.field === field)
      ?? matches.find((subject) => normalizeTawjihiStage(subject.stage, stage) === stage && (subject.field === 'all' || !subject.field))
      ?? matches.find((subject) => normalizeTawjihiStage(subject.stage, stage) === stage)
      ?? matches.find((subject) => Boolean(field) && subject.field === field)
      ?? matches.find((subject) => subject.name_ar === name)
      ?? matches[0];
    if (preferred && !ids.includes(preferred.id)) ids.push(preferred.id);
  }
  return ids;
}

export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    medical: 'الطبي',
    engineering: 'الهندسة والتكنولوجيا',
    business: 'الأعمال',
    arts: 'اللغات والعلوم الإنسانية والاجتماعية',
  };
  return labels[field] || field;
}

export function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const period = hour >= 12 ? 'م' : 'ص';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${period}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  return 'مساء الخير';
}
