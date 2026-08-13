'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BookOpen, Brain, Clock, CircleHelp, Trophy, Moon, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { LabibLogo } from '@/components/labib-logo';

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

export default function LandingPage() {
  const router = useRouter();
  const { user, profile, loading, signingIn, signInWithGoogle } = useAuth();

  const autoStarted = useRef(false);

  useEffect(() => {
    if (loading || autoStarted.current) return;
    if (user) {
      autoStarted.current = true;
      router.replace(profile?.onboarding_complete ? '/dashboard' : '/onboarding');
      return;
    }
    if (window.sessionStorage.getItem('labib-skip-auto-google')) return;
    autoStarted.current = true;
    void signInWithGoogle();
  }, [loading, user, profile, router, signInWithGoogle]);

  const startNow = async () => {
    window.sessionStorage.removeItem('labib-skip-auto-google');
    if (user && profile?.onboarding_complete) {
      router.push('/dashboard');
      return;
    }
    if (user) {
      router.push('/onboarding');
      return;
    }
    await signInWithGoogle();
  };

  const features = [
    { icon: BookOpen, title: 'شرح المواد', desc: 'شروحات مفصلة لجميع مواد التوجيهي', color: '#2563EB' },
    { icon: Brain, title: 'لبيب AI', desc: 'مساعد ذكي يجيب على أسئلتك ويشرح دروسك', color: '#14B8A6' },
    { icon: Clock, title: 'تنظيم الوقت', desc: 'جدول يومي ذكي يناسب وقتك وموادك', color: '#F59E0B' },
    { icon: CircleHelp, title: 'اختبر نفسك', desc: 'تدريب سريع على أسئلة موادك قبل الوزاري', color: '#22C55E' },
    { icon: Trophy, title: 'الامتحانات', desc: 'امتحانات سابقة لكل المواد والسنوات', color: '#8B5CF6' },
    { icon: Moon, title: 'ورد القرآن', desc: 'حافظ على وردك اليومي من القرآن الكريم', color: '#0EA5E9' },
  ];

  return (
    <div className="relative min-h-dvh overflow-x-hidden gradient-hero">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-secondary/20 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 right-1/3 h-80 w-80 rounded-full bg-accent-foreground/5 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-12">
        <div className="flex items-center gap-2">
          <LabibLogo size="md" />
          <span className="text-xl font-bold">لبيب</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-11 rounded-full px-4 glass-card md:px-6"
            onClick={() => {
              window.sessionStorage.setItem('labib-skip-auto-google', '1');
              router.push('/admin');
            }}
          >
            أدمن
          </Button>
          <Button
            variant="ghost"
            onClick={startNow}
            disabled={loading || signingIn}
            className="h-11 rounded-full px-4 glass-card md:px-6"
          >
            {user ? 'لوحة التحكم' : 'تسجيل الدخول'}
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-16 text-center md:px-6 md:pt-24 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full glass-card px-4 py-2 text-sm text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
            منصة طلاب التوجيهي الأولى في الأردن
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl font-extrabold leading-tight sm:text-4xl md:text-7xl"
        >
          تفوّق في التوجيهي<br />
          <span className="gradient-text">مع لبيب</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
        >
          منصة تعليمية متكاملة تجمع الشرح، التلخيصات، الدوسيات، الامتحانات السابقة،
          تنظيم الوقت، ومساعد ذكي — كل ما تحتاجه في مكان واحد.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex w-full flex-col items-stretch gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center"
        >
          <Button
            onClick={startNow}
            disabled={loading || signingIn}
            size="lg"
            className="h-14 w-full rounded-2xl gradient-primary px-8 text-base font-semibold shadow-glow hover:opacity-90 sm:w-auto"
          >
            {signingIn ? '...جاري تسجيل الدخول' : user ? 'متابعة' : (
              <span className="flex items-center gap-2">
                <GoogleIcon />
                ابدأ الآن بجوجل
              </span>
            )}
          </Button>

        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-4 md:gap-8"
        >
          {[
            { value: '+12', label: 'مادة دراسية' },
            { value: '+5000', label: 'طالب وطالبة' },
            { value: '+98%', label: 'رضا الطلاب' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl px-2 py-4 sm:px-4 sm:py-6">
              <div className="text-xl font-bold gradient-text sm:text-2xl md:text-4xl">{stat.value}</div>
              <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs md:text-sm">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center text-3xl font-bold md:text-4xl"
        >
          كل ما تحتاجه للنجاح
        </motion.h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass-card group rounded-3xl p-6 shadow-soft transition-all hover:shadow-glow"
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-4 pb-16 md:px-6 md:pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl p-6 text-center shadow-soft sm:p-10 md:p-16"
        >
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">ابدأ رحلتك نحو التفوق</h2>
          <p className="mb-8 text-muted-foreground">انضم لآلاف الطلاب الذين يستخدمون لبيب لتحقيق أعلى علاماتهم في التوجيهي</p>
          <Button
            onClick={startNow}
            disabled={loading || signingIn}
            size="lg"
            className="h-14 w-full rounded-2xl gradient-primary px-10 text-base font-semibold shadow-glow sm:w-auto"
          >
            {signingIn ? '...جاري تسجيل الدخول' : 'ابدأ بجوجل'}
          </Button>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} لبيب — منصة طلاب التوجيهي في الأردن
      </footer>
    </div>
  );
}
