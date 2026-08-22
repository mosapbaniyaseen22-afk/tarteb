export type RevelationType = 'Meccan' | 'Medinan';

export type SurahMeta = {
  number: number;
  name: string;
  ayahs: number;
  revelation: RevelationType;
};

export const SURAH_LIST: SurahMeta[] = [
  { number: 1, name: 'الفاتحة', ayahs: 7, revelation: 'Meccan' },
  { number: 2, name: 'البقرة', ayahs: 286, revelation: 'Medinan' },
  { number: 3, name: 'آل عمران', ayahs: 200, revelation: 'Medinan' },
  { number: 4, name: 'النساء', ayahs: 176, revelation: 'Medinan' },
  { number: 5, name: 'المائدة', ayahs: 120, revelation: 'Medinan' },
  { number: 6, name: 'الأنعام', ayahs: 165, revelation: 'Meccan' },
  { number: 7, name: 'الأعراف', ayahs: 206, revelation: 'Meccan' },
  { number: 8, name: 'الأنفال', ayahs: 75, revelation: 'Medinan' },
  { number: 9, name: 'التوبة', ayahs: 129, revelation: 'Medinan' },
  { number: 10, name: 'يونس', ayahs: 109, revelation: 'Meccan' },
  { number: 11, name: 'هود', ayahs: 123, revelation: 'Meccan' },
  { number: 12, name: 'يوسف', ayahs: 111, revelation: 'Meccan' },
  { number: 13, name: 'الرعد', ayahs: 43, revelation: 'Medinan' },
  { number: 14, name: 'إبراهيم', ayahs: 52, revelation: 'Meccan' },
  { number: 15, name: 'الحجر', ayahs: 99, revelation: 'Meccan' },
  { number: 16, name: 'النحل', ayahs: 128, revelation: 'Meccan' },
  { number: 17, name: 'الإسراء', ayahs: 111, revelation: 'Meccan' },
  { number: 18, name: 'الكهف', ayahs: 110, revelation: 'Meccan' },
  { number: 19, name: 'مريم', ayahs: 98, revelation: 'Meccan' },
  { number: 20, name: 'طه', ayahs: 135, revelation: 'Meccan' },
  { number: 21, name: 'الأنبياء', ayahs: 112, revelation: 'Meccan' },
  { number: 22, name: 'الحج', ayahs: 78, revelation: 'Medinan' },
  { number: 23, name: 'المؤمنون', ayahs: 118, revelation: 'Meccan' },
  { number: 24, name: 'النور', ayahs: 64, revelation: 'Medinan' },
  { number: 25, name: 'الفرقان', ayahs: 77, revelation: 'Meccan' },
  { number: 26, name: 'الشعراء', ayahs: 227, revelation: 'Meccan' },
  { number: 27, name: 'النمل', ayahs: 93, revelation: 'Meccan' },
  { number: 28, name: 'القصص', ayahs: 88, revelation: 'Meccan' },
  { number: 29, name: 'العنكبوت', ayahs: 69, revelation: 'Meccan' },
  { number: 30, name: 'الروم', ayahs: 60, revelation: 'Meccan' },
  { number: 31, name: 'لقمان', ayahs: 34, revelation: 'Meccan' },
  { number: 32, name: 'السجدة', ayahs: 30, revelation: 'Meccan' },
  { number: 33, name: 'الأحزاب', ayahs: 73, revelation: 'Medinan' },
  { number: 34, name: 'سبأ', ayahs: 54, revelation: 'Meccan' },
  { number: 35, name: 'فاطر', ayahs: 45, revelation: 'Meccan' },
  { number: 36, name: 'يس', ayahs: 83, revelation: 'Meccan' },
  { number: 37, name: 'الصافات', ayahs: 182, revelation: 'Meccan' },
  { number: 38, name: 'ص', ayahs: 88, revelation: 'Meccan' },
  { number: 39, name: 'الزمر', ayahs: 75, revelation: 'Meccan' },
  { number: 40, name: 'غافر', ayahs: 85, revelation: 'Meccan' },
  { number: 41, name: 'فصلت', ayahs: 54, revelation: 'Meccan' },
  { number: 42, name: 'الشورى', ayahs: 53, revelation: 'Meccan' },
  { number: 43, name: 'الزخرف', ayahs: 89, revelation: 'Meccan' },
  { number: 44, name: 'الدخان', ayahs: 59, revelation: 'Meccan' },
  { number: 45, name: 'الجاثية', ayahs: 37, revelation: 'Meccan' },
  { number: 46, name: 'الأحقاف', ayahs: 35, revelation: 'Meccan' },
  { number: 47, name: 'محمد', ayahs: 38, revelation: 'Medinan' },
  { number: 48, name: 'الفتح', ayahs: 29, revelation: 'Medinan' },
  { number: 49, name: 'الحجرات', ayahs: 18, revelation: 'Medinan' },
  { number: 50, name: 'ق', ayahs: 45, revelation: 'Meccan' },
  { number: 51, name: 'الذاريات', ayahs: 60, revelation: 'Meccan' },
  { number: 52, name: 'الطور', ayahs: 49, revelation: 'Meccan' },
  { number: 53, name: 'النجم', ayahs: 62, revelation: 'Meccan' },
  { number: 54, name: 'القمر', ayahs: 55, revelation: 'Meccan' },
  { number: 55, name: 'الرحمن', ayahs: 78, revelation: 'Medinan' },
  { number: 56, name: 'الواقعة', ayahs: 96, revelation: 'Meccan' },
  { number: 57, name: 'الحديد', ayahs: 29, revelation: 'Medinan' },
  { number: 58, name: 'المجادلة', ayahs: 22, revelation: 'Medinan' },
  { number: 59, name: 'الحشر', ayahs: 24, revelation: 'Medinan' },
  { number: 60, name: 'الممتحنة', ayahs: 13, revelation: 'Medinan' },
  { number: 61, name: 'الصف', ayahs: 14, revelation: 'Medinan' },
  { number: 62, name: 'الجمعة', ayahs: 11, revelation: 'Medinan' },
  { number: 63, name: 'المنافقون', ayahs: 11, revelation: 'Medinan' },
  { number: 64, name: 'التغابن', ayahs: 18, revelation: 'Medinan' },
  { number: 65, name: 'الطلاق', ayahs: 12, revelation: 'Medinan' },
  { number: 66, name: 'التحريم', ayahs: 12, revelation: 'Medinan' },
  { number: 67, name: 'الملك', ayahs: 30, revelation: 'Meccan' },
  { number: 68, name: 'القلم', ayahs: 52, revelation: 'Meccan' },
  { number: 69, name: 'الحاقة', ayahs: 52, revelation: 'Meccan' },
  { number: 70, name: 'المعارج', ayahs: 44, revelation: 'Meccan' },
  { number: 71, name: 'نوح', ayahs: 28, revelation: 'Meccan' },
  { number: 72, name: 'الجن', ayahs: 28, revelation: 'Meccan' },
  { number: 73, name: 'المزمل', ayahs: 20, revelation: 'Meccan' },
  { number: 74, name: 'المدثر', ayahs: 56, revelation: 'Meccan' },
  { number: 75, name: 'القيامة', ayahs: 40, revelation: 'Meccan' },
  { number: 76, name: 'الإنسان', ayahs: 31, revelation: 'Medinan' },
  { number: 77, name: 'المرسلات', ayahs: 50, revelation: 'Meccan' },
  { number: 78, name: 'النبأ', ayahs: 40, revelation: 'Meccan' },
  { number: 79, name: 'النازعات', ayahs: 46, revelation: 'Meccan' },
  { number: 80, name: 'عبس', ayahs: 42, revelation: 'Meccan' },
  { number: 81, name: 'التكوير', ayahs: 29, revelation: 'Meccan' },
  { number: 82, name: 'الانفطار', ayahs: 19, revelation: 'Meccan' },
  { number: 83, name: 'المطففين', ayahs: 36, revelation: 'Meccan' },
  { number: 84, name: 'الانشقاق', ayahs: 25, revelation: 'Meccan' },
  { number: 85, name: 'البروج', ayahs: 22, revelation: 'Meccan' },
  { number: 86, name: 'الطارق', ayahs: 17, revelation: 'Meccan' },
  { number: 87, name: 'الأعلى', ayahs: 19, revelation: 'Meccan' },
  { number: 88, name: 'الغاشية', ayahs: 26, revelation: 'Meccan' },
  { number: 89, name: 'الفجر', ayahs: 30, revelation: 'Meccan' },
  { number: 90, name: 'البلد', ayahs: 20, revelation: 'Meccan' },
  { number: 91, name: 'الشمس', ayahs: 15, revelation: 'Meccan' },
  { number: 92, name: 'الليل', ayahs: 21, revelation: 'Meccan' },
  { number: 93, name: 'الضحى', ayahs: 11, revelation: 'Meccan' },
  { number: 94, name: 'الشرح', ayahs: 8, revelation: 'Meccan' },
  { number: 95, name: 'التين', ayahs: 8, revelation: 'Meccan' },
  { number: 96, name: 'العلق', ayahs: 19, revelation: 'Meccan' },
  { number: 97, name: 'القدر', ayahs: 5, revelation: 'Meccan' },
  { number: 98, name: 'البينة', ayahs: 8, revelation: 'Medinan' },
  { number: 99, name: 'الزلزلة', ayahs: 8, revelation: 'Medinan' },
  { number: 100, name: 'العاديات', ayahs: 11, revelation: 'Meccan' },
  { number: 101, name: 'القارعة', ayahs: 11, revelation: 'Meccan' },
  { number: 102, name: 'التكاثر', ayahs: 8, revelation: 'Meccan' },
  { number: 103, name: 'العصر', ayahs: 3, revelation: 'Meccan' },
  { number: 104, name: 'الهمزة', ayahs: 9, revelation: 'Meccan' },
  { number: 105, name: 'الفيل', ayahs: 5, revelation: 'Meccan' },
  { number: 106, name: 'قريش', ayahs: 4, revelation: 'Meccan' },
  { number: 107, name: 'الماعون', ayahs: 7, revelation: 'Meccan' },
  { number: 108, name: 'الكوثر', ayahs: 3, revelation: 'Meccan' },
  { number: 109, name: 'الكافرون', ayahs: 6, revelation: 'Meccan' },
  { number: 110, name: 'النصر', ayahs: 3, revelation: 'Medinan' },
  { number: 111, name: 'المسد', ayahs: 5, revelation: 'Meccan' },
  { number: 112, name: 'الإخلاص', ayahs: 4, revelation: 'Meccan' },
  { number: 113, name: 'الفلق', ayahs: 5, revelation: 'Meccan' },
  { number: 114, name: 'الناس', ayahs: 6, revelation: 'Meccan' },
];

