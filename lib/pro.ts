export const PRO_WHATSAPP_LOCAL = '0771684072';
export const PRO_WHATSAPP_E164 = '962771684072';

export function proWhatsAppUrl(message: string) {
  return `https://wa.me/${PRO_WHATSAPP_E164}?text=${encodeURIComponent(message)}`;
}

export const PRO_WHATSAPP_MESSAGE = [
  'مرحبا، أريد الاشتراك في لبيب+.',
  'سأدفع عبر كليك، ويرجى تأكيد الاستلام بعد إرسال الوصل.',
].join('\n');
