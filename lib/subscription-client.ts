import { supabase } from './supabase';
import type { SubscriptionStatus } from './activation';

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

export async function loadSubscriptionStatus(): Promise<SubscriptionStatus> {
  const headers = await authHeader();
  if (!headers) {
    return { active: false, expiresAt: null, daysLeft: 0, code: null, activatedAt: null };
  }

  const response = await fetch('/api/subscription/status', { cache: 'no-store', headers });
  if (!response.ok) {
    return { active: false, expiresAt: null, daysLeft: 0, code: null, activatedAt: null };
  }
  return (await response.json()) as SubscriptionStatus;
}

export async function activateSubscriptionCode(code: string) {
  const headers = await authHeader();
  if (!headers) {
    return { ok: false as const, error: 'يجب تسجيل الدخول أولاً' };
  }

  const response = await fetch('/api/subscription/activate', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const payload = (await response.json()) as { error?: string; subscription?: SubscriptionStatus };
  if (!response.ok) {
    return { ok: false as const, error: payload.error || 'تعذر تفعيل الكود' };
  }
  return { ok: true as const, subscription: payload.subscription };
}
