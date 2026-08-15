'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { BookOpen, Brain, Clock, CircleHelp, Trophy, Moon, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isReturningStudent, useAuth } from '@/lib/auth-context';
import { LabibLogo } from '@/components/labib-logo';

export default function LandingPage() {
  const router = useRouter();
  const { user, profile, userSubjects, loading, profileLoaded, signingIn } = useAuth();

  useEffect(() => {
    if (loading || !profileLoaded || !user) return;
    router.replace(isReturningStudent(profile, userSubjects) ? '/dashboard' : '/onboarding');
  }, [loading, profileLoaded, user, profile, userSubjects, router]);

  const startNow = () => {
    if (user && isReturningStudent(profile, userSubjects)) {
      router.push('/dashboard');
      return;
    }
    if (user) {
      router.push('/onboarding');
      return;
    }
    router.push('/login');
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
            {signingIn ? '...جاري تسجيل الدخول' : user ? 'متابعة' : 'ابدأ الآن'}
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
            {signingIn ? '...جاري تسجيل الدخول' : 'ابدأ الآن'}
          </Button>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} لبيب — منصة طلاب التوجيهي في الأردن
      </footer>
    </div>
  );
}
