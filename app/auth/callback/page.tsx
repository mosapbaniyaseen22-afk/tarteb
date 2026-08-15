'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isReturningStudent } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Profile, UserSubject } from '@/lib/supabase';
import { LabibLogo } from '@/components/labib-logo';

let pendingCodeExchange: Promise<{
  userId: string | null;
  errorMessage: string | null;
}> | null = null;

function exchangeCode(code: string) {
  if (!pendingCodeExchange) {
    pendingCodeExchange = supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => ({
      userId: data.session?.user?.id ?? null,
      errorMessage: error?.message ?? null,
    }));
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
      window.setTimeout(() => router.replace('/login'), 2000);
    };

    const redirectForUser = async (userId: string) => {
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
        fail('تعذر إكمال تسجيل الدخول. سيتم إرجاعك لصفحة الدخول.');
        return;
      }

      if (code) {
        window.history.replaceState({}, '', window.location.pathname);
        const exchanged = await exchangeCode(code);
        if (cancelled) return;
        if (exchanged.userId) {
          await redirectForUser(exchanged.userId);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user?.id) {
        await redirectForUser(data.session.user.id);
        return;
      }

      fail('تعذر إكمال تسجيل الدخول. سيتم إرجاعك لصفحة الدخول.');
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
