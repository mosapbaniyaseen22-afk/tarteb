export const PRO_WHATSAPP_LOCAL = '0771684072';
export const PRO_WHATSAPP_E164 = '962771684072';
export const PRO_INSTAGRAM_HANDLE = 'tarteeb888';
export const PRO_PRICE_JOD = 3;
export const PRO_PRICE_LABEL = '3 دنانير';
export const PRO_OFFER_LABEL = 'عرض أول شهر';

export function proWhatsAppUrl(message: string) {
  return `https://wa.me/${PRO_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

export function proInstagramPayUrl() {
  return `https://ig.me/m/${PRO_INSTAGRAM_HANDLE}`;
}

export const PRO_WHATSAPP_MESSAGE = [
  'مرحبا، أريد الاشتراك في ترتيب+.',
  `سأدفع ${PRO_PRICE_LABEL} عبر كليك (عرض أول شهر).`,
  'يرجى تأكيد الاستلام بعد إرسال الوصل، ثم إرسال كود التفعيل.',
].join('\n');

export const PRO_PAID_FEATURES = [
  'اختبر نفسك بنمط وزاري',
  'مذكراتي',
  'الامتحانات المقترحة',
  'التلخيصات',
  'الدوسيات',
  'أسئلة المواد',
];

export const PRO_FREE_FEATURES = [
  'الامتحانات الوزارية مجانية',
];
