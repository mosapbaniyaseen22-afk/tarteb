'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { loadQuizAttempts, loadSchedule, loadSessions } from '@/lib/app-data';
import { getGreeting, getStageLabel, getFieldLabel } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  BookOpen, FileText, Download, ClipboardList, Clock, Moon, Brain,
  Sparkles, ChevronLeft, CircleHelp, BookMarked
} from 'lucide-react';
import { MotivationTicker } from '@/components/motivation-ticker';
import { DashboardInsightCards } from '@/components/dashboard-insight-cards';
import { StudentSubscriptionCard } from '@/components/student-subscription-card';
import { jordanDateISO } from '@/lib/prayer-times';
import { subjectProgressPercent } from '@/lib/user-stats';
import type { QuizAttempt, UserSubject, ScheduleEntry, StudySession } from '@/lib/supabase';

const quickActions = [
  { href: '/subjects', label: 'شرح المواد', icon: BookOpen, color: '#2563EB', desc: 'شروحات مفصلة' },
  { href: '/subjects', label: 'التلخيصات', icon: FileText, color: '#14B8A6', desc: 'ملخصات سريعة' },
  { href: '/subjects', label: 'الدوسيات', icon: Download, color: '#F59E0B', desc: 'دوسيات جاهزة' },
  { href: '/exams', label: 'الامتحانات', icon: ClipboardList, color: '#8B5CF6', desc: 'وزارية ومقترحة' },
  { href: '/scheduler', label: 'تنظيم الوقت', icon: Clock, color: '#0EA5E9', desc: 'جدول ذكي' },
  { href: '/practice', label: 'اختبر نفسك', icon: CircleHelp, color: '#22C55E', desc: 'تدريب على الأسئلة' },
  { href: '/quran', label: 'ورد القرآن', icon: Moon, color: '#059669', desc: 'وردك اليومي' },
  { href: '/ai', label: 'لبيب AI', icon: Brain, color: '#EC4899', desc: 'مساعدك الذكي' },
];

export default function DashboardPage() {
  const { user, profile, userSubjects } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleEntry[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        const [nextAttempts, nextSchedule, nextSessions] = await Promise.all([
          loadQuizAttempts(user.id),
          loadSchedule(user.id, today),
          loadSessions(user.id),
        ]);
        setAttempts(nextAttempts);
        setSubjects(userSubjects);
        setTodaySchedule(nextSchedule);
        setSessions(nextSessions);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [user, userSubjects]);

  const todayISO = jordanDateISO();
  const todayAttempts = attempts.filter((attempt) => attempt.attempt_date === todayISO);

  const name = profile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'طالب';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">
            {getGreeting()}، {name} 👋
          </h1>
          <p className="text-muted-foreground">
            {profile?.stage && getStageLabel(profile.stage)}
            {profile?.study_field && ` • ${getFieldLabel(profile.study_field)}`}
          </p>
        </div>
        <MotivationTicker className="sm:w-[min(26rem,48%)]" />
      </motion.div>

      <StudentSubscriptionCard />

      <DashboardInsightCards
        tawjihiYear={profile?.tawjihi_year}
        attempts={attempts}
        sessions={sessions}
        todaySchedule={todaySchedule}
        todayISO={todayISO}
      />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="mb-4 text-lg font-semibold">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Link href={action.href}>
                <Card className="group h-full cursor-pointer rounded-2xl border-0 glass-card p-5 shadow-soft transition-all hover:shadow-glow">
                  <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${action.color}15`, color: action.color }}
                  >
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="font-semibold">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.desc}</div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom: Practice + Schedule */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">تدريب اليوم</h3>
              <Link href="/practice">
                <Button variant="ghost" size="sm" className="rounded-lg text-xs">
                  عرض الكل <ChevronLeft className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {todayAttempts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <CircleHelp className="h-8 w-8 opacity-40" />
                <p className="text-sm">لم تختبر نفسك اليوم بعد</p>
                <Link href="/practice">
                  <Button size="sm" className="rounded-xl gradient-primary">ابدأ اختباراً سريعاً</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAttempts.slice(0, 4).map((attempt) => (
                  <div key={attempt.id} className="flex items-center gap-3 rounded-xl bg-accent/50 p-3">
                    <CircleHelp className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{attempt.subject_name}</div>
                      <div className="text-xs text-muted-foreground">اختبار تدريبي</div>
                    </div>
                    <span className="text-sm font-bold text-primary">{attempt.correct}/{attempt.total}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">جدول اليوم</h3>
              <Link href="/scheduler">
                <Button variant="ghost" size="sm" className="rounded-lg text-xs">
                  عرض الكل <ChevronLeft className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {todaySchedule.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 opacity-40" />
                <p className="text-sm">لا يوجد جدول لليوم</p>
                <Link href="/scheduler">
                  <Button size="sm" className="rounded-xl gradient-primary">
                    <Sparkles className="h-4 w-4" />
                    نظم يومي
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySchedule.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-accent/50 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: entry.color }}>
                      {entry.start_time.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{entry.activity}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* My Subjects */}
      {subjects.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="mb-4 text-lg font-semibold">موادي الدراسية</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {subjects.map((us) => (
              <Link key={us.subject_id} href={`/subjects/${us.subject_id}`}>
                <Card className="group cursor-pointer rounded-2xl border-0 glass-card p-4 shadow-soft transition-all hover:shadow-glow hover:scale-[1.02]">
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${us.subjects.color}15`, color: us.subjects.color }}
                  >
                    <BookMarked className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold">{us.subjects.name_ar}</div>
                  <Progress value={subjectProgressPercent(us, attempts)} className="mt-2 h-1.5" />
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      ) : (
        <Card className="rounded-3xl border-0 glass-card p-8 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-semibold">ابدأ باختيار مرحلتك</h3>
          <p className="mt-1 text-sm text-muted-foreground">اختر توجيهي سنة أولى أو ثانية لعرض موادك</p>
          <Link href="/onboarding">
            <Button className="mt-4 rounded-xl gradient-primary">اختيار المرحلة</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
