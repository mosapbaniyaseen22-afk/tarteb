export type AdhkarCategoryId = 'morning' | 'evening' | 'study' | 'sleep' | 'prayer';

export type AdhkarItem = {
  id: string;
  text: string;
  repeat: number;
  audio?: string | null;
  source?: string;
};

export type AdhkarCategory = {
  id: AdhkarCategoryId;
  label: string;
  hint: string;
  hisnIds: number[];
};

export const ADHKAR_CATEGORIES: AdhkarCategory[] = [
  { id: 'morning', label: 'أذكار الصباح', hint: 'من حصن المسلم', hisnIds: [27] },
  { id: 'evening', label: 'أذكار المساء', hint: 'من حصن المسلم', hisnIds: [27] },
  { id: 'study', label: 'أذكار المذاكرة', hint: 'للتركيز والبركة في العلم', hisnIds: [34, 129] },
  { id: 'sleep', label: 'أذكار النوم', hint: 'قبل النوم', hisnIds: [28] },
  { id: 'prayer', label: 'بعد الصلاة', hint: 'الأذكار بعد السلام', hisnIds: [25] },
];

export const STUDY_ADHKAR: AdhkarItem[] = [
  {
    id: 'study-1',
    text: 'رَبِّ زِدْنِي عِلْمًا',
    repeat: 3,
    source: 'طه: 114',
  },
  {
    id: 'study-2',
    text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    repeat: 1,
    source: 'حصن المسلم',
  },
  {
    id: 'study-3',
    text: 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي، وَعَلِّمْنِي مَا يَنْفَعُنِي، وَزِدْنِي عِلْمًا',
    repeat: 1,
    source: 'الترمذي وابن ماجه',
  },
  {
    id: 'study-4',
    text: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي',
    repeat: 1,
    source: 'طه: 25-28',
  },
  {
    id: 'study-5',
    text: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا',
    repeat: 1,
    source: 'ابن حبان',
  },
  {
    id: 'study-6',
    text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ، وَمِنْ قَلْبٍ لَا يَخْشَعُ، وَمِنْ نَفْسٍ لَا تَشْبَعُ، وَمِنْ دَعْوَةٍ لَا يُسْتَجَابُ لَهَا',
    repeat: 1,
    source: 'مسلم',
  },
];

export const FALLBACK_ADHKAR: Record<AdhkarCategoryId, AdhkarItem[]> = {
  morning: [
    {
      id: 'm-1',
      text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ. اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ... (آية الكرسي)',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 'm-2',
      text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 'm-3',
      text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 'm-4',
      text: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ... (سيد الاستغفار)',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 'm-5',
      text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
      repeat: 3,
      source: 'حصن المسلم',
    },
    {
      id: 'm-6',
      text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      repeat: 100,
      source: 'حصن المسلم',
    },
    {
      id: 'm-7',
      text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
      repeat: 1,
      source: 'حصن المسلم',
    },
  ],
  evening: [
    {
      id: 'e-1',
      text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 'e-2',
      text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 'e-3',
      text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
      repeat: 3,
      source: 'حصن المسلم',
    },
    {
      id: 'e-4',
      text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
      repeat: 3,
      source: 'حصن المسلم',
    },
    {
      id: 'e-5',
      text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      repeat: 100,
      source: 'حصن المسلم',
    },
  ],
  study: STUDY_ADHKAR,
  sleep: [
    {
      id: 's-1',
      text: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 's-2',
      text: 'اللَّهُمَّ بِاسْمِكَ أَحْيَا وَأَمُوتُ',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 's-3',
      text: 'آيَةُ الْكُرْسِيِّ ثُمَّ النَّوْم',
      repeat: 1,
      source: 'حصن المسلم',
    },
  ],
  prayer: [
    {
      id: 'p-1',
      text: 'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ. اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
      repeat: 1,
      source: 'حصن المسلم',
    },
    {
      id: 'p-2',
      text: 'سُبْحَانَ اللَّهِ',
      repeat: 33,
      source: 'حصن المسلم',
    },
    {
      id: 'p-3',
      text: 'الْحَمْدُ لِلَّهِ',
      repeat: 33,
      source: 'حصن المسلم',
    },
    {
      id: 'p-4',
      text: 'اللَّهُ أَكْبَرُ',
      repeat: 33,
      source: 'حصن المسلم',
    },
    {
      id: 'p-5',
      text: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
      repeat: 1,
      source: 'حصن المسلم',
    },
  ],
};

