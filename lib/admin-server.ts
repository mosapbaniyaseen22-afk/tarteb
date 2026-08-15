import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import type { AdminResource, AppSubscriber } from './admin';

const AUTH_COOKIE = 'labib_admin';
const DEFAULT_USERNAME = 'ahmad';
const DEFAULT_PASSWORD = 'ahmad1234';
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
  if (session.username !== 'admin') return null;
  return session;
}

export async function verifyAdminLogin(username: string, password: string) {
  const auth = await readAuth();
  if (username.trim() !== auth.username) return null;
  if (!passwordsMatch(password, auth.salt, auth.passwordHash)) return null;
  return auth.username;
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

export async function readSubscribers(): Promise<AppSubscriber[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(subscribersFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as AppSubscriber[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  };

  const updated = existing
    ? subscribers.map((row) => (row.id === input.id ? next : row))
    : [next, ...subscribers];

  updated.sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  await writeFile(subscribersFilePath(), JSON.stringify(updated, null, 2), 'utf8');
  return next;
}

export { AUTH_COOKIE };
