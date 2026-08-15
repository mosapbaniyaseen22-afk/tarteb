import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { ADMIN_EMAIL, type AdminResource, type AppSubscriber } from './admin';
import {
  ACTIVATION_CODE_PREFIX,
  ACTIVATION_DURATION_DAYS,
  addDays,
  codesMatch,
  isSubscriptionActive,
  type ActivationCode,
  type UserSubscription,
} from './activation';

const AUTH_COOKIE = 'labib_admin';
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'ahmad1234';
const ADMIN_LOGINS = new Set([ADMIN_EMAIL, 'ahmad']);
const SESSION_DAYS = 7;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'labib-admin-local-session';

type AdminAuthFile = {
  username: string;
  passwordHash: string;
  salt: string;
};

function dataDir() {
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'labib-data');
  }
  return path.join(process.cwd(), 'data');
}

function authFilePath() {
  return path.join(dataDir(), 'admin-auth.json');
}

function resourcesFilePath() {
  return path.join(dataDir(), 'admin-resources.json');
}

function subscribersFilePath() {
  return path.join(dataDir(), 'subscribers.json');
}

function activationCodesFilePath() {
  return path.join(dataDir(), 'activation-codes.json');
}

function subscriptionsFilePath() {
  return path.join(dataDir(), 'user-subscriptions.json');
}

function uploadsDir() {
  return path.join(dataDir(), 'uploads');
}

function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120000, 64, 'sha256').toString('hex');
}

function passwordsMatch(password: string, salt: string, storedHash: string) {
  const next = Buffer.from(hashPassword(password, salt), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (next.length !== stored.length) return false;
  return timingSafeEqual(next, stored);
}

async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true });
  await mkdir(uploadsDir(), { recursive: true });
}

