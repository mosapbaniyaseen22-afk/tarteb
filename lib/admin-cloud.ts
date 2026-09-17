import { createClient } from '@supabase/supabase-js';
import { isSubscriptionActive, type ActivationCode, type StoredCodeStatus, type UserSubscription } from './activation';
import { normalizeAdminResource, originalStoragePath, type AdminResource, type AppSubscriber } from './admin';
import { isLocalSupabase } from './supabase';

const ADMIN_RPC_SECRETS = [
  process.env.ADMIN_LIST_SECRET,
  'labib-admin-local-session',
  process.env.ADMIN_SESSION_SECRET,
].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

function cloudClient(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || isLocalSupabase) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

type CloudClient = NonNullable<ReturnType<typeof cloudClient>>;

async function rpcWithAdminSecret(
  client: CloudClient,
  name:
    | 'admin_list_app_users'
    | 'admin_upsert_resource'
    | 'admin_delete_resource'
    | 'admin_list_activation_codes'
    | 'admin_upsert_activation_code'
    | 'admin_delete_activation_code',
  params: Record<string, unknown>,
) {
  let lastError: { message?: string } | null = null;
  for (const secret of ADMIN_RPC_SECRETS) {
    const result = await client.rpc(name, { ...params, p_secret: secret });
    if (!result.error) return result;
    lastError = result.error;
    if (!/forbidden/i.test(result.error.message || '')) return result;
  }
  return { data: null, error: lastError };
}

function resourceRpcPayload(item: AdminResource) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    subjectName: item.subjectName,
    year: item.year,
    stage: item.stage,
    fileName: item.fileName,
    fileMime: item.fileMime,
    filePath: item.filePath,
    fileUrl: item.fileUrl,
    externalUrl: item.externalUrl,
    extractedText: item.extractedText,
    questions: item.questions,
    autoClassified: item.autoClassified,
    published: item.published,
    createdAt: item.createdAt,
  };
}

export async function upsertCloudPresence(
  token: string,
  input: { id: string; name: string; email: string; avatarUrl: string | null; stage: string | null },
) {
  const client = cloudClient(token);
  if (!client) return;
  const now = new Date().toISOString();
  const { data: existing } = await client
    .from('app_presence')
    .select('first_seen_at')
    .eq('user_id', input.id)
    .maybeSingle();

  await client.from('app_presence').upsert({
    user_id: input.id,
    name: input.name,
    email: input.email,
    avatar_url: input.avatarUrl,
    stage: input.stage,
    first_seen_at: existing?.first_seen_at ?? now,
    last_seen_at: now,
    logged_out_at: null,
  });
}

export async function markCloudLoggedOut(token: string, userId: string) {
  const client = cloudClient(token);
  if (!client) return;
  await client.from('app_presence').update({ logged_out_at: new Date().toISOString() }).eq('user_id', userId);
}

export async function upsertCloudSubscription(token: string, sub: UserSubscription) {
  const client = cloudClient(token);
  if (!client) return;
  await client.from('app_subscriptions').upsert({
    user_id: sub.userId,
    name: sub.name,
    email: sub.email,
    code_id: sub.codeId,
    code: sub.code,
    activated_at: sub.activatedAt,
    expires_at: sub.expiresAt,
  });
}

function asIso(value: unknown) {
  if (!value) return null;
  const text = String(value);
  const time = new Date(text).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : text;
}

function asStoredStatus(value: unknown): StoredCodeStatus {
  switch (value) {
    case 'used':
    case 'revoked':
    case 'unused':
      return value;
    default:
      return 'unused';
  }
}

