'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabibLogo } from '@/components/labib-logo';
import { isReturningStudent, useAuth } from '@/lib/auth-context';
import { ACTIVATION_DURATION_DAYS, formatActivationCode } from '@/lib/activation';
import { activateSubscriptionCode, loadSubscriptionStatus } from '@/lib/subscription-client';

export default function ActivatePage() {
  const router = useRouter();
  const { user, profile, userSubjects, loading, profileLoaded, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (loading || !profileLoaded) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const run = async () => {
      const status = await loadSubscriptionStatus();
      setActive(status.active);
      setDaysLeft(status.daysLeft);
      setExpiresAt(status.expiresAt);
      setChecking(false);
    };
    void run();
  }, [loading, profileLoaded, user, router]);

  const goToApp = () => {
    router.replace(isReturningStudent(profile, userSubjects) ? '/dashboard' : '/onboarding');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await activateSubscriptionCode(code);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`تم تفعيل الاشتراك لمدة ${ACTIVATION_DURATION_DAYS} يوماً`);
      goToApp();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center gradient-hero px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <LabibLogo size="lg" />
          <span className="text-2xl font-bold">لبيب</span>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-soft md:p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">{active ? 'تجديد الاشتراك' : 'تفعيل الاشتراك'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {active && expiresAt
              ? `اشتراكك ساري حتى ${new Date(expiresAt).toLocaleDateString('ar-JO')} (متبقي ${daysLeft} يوماً). أدخل كوداً جديداً للتمديد شهراً إضافياً.`
              : `أدخل كود التفعيل الذي وصلك من الأدمن. كل كود يفتح المنصة لمدة ${ACTIVATION_DURATION_DAYS} يوماً.`}
          </p>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
            <div>
              <Label className="mb-2 block">كود التفعيل</Label>
              <Input
                value={code}
                onChange={(event) => setCode(formatActivationCode(event.target.value))}
                placeholder="LBIB-XXXX-XXXX"
                className="h-12 rounded-xl text-center font-mono tracking-widest"
                autoComplete="off"
                required
              />
            </div>
            <Button type="submit" disabled={submitting || code.trim().length < 8} className="h-12 w-full rounded-2xl gradient-primary font-semibold">
              {submitting ? '...جاري التفعيل' : active ? 'تمديد الاشتراك' : 'تفعيل لمدة شهر'}
            </Button>
          </form>

          {active && (
            <Button type="button" variant="ghost" className="mt-3 w-full rounded-xl" onClick={goToApp}>
              متابعة إلى المنصة
            </Button>
          )}

          <Button type="button" className="mt-3 h-12 w-full rounded-2xl" variant="outline" onClick={() => router.push('/subscribe')}>
            اشترك في لبيب+
          </Button>

          <Button type="button" variant="ghost" className="mt-2 w-full rounded-xl" onClick={goToApp}>
            العودة للمنصة
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="mt-2 w-full rounded-xl text-destructive"
            onClick={() => {
              void signOut().then(() => router.replace('/'));
            }}
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </div>
  );
}
