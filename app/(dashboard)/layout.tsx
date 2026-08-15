'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { getStageLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home, BookOpen, ClipboardList,
  Clock, Moon, Brain, User, BarChart3, Menu, X, Sun, LogOut, CircleHelp
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { LabibLogo } from '@/components/labib-logo';
import { pingSubscriberPresence } from '@/lib/subscriber-presence';

const navItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/subjects', label: 'المواد', icon: BookOpen },
  { href: '/exams', label: 'الامتحانات', icon: ClipboardList },
  { href: '/practice', label: 'اختبر نفسك', icon: CircleHelp },
  { href: '/scheduler', label: 'تنظيم الوقت', icon: Clock },
  { href: '/quran', label: 'ورد القرآن', icon: Moon },
  { href: '/ai', label: 'لبيب AI', icon: Brain },
  { href: '/statistics', label: 'الإحصائيات', icon: BarChart3 },
  { href: '/profile', label: 'الملف الشخصي', icon: User },
];

const mobileTabs = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/subjects', label: 'المواد', icon: BookOpen },
  { href: '/practice', label: 'اختبر', icon: CircleHelp },
  { href: '/scheduler', label: 'الجدول', icon: Clock },
  { href: '/ai', label: 'لبيب', icon: Brain },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const ping = async () => {
      if (cancelled) return;
      await pingSubscriberPresence({
        name: profile?.full_name || user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        stage: profile?.stage ?? null,
      });
    };

    void ping();
    const interval = window.setInterval(() => {
      void ping();
    }, 45000);
    window.addEventListener('focus', ping);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', ping);
    };
  }, [user, profile?.full_name, profile?.stage, user?.email, user?.full_name, user?.avatar_url]);

  const initials = (profile?.full_name || user?.full_name || 'طالب').charAt(0);

  const handleSignOut = async () => {
    await signOut();
    toast.success('تم تسجيل الخروج');
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-72 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col glass border-l border-border/40">
          {/* Logo */}
          <div className="flex items-center justify-between p-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <LabibLogo size="md" />
              <span className="text-xl font-bold">لبيب</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 lg:hidden rounded-xl"
              onClick={() => setSidebarOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 no-scrollbar">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'gradient-primary text-white shadow-glow'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle + User */}
          <div className="border-t border-border/40 p-4 space-y-3">
            <Button
              variant="ghost"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full justify-start rounded-xl"
            >
              {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {mounted && theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            </Button>
            <div className="flex items-center gap-3 rounded-xl glass-card p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="gradient-primary text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-semibold">{profile?.full_name || user.full_name}</div>
                {profile?.stage && (
                  <div className="truncate text-xs text-muted-foreground">
                    {getStageLabel(profile.stage)}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pr-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/40 bg-background/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-lg lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <LabibLogo size="sm" />
            <span className="font-bold">لبيب</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <main className="p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
        <div className="grid grid-cols-5">
          {mobileTabs.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : ''}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