function asActivationCode(row: Record<string, unknown>): ActivationCode {
  return {
    id: String(row.id ?? ''),
    code: String(row.code ?? ''),
    createdAt: asIso(row.createdAt ?? row.created_at) || new Date().toISOString(),
    durationDays: Number(row.durationDays ?? row.duration_days ?? 30) || 30,
    note: String(row.note ?? ''),
    storedStatus: asStoredStatus(row.storedStatus ?? row.stored_status),
    usedByUserId: (row.usedByUserId as string | null | undefined) ?? (row.used_by_user_id as string | null | undefined) ?? null,
    usedByName: (row.usedByName as string | null | undefined) ?? (row.used_by_name as string | null | undefined) ?? null,
    usedByEmail: (row.usedByEmail as string | null | undefined) ?? (row.used_by_email as string | null | undefined) ?? null,
    activatedAt: asIso(row.activatedAt ?? row.activated_at),
    expiresAt: asIso(row.expiresAt ?? row.expires_at),
    revokedAt: asIso(row.revokedAt ?? row.revoked_at),
  };
}

function asUserSubscription(row: Record<string, unknown>): UserSubscription | null {
  const userId = String(row.userId ?? row.user_id ?? '');
  const expiresAt = asIso(row.expiresAt ?? row.expires_at);
  if (!userId || !expiresAt) return null;
  return {
    userId,
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    codeId: String(row.codeId ?? row.code_id ?? ''),
    code: String(row.code ?? ''),
    activatedAt: asIso(row.activatedAt ?? row.activated_at) || expiresAt,
    expiresAt,
  };
}

function codeRpcPayload(item: ActivationCode) {
  return {
    id: item.id,
    code: item.code,
    created_at: item.createdAt,
    createdAt: item.createdAt,
    duration_days: item.durationDays,
    durationDays: item.durationDays,
    note: item.note,
    stored_status: item.storedStatus,
    storedStatus: item.storedStatus,
    used_by_user_id: item.usedByUserId,
    usedByUserId: item.usedByUserId,
    used_by_name: item.usedByName,
    usedByName: item.usedByName,
    used_by_email: item.usedByEmail,
    usedByEmail: item.usedByEmail,
    activated_at: item.activatedAt,
    activatedAt: item.activatedAt,
    expires_at: item.expiresAt,
    expiresAt: item.expiresAt,
    revoked_at: item.revokedAt,
    revokedAt: item.revokedAt,
  };
}

export async function listCloudActivationCodes(): Promise<ActivationCode[] | null> {
  const client = cloudClient();
  if (!client) return null;
  const { data, error } = await rpcWithAdminSecret(client, 'admin_list_activation_codes', {});
  if (error || data == null) {
    console.error(error);
    return null;
  }
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => asActivationCode((row || {}) as Record<string, unknown>))
    .filter((row) => row.id && row.code);
}

export async function upsertCloudActivationCode(item: ActivationCode) {
  const client = cloudClient();
  if (!client) return;
  const { error } = await rpcWithAdminSecret(client, 'admin_upsert_activation_code', {
    p_item: codeRpcPayload(item),
  });
  if (error) {
    console.error(error);
    throw new Error(error.message || 'تعذر حفظ كود التفعيل');
  }
}

export async function deleteCloudActivationCode(id: string) {
  const client = cloudClient();
  if (!client) return { ok: true as const };
  const { data, error } = await rpcWithAdminSecret(client, 'admin_delete_activation_code', { p_id: id });
  if (error) {
    console.error(error);
    return { ok: false as const, error: error.message || 'تعذر حذف الكود' };
  }
  const payload = (data || {}) as { ok?: boolean; error?: string };
  if (payload.ok === false) {
    return { ok: false as const, error: payload.error || 'تعذر حذف الكود' };
  }
  return { ok: true as const };
}

export async function getCloudUserSubscription(token: string): Promise<UserSubscription | null> {
  const client = cloudClient(token);
  if (!client) return null;
  const { data, error } = await client.from('app_subscriptions').select('*').maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  if (!data) return null;
  return asUserSubscription(data as Record<string, unknown>);
}

