import { MAX_ADMIN_FILE_BYTES, MAX_ADMIN_FILE_LABEL, originalStoragePath } from './admin';

export function newResourceId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function uploadOriginalFile(id: string, file: File) {
  if (file.size > MAX_ADMIN_FILE_BYTES) {
    throw new Error(`الملف أكبر من ${MAX_ADMIN_FILE_LABEL}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('إعداد تخزين الملفات غير موجود');
  }

  const filePath = originalStoragePath(id, file.name);
  const endpoint = `${url}/storage/v1/object/admin-content/${filePath.split('/').map(encodeURIComponent).join('/')}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    apikey: key,
    'Content-Type': file.type || 'application/pdf',
    'x-upsert': 'true',
  };

  let response = await fetch(endpoint, { method: 'POST', headers, body: file });
  if (!response.ok) {
    response = await fetch(endpoint, { method: 'PUT', headers, body: file });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || 'تعذر حفظ الملف الأصلي');
  }

  return {
    filePath,
    fileUrl: `${url}/storage/v1/object/public/admin-content/${filePath.split('/').map(encodeURIComponent).join('/')}`,
  };
}