export const FEATURED_SURAHS = [1, 2, 18, 36, 67, 56, 55, 112];

/** Starting page of each surah in the 604-page Madinah mushaf. Index 0 unused. */
export const SURAH_PAGE_START: number[] = [
  0,
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208,
  221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404,
  411, 415, 418, 428, 434, 440, 446, 453, 458, 467,
  477, 483, 489, 496, 499, 502, 507, 511, 515, 518,
  520, 523, 526, 528, 531, 534, 537, 542, 545, 549,
  551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
  570, 572, 574, 575, 577, 578, 580, 582, 583, 585,
  586, 587, 587, 589, 590, 591, 591, 592, 593, 594,
  595, 595, 596, 596, 597, 597, 598, 598, 599, 599,
  600, 600, 601, 601, 601, 602, 602, 602, 603, 603,
  603, 604, 604, 604,
];

export function surahNumberForPage(page: number): number {
  const safePage = Math.min(604, Math.max(1, page));
  let current = 1;
  for (let number = 1; number <= 114; number += 1) {
    if (SURAH_PAGE_START[number] <= safePage) current = number;
    else break;
  }
  return current;
}

export function surahsForPageRange(startPage: number, endPage: number): { from: SurahMeta; to: SurahMeta } {
  const from = getSurah(surahNumberForPage(startPage)) ?? getSurah(1)!;
  const to = getSurah(surahNumberForPage(endPage)) ?? getSurah(114)!;
  return { from, to };
}

export function getSurah(number: number): SurahMeta | undefined {
  return SURAH_LIST.find((item) => item.number === number);
}

export function revelationLabel(value: RevelationType): string {
  switch (value) {
    case 'Meccan':
      return 'مكية';
    case 'Medinan':
      return 'مدنية';
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}

export function normalizeArabicSearch(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
    .trim();
}