export async function activateCloudCode(token: string, code: string) {
  const client = cloudClient(token);
  if (!client) return null;
  const { data, error } = await client.rpc('activate_labib_code', { p_code: code });
  if (error) {
    console.error(error);
    return { ok: false as const, error: error.message || 'تعذر تفعيل الكود' };
  }
  const payload = (data || {}) as { ok?: boolean; error?: string; subscription?: Record<string, unknown> };
  if (!payload.ok) {
    return { ok: false as const, error: payload.error || 'تعذر تفعيل الكود' };
  }
  const subscription = asUserSubscription(payload.subscription || {});
  if (!subscription) {
    return { ok: false as const, error: 'تعذر قراءة الاشتراك بعد التفعيل' };
  }
  return { ok: true as const, subscription };
}

function asSubscriber(row: Record<string, unknown>): AppSubscriber {
  return {
    id: String(row.id ?? ''),
    name: String(row.name || 'طالب'),
    email: String(row.email || ''),
    avatarUrl: (row.avatarUrl as string | null | undefined) ?? (row.avatar_url as string | null | undefined) ?? null,
    stage: (row.stage as string | null | undefined) ?? null,
    firstSeenAt: String(row.firstSeenAt || row.first_seen_at || new Date().toISOString()),
    lastSeenAt: String(row.lastSeenAt || row.last_seen_at || new Date().toISOString()),
    loggedOutAt: (row.loggedOutAt as string | null | undefined) ?? (row.logged_out_at as string | null | undefined) ?? null,
    subscribed: Boolean(row.subscribed),
    subscriptionExpiresAt:
      (row.subscriptionExpiresAt as string | null | undefined) ??
      (row.subscription_expires_at as string | null | undefined) ??
      null,
  };
}

export async function listCloudUsers(): Promise<AppSubscriber[] | null> {
  const client = cloudClient();
  if (!client) return null;
  const { data, error } = await rpcWithAdminSecret(client, 'admin_list_app_users', {});
  if (error || data == null) {
    console.error(error);
    return null;
  }
  const rows = typeof data === 'string' ? JSON.parse(data) : data;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => asSubscriber(row as Record<string, unknown>)).filter((row) => row.id);
}

export function mergeAppUsers(
  cloud: AppSubscriber[] | null,
  files: AppSubscriber[],
  subscriptions: UserSubscription[],
): AppSubscriber[] {
  const map = new Map<string, AppSubscriber>();

  const put = (row: AppSubscriber) => {
    const prev = map.get(row.id);
    if (!prev) {
      map.set(row.id, {
        ...row,
        subscribed: Boolean(row.subscribed),
        subscriptionExpiresAt: row.subscriptionExpiresAt ?? null,
      });
      return;
    }
    const newer = row.lastSeenAt >= prev.lastSeenAt ? row : prev;
    const older = newer === row ? prev : row;
    map.set(row.id, {
      ...older,
      ...newer,
      name: newer.name || older.name,
      email: newer.email || older.email,
      avatarUrl: newer.avatarUrl || older.avatarUrl,
      stage: newer.stage || older.stage,
      firstSeenAt: row.firstSeenAt < prev.firstSeenAt ? row.firstSeenAt : prev.firstSeenAt,
      subscribed: prev.subscribed || row.subscribed,
      subscriptionExpiresAt: newer.subscriptionExpiresAt || older.subscriptionExpiresAt,
    });
  };

  (cloud ?? []).forEach(put);
  files.forEach(put);

  for (const sub of subscriptions) {
    const active = isSubscriptionActive(sub);
    const prev = map.get(sub.userId);
    if (prev) {
      map.set(sub.userId, {
        ...prev,
        subscribed: prev.subscribed || active,
        subscriptionExpiresAt: prev.subscriptionExpiresAt || sub.expiresAt,
      });
      continue;
    }
    map.set(sub.userId, {
      id: sub.userId,
      name: sub.name || 'طالب',
      email: sub.email || '',
      avatarUrl: null,
      stage: null,
      firstSeenAt: sub.activatedAt,
      lastSeenAt: sub.activatedAt,
      loggedOutAt: null,
      subscribed: active,
      subscriptionExpiresAt: sub.expiresAt,
    });
  }

  return [...map.values()].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}

