import { createClient } from '@supabase/supabase-js';
import { isSubscriptionActive, type UserSubscription } from './activation';
import type { AppSubscriber } from './admin';
import { isLocalSupabase } from './supabase';

const LIST_SECRET = process.env.ADMIN_SESSION_SECRET || 'labib-admin-local-session';

function cloudClient(token?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || isLocalSupabase) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
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
  const { data, error } = await client.rpc('admin_list_app_users', { p_secret: LIST_SECRET });
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
