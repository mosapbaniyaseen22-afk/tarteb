export const ACTIVATION_DURATION_DAYS = 30;
export const ACTIVATION_CODE_PREFIX = 'LBIB';

export type StoredCodeStatus = 'unused' | 'used' | 'revoked';
export type ActivationCodeStatus = 'unused' | 'active' | 'expired' | 'revoked';
export type ActivationCodeFilter = 'all' | ActivationCodeStatus;

export type ActivationCode = {
  id: string;
  code: string;
  createdAt: string;
  durationDays: number;
  note: string;
  storedStatus: StoredCodeStatus;
  usedByUserId: string | null;
  usedByName: string | null;
  usedByEmail: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

export type UserSubscription = {
  userId: string;
  name: string;
  email: string;
  codeId: string;
  code: string;
  activatedAt: string;
  expiresAt: string;
};

export type SubscriptionStatus = {
  active: boolean;
  expiresAt: string | null;
  daysLeft: number;
  code: string | null;
  activatedAt: string | null;
};

export function normalizeActivationCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatActivationCode(input: string) {
  const raw = normalizeActivationCode(input).slice(0, ACTIVATION_CODE_PREFIX.length + 8);
  if (!raw) return '';
  if (raw.length <= ACTIVATION_CODE_PREFIX.length) return raw;
  const rest = raw.slice(ACTIVATION_CODE_PREFIX.length);
  if (rest.length <= 4) return `${ACTIVATION_CODE_PREFIX}-${rest}`;
  return `${ACTIVATION_CODE_PREFIX}-${rest.slice(0, 4)}-${rest.slice(4)}`;
}

export function codesMatch(stored: string, input: string) {
  return normalizeActivationCode(stored) === normalizeActivationCode(input);
}

export function resolveCodeStatus(code: ActivationCode, now = Date.now()): ActivationCodeStatus {
  switch (code.storedStatus) {
    case 'revoked':
      return 'revoked';
    case 'unused':
      return 'unused';
    case 'used': {
      const expires = code.expiresAt ? new Date(code.expiresAt).getTime() : NaN;
      if (Number.isFinite(expires) && expires <= now) return 'expired';
      return 'active';
    }
    default: {
      const exhaustive: never = code.storedStatus;
      return exhaustive;
    }
  }
}

export function remainingDays(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return 0;
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return 0;
  return Math.max(0, Math.ceil((expires - now) / (24 * 60 * 60 * 1000)));
}

export function isSubscriptionActive(subscription: UserSubscription | null | undefined, now = Date.now()) {
  if (!subscription?.expiresAt) return false;
  const expires = new Date(subscription.expiresAt).getTime();
  return Number.isFinite(expires) && expires > now;
}

export function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function codeStatusLabel(status: ActivationCodeStatus) {
  switch (status) {
    case 'unused':
      return 'غير مستخدم';
    case 'active':
      return 'مفعّل';
    case 'expired':
      return 'منتهي';
    case 'revoked':
      return 'ملغى';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
