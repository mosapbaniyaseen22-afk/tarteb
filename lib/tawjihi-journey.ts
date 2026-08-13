export type TawjihiPhase =
  | 'unknown'
  | 'foundation'
  | 'steady'
  | 'intensive'
  | 'final'
  | 'exam_week'
  | 'exam_day'
  | 'after';

export type TawjihiJourney = {
  daysLeft: number | null;
  yearProgress: number;
  phase: TawjihiPhase;
  examLabel: string | null;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  return Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24));
}

function phaseForDaysLeft(daysLeft: number): TawjihiPhase {
  if (daysLeft > 150) return 'foundation';
  if (daysLeft > 90) return 'steady';
  if (daysLeft > 45) return 'intensive';
  if (daysLeft > 14) return 'final';
  if (daysLeft > 0) return 'exam_week';
  if (daysLeft === 0) return 'exam_day';
  return 'after';
}

export function tawjihiJourney(year: number | null | undefined, now = new Date()): TawjihiJourney {
  if (!year) {
    return { daysLeft: null, yearProgress: 0, phase: 'unknown', examLabel: null };
  }

  const examDate = new Date(year, 5, 15);
  const schoolStart = new Date(year - 1, 8, 1);
  const total = Math.max(1, examDate.getTime() - schoolStart.getTime());
  const elapsed = Math.min(total, Math.max(0, now.getTime() - schoolStart.getTime()));
  const daysLeft = daysBetween(now, examDate);

  return {
    daysLeft,
    yearProgress: Math.round((elapsed / total) * 100),
    phase: phaseForDaysLeft(daysLeft),
    examLabel: `امتحانات ${year}`,
  };
}

export function tawjihiPhaseLabel(phase: TawjihiPhase) {
  switch (phase) {
    case 'unknown':
      return 'حدد سنة التوجيهي';
    case 'foundation':
      return 'بناء الأساس';
    case 'steady':
      return 'التثبيت';
    case 'intensive':
      return 'المراجعة المركّزة';
    case 'final':
      return 'اللمسات الأخيرة';
    case 'exam_week':
      return 'أسبوع الحسم';
    case 'exam_day':
      return 'يوم الامتحان';
    case 'after':
      return 'بعد الامتحانات';
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

export function tawjihiPhaseHint(phase: TawjihiPhase) {
  switch (phase) {
    case 'unknown':
      return 'أضف سنة الامتحان من ملفك ليظهر المسار';
    case 'foundation':
      return 'الآن وقت البناء بهدوء وثبات';
    case 'steady':
      return 'ثبّت فهمك ولا تترك فراغات';
    case 'intensive':
      return 'ركّز على الضعف وكرر الأسئلة';
    case 'final':
      return 'لمسات أخيرة، لا تشتت نفسك';
    case 'exam_week':
      return 'نم جيداً وراجع بخفة';
    case 'exam_day':
      return 'توكل على الله، أنت جاهز';
    case 'after':
      return 'تعبك محفوظ، تقبّل النتيجة بسكينة';
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}