export type TasbihPreset = {
  id: string;
  text: string;
  target: number;
};

export const TASBIH_PRESETS: TasbihPreset[] = [
  { id: 'subhan', text: 'سُبْحَانَ اللَّهِ', target: 33 },
  { id: 'hamd', text: 'الْحَمْدُ لِلَّهِ', target: 33 },
  { id: 'akbar', text: 'اللَّهُ أَكْبَرُ', target: 33 },
  { id: 'tahlil', text: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 33 },
  { id: 'salawat', text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', target: 10 },
  { id: 'istighfar', text: 'أَسْتَغْفِرُ اللَّهَ', target: 100 },
  { id: 'hawqala', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 33 },
];

export type WirdTab = 'quran' | 'adhkar' | 'tasbih';

type HisnRow = {
  ID?: number;
  ARABIC_TEXT?: string;
  REPEAT?: number;
  AUDIO?: string;
};

export function parseHisnPayload(payload: unknown): AdhkarItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const values = Object.values(payload as Record<string, unknown>);
  const rows = values.find((value) => Array.isArray(value)) as HisnRow[] | undefined;
  if (!rows) return [];
  return rows
    .map((row, index) => {
      const text = String(row.ARABIC_TEXT ?? '').replace(/\(\(/g, '').replace(/\)\)/g, '').trim();
      const repeat = Number(row.REPEAT) > 0 ? Number(row.REPEAT) : 1;
      const audio = row.AUDIO ? String(row.AUDIO).replace(/^http:\/\//, 'https://') : null;
      return {
        id: String(row.ID ?? `hisn-${index}`),
        text,
        repeat,
        audio,
        source: 'حصن المسلم',
      };
    })
    .filter((item) => item.text.length > 0);
}

function isEveningOnly(text: string): boolean {
  return text.includes('إذا أمسى') && !text.includes('إذا أصبح') && !text.includes('أصبح');
}

function isMorningOnly(text: string): boolean {
  return (text.includes('إذا أصبح') || text.includes('إذا أصبحَ')) && !text.includes('إذا أمسى');
}

export function filterAdhkarForCategory(items: AdhkarItem[], category: AdhkarCategoryId): AdhkarItem[] {
  switch (category) {
    case 'morning':
      return items.filter((item) => !isEveningOnly(item.text));
    case 'evening':
      return items.filter((item) => !isMorningOnly(item.text));
    case 'study':
    case 'sleep':
    case 'prayer':
      return items;
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}

export function getAdhkarCategory(id: AdhkarCategoryId): AdhkarCategory {
  switch (id) {
    case 'morning':
      return ADHKAR_CATEGORIES[0];
    case 'evening':
      return ADHKAR_CATEGORIES[1];
    case 'study':
      return ADHKAR_CATEGORIES[2];
    case 'sleep':
      return ADHKAR_CATEGORIES[3];
    case 'prayer':
      return ADHKAR_CATEGORIES[4];
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

export async function fetchSurahAyahs(number: number): Promise<{
  name: string;
  ayahs: { number: number; text: string; audio: string | null }[];
}> {
  const response = await fetch(`/api/wird/surah/${number}`);
  if (!response.ok) throw new Error('تعذر تحميل السورة');
  return response.json() as Promise<{
    name: string;
    ayahs: { number: number; text: string; audio: string | null }[];
  }>;
}

export async function fetchAdhkarCategory(category: AdhkarCategoryId): Promise<AdhkarItem[]> {
  const meta = getAdhkarCategory(category);
  const bundles = await Promise.all(
    meta.hisnIds.map(async (id) => {
      const response = await fetch(`/api/wird/adhkar/${id}`);
      if (!response.ok) return [] as AdhkarItem[];
      const payload = (await response.json()) as { items?: AdhkarItem[] };
      return payload.items ?? [];
    }),
  );
  const remote = filterAdhkarForCategory(bundles.flat(), category);
  if (category === 'study') {
    const merged = [...STUDY_ADHKAR];
    for (const item of remote) {
      if (!merged.some((row) => row.text.slice(0, 24) === item.text.slice(0, 24))) merged.push(item);
    }
    return merged;
  }
  return remote.length ? remote : FALLBACK_ADHKAR[category];
}
