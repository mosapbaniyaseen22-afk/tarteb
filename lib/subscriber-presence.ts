import { supabase } from './supabase';

let presenceStopped = false;

export function resumeSubscriberPresence() {
  presenceStopped = false;
}

export async function pingSubscriberPresence(input: {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  stage?: string | null;
}) {
  if (presenceStopped) return;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || presenceStopped) return;

  await fetch('/api/subscribers/heartbeat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}

export async function markSubscriberLoggedOut() {
  presenceStopped = true;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;

  await fetch('/api/subscribers/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

