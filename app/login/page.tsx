'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { isReturningStudent, useAuth } from '@/lib/auth-context';
import { isAdminEmail } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabibLogo } from '@/components/labib-logo';

type AuthMode = 'login' | 'signup';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.8 2.2-1.7 2.9l2.8 2.2c1.6-1.5 2.6-3.7 2.6-6.3 0-.6-.1-1.2-.2-1.8H12z" />
      <path fill="#34A853" d="M6.6 14.4 5.5 15.3l-3.8 3C4 21.1 7.7 23 12 23c3 0 5.5-1 7.4-2.7l-2.8-2.2c-.8.5-1.9.9-3.1.9-2.4 0-4.5-1.6-5.2-3.8z" />
      <path fill="#4A90E2" d="M2.2 7.7C1.4 9.3 1 11.1 1 13s.4 3.7 1.2 5.3l4.4-3.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9z" />
      <path fill="#FBBC05" d="M12 5.1c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.5 1.9 15 1 12 1 7.7 1 4 2.9 2.2 7.7l4.4 3.4C7.5 6.9 9.6 5.1 12 5.1z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    profile,
    userSubjects,
    loading,
    profileLoaded,
    signingIn,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading || !profileLoaded || !user) return;
    router.replace(isReturningStudent(profile, userSubjects) ? '/dashboard' : '/onboarding');
  }, [loading, profileLoaded, user, profile, userSubjects, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || signingIn) return;
    try {
      switch (mode) {
        case 'login':
          if (isAdminEmail(email) || email.trim().toLowerCase() === 'ahmad') {
            setSubmitting(true);
            const response = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
            if (response.ok) {
              router.replace('/admin');
              return;
            }
            toast.error('البريد أو كلمة السر غير صحيحة');
            return;
          }
          await signInWithEmail(email, password);
          return;
        case 'signup':
          if (!fullName.trim() || password.trim().length < 6) return;
          await signUpWithEmail(email, password, fullName);
          return;
        default: {
          const exhaustive: never = mode;
          return exhaustive;
        }
      }
    } catch {
      // Error toast is shown by auth context.
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center gradient-hero px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <LabibLogo size="lg" />
          <span className="text-2xl font-bold">لبيب</span>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-soft md:p-8">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-accent/50 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`h-11 rounded-xl text-sm font-semibold transition ${
                mode === 'login' ? 'gradient-primary text-white shadow-glow' : 'text-muted-foreground'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`h-11 rounded-xl text-sm font-semibold transition ${
                mode === 'signup' ? 'gradient-primary text-white shadow-glow' : 'text-muted-foreground'
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label className="mb-2 block">الاسم</Label>
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="مثال: أحمد محمد"
                  className="h-12 rounded-xl"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <Label className="mb-2 block">البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@email.com"
                className="h-12 rounded-xl"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <Label className="mb-2 block">كلمة السر</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'signup' ? '6 أحرف على الأقل' : '••••••••'}
                className="h-12 rounded-xl"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 6 : undefined}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={signingIn || submitting || (mode === 'signup' && (!fullName.trim() || password.trim().length < 6))}
              className="h-12 w-full rounded-2xl gradient-primary font-semibold"
            >
              {signingIn || submitting ? '...جاري التنفيذ' : mode === 'signup' ? 'إنشاء حساب' : 'دخول'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            أو
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={signingIn}
            onClick={() => void signInWithGoogle({ selectAccount: true })}
            className="h-12 w-full rounded-2xl"
          >
            <span className="flex items-center justify-center gap-2">
              <GoogleIcon />
              تسجيل الدخول عبر جوجل
            </span>
          </Button>

          <Button type="button" variant="ghost" className="mt-3 w-full rounded-xl" onClick={() => router.push('/')}>
            العودة للمنصة
          </Button>
        </div>
      </div>
    </div>
  );
}
