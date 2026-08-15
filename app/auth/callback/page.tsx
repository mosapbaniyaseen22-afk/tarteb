'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isReturningStudent } from '@/lib/auth-context';
import { activateAdminSession, isAdminEmail } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import type { Profile, UserSubject } from '@/lib/supabase';
import { LabibLogo } from '@/components/labib-logo';

let pendingCodeExchange: Promise<{
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  errorMessage: string | null;
}> | null = null;

function exchangeCode(code: string) {
  if (!pendingCodeExchange) {
    pendingCodeExchange = supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      const user = data.session?.user;
      const metaEmail = typeof user?.user_metadata?.email === 'string' ? user.user_metadata.email : null;
      return {
        userId: user?.id ?? null,
        email: user?.email ?? metaEmail,
        accessToken: data.session?.access_token ?? null,
        errorMessage: error?.message ?? null,
      };
    });
  }
  return pendingCodeExchange;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('جاري إكمال تسجيل الدخول...');

  useEffect(() => {
    let cancelled = false;

    const fail = (text: string) => {
      if (cancelled) return;
      setMessage(text);
      window.sessionStorage.setItem('labib-skip-auto-google', '1');
      window.setTimeout(() => router.replace('/'), 2000);
    };

    const redirectForUser = async (userId: string, email: string | null, accessToken: string | null) => {
      if (accessToken) {
        void activateAdminSession(accessToken);
      }
      if (isAdminEmail(email)) {
        if (!cancelled) router.replace('/admin');
        return;
      }

      const [{ data: profile }, { data: subjects }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_subjects').select('id').eq('user_id', userId),
      ]);
      if (cancelled) return;
      router.replace(
        isReturningStudent((profile as Profile | null) ?? null, (subjects as UserSubject[] | null) ?? [])
          ? '/dashboard'
          : '/onboarding',
      );
    };

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const oauthError = params.get('error_description') || params.get('error');

      if (oauthError) {
        fail('تعذر إكمال تسجيل الدخول. سيتم إرجاعك للصفحة الرئيسية.');
        return;
      }

      if (code) {
        window.history.replaceState({}, '', window.location.pathname);
        const exchanged = await exchangeCode(code);
        if (cancelled) return;
        if (exchanged.userId) {
          await redirectForUser(exchanged.userId, exchanged.email, exchanged.accessToken);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user?.id) {
        const metaEmail = typeof data.session.user.user_metadata?.email === 'string'
          ? data.session.user.user_metadata.email
          : null;
        await redirectForUser(
          data.session.user.id,
          data.session.user.email ?? metaEmail,
          data.session.access_token ?? null,
        );
        return;
      }

      fail('تعذر إكمال تسجيل الدخول. سيتم إرجاعك للصفحة الرئيسية.');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 gradient-hero">
      <LabibLogo size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
