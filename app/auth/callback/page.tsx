'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { LabibLogo } from '@/components/labib-logo';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [exchangeDone, setExchangeDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('جاري إكمال تسجيل الدخول...');

  useEffect(() => {
    let cancelled = false;

    const fail = (text: string) => {
      if (cancelled) return;
      setFailed(true);
      setMessage(text);
      window.sessionStorage.setItem('labib-skip-auto-google', '1');
      window.setTimeout(() => router.replace('/'), 2000);
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
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          fail('تعذر إكمال تسجيل الدخول. سيتم إرجاعك للصفحة الرئيسية.');
          return;
        }
      }

      if (!cancelled) setExchangeDone(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!exchangeDone || failed || loading) return;
    if (user) {
      router.replace(profile?.onboarding_complete ? '/dashboard' : '/onboarding');
    }
  }, [exchangeDone, failed, loading, user, profile, router]);

  useEffect(() => {
    if (!exchangeDone || failed) return;
    const timer = window.setTimeout(() => {
      if (user) return;
      setFailed(true);
      setMessage('تعذر إكمال تسجيل الدخول. سيتم إرجاعك للصفحة الرئيسية.');
      window.sessionStorage.setItem('labib-skip-auto-google', '1');
      router.replace('/');
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [exchangeDone, failed, user, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMessage((current) =>
        failed ? current : 'ما زال الانتظار جارياً... إذا استمر، أعد المحاولة من الصفحة الرئيسية.',
      );
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [failed]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 gradient-hero">
      <LabibLogo size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