function asAdminResource(row: Record<string, unknown>): AdminResource {
  return normalizeAdminResource({
    id: String(row.id ?? ''),
    type: (row.type as AdminResource['type']) ?? 'material',
    title: String(row.title ?? 'محتوى'),
    description: String(row.description ?? ''),
    subjectName: String(row.subjectName ?? row.subject_name ?? 'الكل'),
    year: (row.year as number | null | undefined) ?? (row.exam_year as number | null | undefined) ?? null,
    stage: (row.stage as AdminResource['stage'] | undefined) ?? 'tawjihi_first',
    fileName: (row.fileName as string | null | undefined) ?? (row.file_name as string | null | undefined) ?? null,
    fileMime: (row.fileMime as string | null | undefined) ?? (row.file_mime as string | null | undefined) ?? null,
    filePath: (row.filePath as string | null | undefined) ?? (row.file_path as string | null | undefined) ?? null,
    fileUrl: (row.fileUrl as string | null | undefined) ?? (row.file_url as string | null | undefined) ?? null,
    externalUrl: (row.externalUrl as string | null | undefined) ?? (row.external_url as string | null | undefined) ?? null,
    extractedText: (row.extractedText as string | null | undefined) ?? (row.extracted_text as string | null | undefined) ?? null,
    questions: Array.isArray(row.questions) ? row.questions as AdminResource['questions'] : [],
    autoClassified: Boolean(row.autoClassified ?? row.auto_classified),
    published: row.published !== false,
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
  });
}

export async function getCloudResource(id: string): Promise<AdminResource | null> {
  const client = cloudClient();
  if (!client) return null;
  const { data, error } = await client.from('admin_resources').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  if (!data) return null;
  const item = asAdminResource(data as Record<string, unknown>);
  return item.id ? item : null;
}

export async function listCloudResources(): Promise<AdminResource[] | null> {
  const client = cloudClient();
  if (!client) return null;
  const { data, error } = await client
    .from('admin_resources')
    .select(
      'id, type, title, description, subject_name, exam_year, stage, file_name, file_mime, file_path, file_url, external_url, questions, auto_classified, published, created_at',
    )
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return null;
  }
  return (data ?? []).map((row) => asAdminResource(row as Record<string, unknown>)).filter((row) => row.id);
}

export async function upsertCloudResource(item: AdminResource) {
  const client = cloudClient();
  if (!client) return;
  const { error } = await rpcWithAdminSecret(client, 'admin_upsert_resource', {
    p_item: resourceRpcPayload(item),
  });
  if (error) {
    console.error(error);
    throw new Error(error.message || 'تعذر حفظ بيانات الملف');
  }
}

function pathFromPublicUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;
  const marker = '/object/public/admin-content/';
  const index = fileUrl.indexOf(marker);
  if (index === -1) return null;
  try {
    return decodeURIComponent(fileUrl.slice(index + marker.length).split('?')[0] || '').replace(/^\/+/, '') || null;
  } catch {
    return fileUrl.slice(index + marker.length).split('?')[0] || null;
  }
}

async function listStorageFolder(folder: string) {
  const client = cloudClient();
  if (!client || !folder) return [];
  const { data, error } = await client.storage.from('admin-content').list(folder, { limit: 100 });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? [])
    .map((file) => file.name)
    .filter((name): name is string => Boolean(name) && !name.endsWith('/'))
    .map((name) => `${folder}/${name}`);
}

