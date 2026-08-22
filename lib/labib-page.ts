export type LabibPageContext = {
  path: string;
  title: string;
  hint: string;
};

export function labibPageInfo(pathname: string): LabibPageContext {
  if (pathname.startsWith('/scheduler')) {
    return { path: pathname, title: 'تنظيم الوقت', hint: 'الطالب يرتب جدوله وخطته الدراسية.' };
  }
  if (pathname.startsWith('/subjects')) {
    return { path: pathname, title: 'المواد', hint: 'الطالب يتصفح مواده ودروسه.' };
  }
  if (pathname.startsWith('/exams')) {
    return { path: pathname, title: 'الامتحانات', hint: 'الطالب يراجع الامتحانات والدوسيات.' };
  }
  if (pathname.startsWith('/practice')) {
    return { path: pathname, title: 'اختبر نفسك', hint: 'الطالب يتمرن على أسئلة.' };
  }
  if (pathname.startsWith('/journal')) {
    return { path: pathname, title: 'مذكراتي', hint: 'الطالب يكتب بمذكراته الخاصة.' };
  }
  if (pathname.startsWith('/quran')) {
    return { path: pathname, title: 'ورد القرآن', hint: 'الطالب على لوحة القرآن والأذكار.' };
  }
  if (pathname.startsWith('/statistics')) {
    return { path: pathname, title: 'الإحصائيات', hint: 'الطالب يشوف تقدمه الدراسي.' };
  }
  if (pathname.startsWith('/profile')) {
    return { path: pathname, title: 'الملف الشخصي', hint: 'الطالب على حسابه ومواده المسجلة.' };
  }
  if (pathname.startsWith('/tasks')) {
    return { path: pathname, title: 'المهام', hint: 'الطالب يتابع مهامه.' };
  }
  if (pathname.startsWith('/ai')) {
    return { path: pathname, title: 'لبيب AI', hint: 'الطالب في صفحة المحادثة الكاملة.' };
  }
  if (pathname.startsWith('/subscribe') || pathname.startsWith('/activate')) {
    return { path: pathname, title: 'الاشتراك', hint: 'الطالب يشوف الاشتراك.' };
  }
  if (pathname.startsWith('/dashboard')) {
    return { path: pathname, title: 'الرئيسية', hint: 'الطالب على لوحة التحكم.' };
  }
  return { path: pathname || '/', title: 'التطبيق', hint: 'الطالب داخل منصة لبيب.' };
}

export function labibQuickPrompts(pathname: string): string[] {
  if (pathname.startsWith('/scheduler')) {
    return ['شو شايف على الشاشة؟', 'علق على جدولي'];
  }
  if (pathname.startsWith('/subjects')) {
    return ['شو ظاهر قدامي؟', 'كيف أراجع المادة؟'];
  }
  if (pathname.startsWith('/journal')) {
    return ['علق على مذكرتي', 'ساعدني أرتب أفكاري'];
  }
  if (pathname.startsWith('/quran')) {
    return ['شو شايف بوردي؟', 'نصيحة للختمة'];
  }
  if (pathname.startsWith('/practice') || pathname.startsWith('/exams')) {
    return ['علق على اللي قدامي', 'كيف أذاكر للامتحان؟'];
  }
  return ['شو شايف على الشاشة؟', 'شو أركز اليوم؟'];
}
