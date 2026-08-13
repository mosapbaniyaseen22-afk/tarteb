import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const REGIONS = [
  'عمان', 'إربد', 'الزرقاء', 'البلقاء', 'المفرق', 'جرش', 'عجلون', 'مأدبا',
  'الكرك', 'الطفيلة', 'معان', 'العقبة',
];

export const STUDY_FIELDS = [
  { id: 'medical', label: 'الطبي', icon: '🩺', color: '#059669', description: 'طب، صيدلة، طب أسنان، تمريض' },
  { id: 'engineering', label: 'الهندسة والتكنولوجيا', icon: '⚙️', color: '#2563EB', description: 'هندسة، حاسوب، تكنولوجيا' },
  { id: 'business', label: 'الأعمال', icon: '💼', color: '#0891B2', description: 'إدارة، اقتصاد، محاسبة' },
  { id: 'arts', label: 'اللغات والعلوم الإنسانية والاجتماعية', icon: '🌍', color: '#D97706', description: 'آداب، لغات، علوم اجتماعية' },
];

export const FIELD_SUBJECTS: Record<string, { core: string[]; electives: string[] }> = {
  medical: {
    core: ['أحياء', 'كيمياء', 'إنجليزي متقدم'],
    electives: ['علوم أرض', 'فيزياء', 'رياضيات'],
  },
  engineering: {
    core: ['رياضيات', 'فيزياء', 'إنجليزي متقدم'],
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