async function removeStoragePaths(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  const client = cloudClient();
  if (client) {
    const { error } = await client.storage.from('admin-content').remove(unique);
    if (!error) return;
    console.error(error);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !key) {
    throw new Error('تعذر حذف الملف الأصلي من التخزين');
  }

  const batch = await fetch(`${baseUrl}/storage/v1/object/admin-content`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: unique }),
  });
  if (batch.ok) return;

  for (const path of unique) {
    const response = await fetch(
      `${baseUrl}/storage/v1/object/admin-content/${path.split('/').map(encodeURIComponent).join('/')}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
      },
    );
    if (!response.ok && response.status !== 404 && response.status !== 400) {
      const detail = await response.text().catch(() => '');
      console.error(detail || response.statusText);
      throw new Error('تعذر حذف الملف الأصلي من التخزين');
    }
  }
}

export async function deleteCloudFiles(id: string, item?: Pick<AdminResource, 'filePath' | 'fileUrl' | 'fileName'> | null) {
  const folders = new Set<string>([id]);
  const paths = new Set<string>();
  if (item?.filePath) {
    paths.add(item.filePath);
    folders.add(item.filePath.split('/')[0]);
  }
  const fromUrl = pathFromPublicUrl(item?.fileUrl);
  if (fromUrl) {
    paths.add(fromUrl);
    folders.add(fromUrl.split('/')[0]);
  }
  if (item?.fileName) {
    paths.add(originalStoragePath(id, item.fileName));
  }
  paths.add(`${id}/original.pdf`);
  paths.add(`${id}/original.docx`);
  paths.add(`${id}/original.doc`);

  for (const folder of folders) {
    const listed = await listStorageFolder(folder);
    listed.forEach((path) => paths.add(path));
  }

  await removeStoragePaths([...paths]);

  const leftovers: string[] = [];
  for (const folder of folders) {
    leftovers.push(...(await listStorageFolder(folder)));
  }
  if (leftovers.length > 0) {
    await removeStoragePaths(leftovers);
    const stillThere: string[] = [];
    for (const folder of folders) {
      stillThere.push(...(await listStorageFolder(folder)));
    }
    if (stillThere.length > 0) {
      throw new Error('تعذر حذف الملف الأصلي من التخزين');
    }
  }
}

export async function deleteCloudResource(id: string, item?: Pick<AdminResource, 'filePath' | 'fileUrl' | 'fileName'> | null) {
  const client = cloudClient();
  if (!client) return;
  await deleteCloudFiles(id, item);
  const { error } = await rpcWithAdminSecret(client, 'admin_delete_resource', {
    p_id: id,
  });
  if (error) {
    console.error(error);
    throw new Error(error.message || 'تعذر حذف المحتوى المنشور');
  }
}

export function cloudPublicFileUrl(filePath: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!url || !filePath) return null;
  return `${url}/storage/v1/object/public/admin-content/${filePath.split('/').map(encodeURIComponent).join('/')}`;
}

export async function uploadCloudFile(id: string, bytes: Buffer, mime: string, fileName: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !key || isLocalSupabase) {
    throw new Error('تعذر الاتصال بتخزين الملفات');
  }

  const storagePath = originalStoragePath(id, fileName);
  const endpoint = `${baseUrl}/storage/v1/object/admin-content/${storagePath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    apikey: key,
    'Content-Type': mime || 'application/octet-stream',
    'x-upsert': 'true',
  };
  const body = new Uint8Array(bytes);

  let response = await fetch(endpoint, { method: 'POST', headers, body });
  if (!response.ok) {
    response = await fetch(endpoint, { method: 'PUT', headers, body });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(detail || response.statusText);
    throw new Error('تعذر حفظ الملف الأصلي');
  }

  const fileUrl = cloudPublicFileUrl(storagePath);
  if (!fileUrl) {
    throw new Error('تعذر إنشاء رابط الملف الأصلي');
  }
  return { filePath: storagePath, fileUrl };
}

export async function downloadCloudFile(filePath: string): Promise<Uint8Array | null> {
  const client = cloudClient();
  if (!client || !filePath) return null;
  const { data, error } = await client.storage.from('admin-content').download(filePath);
  if (error || !data) {
    console.error(error);
    return null;
  }
  return new Uint8Array(await data.arrayBuffer());
}
