'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { loadQuizAttempts, loadSessions } from '@/lib/app-data';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Clock, CheckCircle2, BookOpen, TrendingUp } from 'lucide-react';
import type { QuizAttempt, UserSubject, StudySession } from '@/lib/supabase';
import {
  averageProgress,
  completedQuizCount,
  monthlyPerformance,
  studyHoursValue,
  subjectChartData,
  totalStudyMinutes,
  weeklyPerformance,
} from '@/lib/user-stats';

const PIE_COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#0EA5E9'];

export default function StatisticsPage() {
  const { user, userSubjects } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [nextAttempts, nextSessions] = await Promise.all([
          loadQuizAttempts(user.id),
          loadSessions(user.id),
        ]);
        setAttempts(nextAttempts);
        setSubjects(userSubjects);
        setSessions(nextSessions);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, userSubjects]);

  const stats = useMemo(() => {
    const minutes = totalStudyMinutes([], sessions);
    const weeklyData = weeklyPerformance(sessions, attempts);
    const monthlyData = monthlyPerformance([], sessions);
    const subjectData = subjectChartData(subjects, attempts);
    return {
      completedQuizzes: completedQuizCount(attempts),
      studyHours: studyHoursValue(minutes),
      averageProgress: averageProgress(subjects, attempts),
      weeklyData,
      monthlyData,
      subjectData,
      hasSubjectProgress: subjectData.some((item) => item.value > 0),
    };
  }, [attempts, sessions, subjects]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإحصائيات</h1>
        <p className="text-sm text-muted-foreground">تبدأ من صفر وتتحرك مع مذاكرتك واختباراتك</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Clock, label: 'ساعات المذاكرة', value: stats.studyHours, color: '#2563EB' },
          { icon: CheckCircle2, label: 'اختبارات مكتملة', value: stats.completedQuizzes, color: '#22C55E' },
          { icon: BookOpen, label: 'عدد المواد', value: subjects.length, color: '#14B8A6' },
          { icon: TrendingUp, label: 'متوسط التقدم', value: stats.averageProgress, color: '#F59E0B', suffix: '%' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{stat.value}{stat.suffix || ''}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="overflow-hidden rounded-3xl border-0 glass-card p-4 shadow-soft sm:p-6">
          <h3 className="mb-4 font-semibold">الأداء الأسبوعي</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals allowDataOverflow={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
              <Bar dataKey="ساعات" fill="#2563EB" radius={[8, 8, 0, 0]} />
              <Bar dataKey="اختبارات" fill="#14B8A6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="overflow-hidden rounded-3xl border-0 glass-card p-4 shadow-soft sm:p-6">
            <h3 className="mb-4 font-semibold">الأداء الشهري</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="ساعات" stroke="#2563EB" strokeWidth={3} dot={{ fill: '#2563EB', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden rounded-3xl border-0 glass-card p-4 shadow-soft sm:p-6">
            <h3 className="mb-4 font-semibold">تقدم المواد</h3>
            {stats.hasSubjectProgress ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {stats.subjectData.map((entry, i) => (
                      <Cell key={entry.name} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} />
                  <Legend fontSize={11} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
                لا يوجد تقدم بعد. اختبر نفسك في المواد لتظهر النسب هنا.
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