async function readAuth(): Promise<AdminAuthFile> {
  await ensureDataDir();
  try {
    const raw = await readFile(authFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as AdminAuthFile;
    if (parsed.username && parsed.passwordHash && parsed.salt) return parsed;
  } catch {
    // First run: create default admin credentials.
  }

  const salt = randomBytes(16).toString('hex');
  const created: AdminAuthFile = {
    username: DEFAULT_USERNAME,
    passwordHash: hashPassword(DEFAULT_PASSWORD, salt),
    salt,
  };
  await writeFile(authFilePath(), JSON.stringify(created, null, 2), 'utf8');
  return created;
}

async function writeAuth(auth: AdminAuthFile) {
  await ensureDataDir();
  await writeFile(authFilePath(), JSON.stringify(auth, null, 2), 'utf8');
}

function signSession(username: string, expiresAt: number) {
  const payload = `${username}.${expiresAt}`;
  const signature = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function readSessionToken(token: string | undefined): { username: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [username, expiresRaw, signature] = parts;
  const expiresAt = Number(expiresRaw);
  if (!username || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const payload = `${username}.${expiresAt}`;
  const expected = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return { username };
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function createAdminSession(username: string) {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return signSession(username, expiresAt);
}

export async function getAdminSession() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const session = readSessionToken(token);
  if (!session) return null;
  if (session.username === DEFAULT_USERNAME || session.username === 'ahmad') return session;
  return null;
}

export async function verifyAdminLogin(username: string, password: string) {
  const normalized = username.trim().toLowerCase();
  if (ADMIN_LOGINS.has(normalized) && password === DEFAULT_PASSWORD) {
    return DEFAULT_USERNAME;
  }

  const auth = await readAuth();
  if (username.trim().toLowerCase() !== auth.username.toLowerCase()) return null;
  if (!passwordsMatch(password, auth.salt, auth.passwordHash)) return null;
  return DEFAULT_USERNAME;
}

export async function changeAdminPassword(currentPassword: string, nextPassword: string) {
  const auth = await readAuth();
  if (!passwordsMatch(currentPassword, auth.salt, auth.passwordHash)) {
    return { ok: false as const, error: 'كلمة السر الحالية غير صحيحة' };
  }
  if (nextPassword.trim().length < 6) {
    return { ok: false as const, error: 'كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل' };
  }

  const salt = randomBytes(16).toString('hex');
  await writeAuth({
    username: auth.username,
    passwordHash: hashPassword(nextPassword, salt),
    salt,
  });
  return { ok: true as const };
}

export async function readResources(): Promise<AdminResource[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(resourcesFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as AdminResource[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      extractedText: item.extractedText ?? null,
      questions: Array.isArray(item.questions) ? item.questions : [],
      autoClassified: Boolean(item.autoClassified),
    }));
  } catch {
    return [];
  }
}

export async function writeResources(items: AdminResource[]) {
  await ensureDataDir();
  await writeFile(resourcesFilePath(), JSON.stringify(items, null, 2), 'utf8');
}

export function uploadPath(id: string) {
  return path.join(uploadsDir(), id);
}

export async function saveUpload(id: string, bytes: Buffer) {
  await ensureDataDir();
  await writeFile(uploadPath(id), bytes);
}

export async function deleteUpload(id: string) {
  try {
    await unlink(uploadPath(id));
  } catch {
    // File may not exist if the item was a link-only video.
  }
}

function normalizeSubscriber(row: AppSubscriber): AppSubscriber {
  return {
    ...row,
    loggedOutAt: row.loggedOutAt ?? null,
  };
}

export async function readSubscribers(): Promise<AppSubscriber[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(subscribersFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as AppSubscriber[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSubscriber);
  } catch {
    return [];
  }
}

async function writeSubscribers(items: AppSubscriber[]) {
  await ensureDataDir();
  await writeFile(subscribersFilePath(), JSON.stringify(items, null, 2), 'utf8');
}

export async function upsertSubscriber(input: {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  stage: string | null;
}) {
  const now = new Date().toISOString();
  const subscribers = await readSubscribers();
  const existing = subscribers.find((row) => row.id === input.id);
  const next: AppSubscriber = {
    id: input.id,
    name: input.name.trim() || existing?.name || 'طالب',
    email: input.email.trim() || existing?.email || '',
    avatarUrl: input.avatarUrl ?? existing?.avatarUrl ?? null,
    stage: input.stage ?? existing?.stage ?? null,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
    loggedOutAt: null,
  };

  const updated = existing
    ? subscribers.map((row) => (row.id === input.id ? next : row))
    : [next, ...subscribers];

  updated.sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  await writeSubscribers(updated);
  return next;
}

export async function markSubscriberLoggedOut(id: string) {
  const subscribers = await readSubscribers();
  const existing = subscribers.find((row) => row.id === id);
  if (!existing) return null;

  const next: AppSubscriber = {
    ...existing,
    loggedOutAt: new Date().toISOString(),
  };
  await writeSubscribers(subscribers.map((row) => (row.id === id ? next : row)));
  return next;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCodeSegment(length: number) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

function createActivationCodeValue() {
  return `${ACTIVATION_CODE_PREFIX}-${randomCodeSegment(4)}-${randomCodeSegment(4)}`;
}

function normalizeCodeRecord(row: ActivationCode): ActivationCode {
  return {
    ...row,
    durationDays: row.durationDays || ACTIVATION_DURATION_DAYS,
    note: row.note ?? '',
    storedStatus: row.storedStatus ?? 'unused',
    usedByUserId: row.usedByUserId ?? null,
    usedByName: row.usedByName ?? null,
    usedByEmail: row.usedByEmail ?? null,
    activatedAt: row.activatedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    revokedAt: row.revokedAt ?? null,
  };
}

export async function readActivationCodes(): Promise<ActivationCode[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(activationCodesFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as ActivationCode[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCodeRecord);
  } catch {
    return [];
  }
}

async function writeActivationCodes(items: ActivationCode[]) {
  await ensureDataDir();
  await writeFile(activationCodesFilePath(), JSON.stringify(items, null, 2), 'utf8');
}

export async function readUserSubscriptions(): Promise<UserSubscription[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(subscriptionsFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as UserSubscription[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUserSubscriptions(items: UserSubscription[]) {
  await ensureDataDir();
  await writeFile(subscriptionsFilePath(), JSON.stringify(items, null, 2), 'utf8');
}

export async function getUserSubscription(userId: string) {
  const subscriptions = await readUserSubscriptions();
  return subscriptions.find((row) => row.userId === userId) ?? null;
}

export async function generateActivationCodes(input: { count: number; note?: string }) {
  const count = Math.min(50, Math.max(1, Math.floor(input.count)));
  const codes = await readActivationCodes();
  const existing = new Set(codes.map((row) => row.code));
  const created: ActivationCode[] = [];
  const now = new Date().toISOString();

  while (created.length < count) {
    const value = createActivationCodeValue();
    if (existing.has(value)) continue;
    existing.add(value);
    created.push({
      id: randomBytes(12).toString('hex'),
      code: value,
      createdAt: now,
      durationDays: ACTIVATION_DURATION_DAYS,
      note: (input.note ?? '').trim(),
      storedStatus: 'unused',
      usedByUserId: null,
      usedByName: null,
      usedByEmail: null,
      activatedAt: null,
      expiresAt: null,
      revokedAt: null,
    });
  }

  await writeActivationCodes([...created, ...codes]);
  return created;
}

export async function revokeActivationCode(id: string) {
  const codes = await readActivationCodes();
  const existing = codes.find((row) => row.id === id);
  if (!existing) return null;
  if (existing.storedStatus === 'revoked') return existing;

  const now = new Date().toISOString();
  const next: ActivationCode = {
    ...existing,
    storedStatus: 'revoked',
    revokedAt: now,
  };
  await writeActivationCodes(codes.map((row) => (row.id === id ? next : row)));

  const subscriptions = await readUserSubscriptions();
  const updated = subscriptions.map((row) => {
    if (row.codeId !== id) return row;
    return { ...row, expiresAt: now };
  });
  await writeUserSubscriptions(updated);
  return next;
}

export async function deleteActivationCode(id: string) {
  const codes = await readActivationCodes();
  const existing = codes.find((row) => row.id === id);
  if (!existing) return { ok: false as const, error: 'الكود غير موجود' };
  if (existing.storedStatus !== 'unused') {
    return { ok: false as const, error: 'يمكن حذف الأكواد غير المستخدمة فقط. ألغِ الكود بدل الحذف.' };
  }
  await writeActivationCodes(codes.filter((row) => row.id !== id));
  return { ok: true as const };
}

export async function activateCodeForUser(input: {
  code: string;
  userId: string;
  name: string;
  email: string;
}) {
  const raw = input.code.trim();
  if (!raw) return { ok: false as const, error: 'أدخل كود التفعيل' };

  const codes = await readActivationCodes();
  const match = codes.find((row) => codesMatch(row.code, raw));
  if (!match) return { ok: false as const, error: 'كود التفعيل غير صحيح' };
  if (match.storedStatus === 'revoked') return { ok: false as const, error: 'هذا الكود ملغى' };
  if (match.storedStatus === 'used') return { ok: false as const, error: 'هذا الكود مستخدم مسبقاً' };

  const nowIso = new Date().toISOString();
  const current = await getUserSubscription(input.userId);
  const base = isSubscriptionActive(current) && current ? current.expiresAt : nowIso;
  const expiresAt = addDays(base, match.durationDays || ACTIVATION_DURATION_DAYS);

  const used: ActivationCode = {
    ...match,
    storedStatus: 'used',
    usedByUserId: input.userId,
    usedByName: input.name,
    usedByEmail: input.email,
    activatedAt: nowIso,
    expiresAt,
  };
  await writeActivationCodes(codes.map((row) => (row.id === match.id ? used : row)));

  const subscription: UserSubscription = {
    userId: input.userId,
    name: input.name,
    email: input.email,
    codeId: match.id,
    code: match.code,
    activatedAt: nowIso,
    expiresAt,
  };
  const subscriptions = await readUserSubscriptions();
  const nextSubs = subscriptions.some((row) => row.userId === input.userId)
    ? subscriptions.map((row) => (row.userId === input.userId ? subscription : row))
    : [subscription, ...subscriptions];
  await writeUserSubscriptions(nextSubs);

  return { ok: true as const, subscription };
}

export { AUTH_COOKIE };
