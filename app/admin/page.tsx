'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, LogOut, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabibLogo } from '@/components/labib-logo';
import { AdminActivationCodes } from '@/components/admin-activation-codes';
import { AdminUsersSheet } from '@/components/admin/admin-users-sheet';
import { AdminPublishHub } from '@/components/admin/admin-publish-hub';
import { ADMIN_EMAIL, loadAdminResources, type AdminResource, type AppSubscriber } from '@/lib/admin';
import { getStageLabel, type TawjihiStage } from '@/lib/utils';

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [items, setItems] = useState<AdminResource[]>([]);
  const [subscribers, setSubscribers] = useState<AppSubscriber[]>([]);
  const [publishStage, setPublishStage] = useState<TawjihiStage | null>(null);

  const refreshItems = async () => {
    setItems(await loadAdminResources());
  };

  const refreshSubscribers = async () => {
    try {
      const response = await fetch('/api/admin/subscribers', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as { subscribers?: AppSubscriber[] };
      setSubscribers(payload.subscribers ?? []);
    } catch {
      setSubscribers([]);
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        if (response.ok) {
          setAuthenticated(true);
          await refreshItems();
          await refreshSubscribers();
        }
      } finally {
        setChecking(false);
      }
    };
    void check();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const tick = window.setInterval(() => {
      void refreshSubscribers();
      void refreshItems();
    }, 20000);
    return () => window.clearInterval(tick);
  }, [authenticated]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoggingIn(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error || 'تعذر تسجيل الدخول');
        return;
      }
      setAuthenticated(true);
      setPassword('');
      await refreshItems();
      await refreshSubscribers();
      toast.success('تم الدخول إلى لوحة الأدمن');
    } catch {
      toast.error('تعذر الاتصال بالخادم');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setPublishStage(null);
    toast.success('تم تسجيل الخروج');
  };

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center gradient-hero">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center gradient-hero px-4">
        <Card className="w-full max-w-md rounded-3xl border-0 glass-card p-8 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">دخول الأدمن</h1>
              <p className="text-sm text-muted-foreground">لوحة إدارة محتوى لبيب</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="mb-2 block">البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={ADMIN_EMAIL}
                className="rounded-xl"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="mb-2 block">كلمة السر</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="rounded-xl"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={loggingIn} className="h-12 w-full rounded-2xl gradient-primary">
              {loggingIn ? 'جاري الدخول...' : 'دخول'}
            </Button>
            <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={() => router.push('/')}>
              العودة للمنصة
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <LabibLogo size="md" />
            <div className="min-w-0">
              <div className="font-bold">لوحة أدمن لبيب</div>
              <div className="truncate text-xs text-muted-foreground">
                {publishStage ? `نشر ${getStageLabel(publishStage)}` : 'اختر السنة ثم انشر المحتوى للطلاب'}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AdminUsersSheet subscribers={subscribers} />
            <Button variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        {publishStage ? (
          <AdminPublishHub
            stage={publishStage}
            items={items}
            onRefresh={refreshItems}
            onBack={() => setPublishStage(null)}
          />
        ) : (
          <>
            <AdminActivationCodes />

            <div>
              <h2 className="text-2xl font-bold">نشر المحتوى للطلاب</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                اختر السنة أولاً، ثم انشر الشرح والملخصات والأسئلة والامتحانات. يظهر فوراً في التطبيق حسب سنة الطالب.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {([
                { id: 'tawjihi_first' as const, count: items.filter((item) => item.stage === 'tawjihi_first').length },
                { id: 'tawjihi_second' as const, count: items.filter((item) => item.stage === 'tawjihi_second').length },
              ]).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPublishStage(option.id)}
                  className="rounded-3xl border-0 glass-card p-6 text-right shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div className="text-xl font-bold">{getStageLabel(option.id)}</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {option.count} مادة منشورة • شرح، ملخصات، وزارية، مقترحة، امتحانات إلكترونية
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
