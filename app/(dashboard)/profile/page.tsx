'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { loadQuizAttempts, loadSessions } from '@/lib/app-data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getStageLabel, getFieldLabel, normalizeTawjihiStage } from '@/lib/utils';
import { averageProgress, completedQuizCount, studyHoursValue, subjectProgressPercent, totalStudyMinutes } from '@/lib/user-stats';
import { toast } from 'sonner';
import {
  User, MapPin, GraduationCap, Calendar, BookOpen, Trophy,
  Award, TrendingUp, CircleHelp, Clock, Star, LogOut, Pencil
} from 'lucide-react';
import type { UserSubject, QuizAttempt, StudySession } from '@/lib/supabase';
import { StudentSubscriptionCard } from '@/components/student-subscription-card';
import { SecondYearEnrollmentDialog } from '@/components/second-year-enrollment-dialog';
import { EditStudyFieldDialog } from '@/components/edit-study-field-dialog';
import { YearAccountSwitch } from '@/components/year-account-switch';

export default function ProfilePage() {
  const { user, profile, userSubjects, signOut, enrolledStages, switchStage } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [secondYearOpen, setSecondYearOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [nextAttempts, nextSessions] = await Promise.all([
          loadQuizAttempts(user.id),
          loadSessions(user.id),
        ]);
        setSubjects(userSubjects);
        setAttempts(nextAttempts);
        setSessions(nextSessions);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, userSubjects]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const quizCount = completedQuizCount(attempts);
  const totalHours = studyHoursValue(totalStudyMinutes([], sessions));
  const avgProgress = averageProgress(subjects, attempts);

  const achievements = [
    { icon: Star, title: 'بداية المشوار', desc: 'أكملت التسجيل', earned: true, color: '#2563EB' },
    { icon: CircleHelp, title: 'متدرّب', desc: 'أكملت 5 اختبارات', earned: quizCount >= 5, color: '#22C55E' },
    { icon: Clock, title: 'مجتهد', desc: '10 ساعات مذاكرة', earned: totalHours >= 10, color: '#14B8A6' },
    { icon: Trophy, title: 'متفوق', desc: 'أكملت 20 اختباراً', earned: quizCount >= 20, color: '#F59E0B' },
    { icon: Award, title: 'إمتحان قريب', desc: 'أقل من 100 يوم', earned: false, color: '#8B5CF6' },
    { icon: TrendingUp, title: 'صعود مستمر', desc: '50% تقدم', earned: avgProgress >= 50, color: '#EC4899' },
  ];

  const initials = (profile?.full_name || user?.full_name || 'طالب').charAt(0);
  const hasSecondYear = enrolledStages.includes('tawjihi_second');
  const activeStage = normalizeTawjihiStage(profile?.stage);

  const handleSwitchYear = async (stage: 'tawjihi_first' | 'tawjihi_second') => {
    if (stage === activeStage) return;
    setSwitching(true);
    try {
      await switchStage(stage);
      const message = (() => {
        switch (stage) {
          case 'tawjihi_second':
            return 'تم التبديل لحساب السنة الثانية';
          case 'tawjihi_first':
            return 'تم التبديل لحساب السنة الأولى';
          default: {
            const exhaustive: never = stage;
            return exhaustive;
          }
        }
      })();
      toast.success(message);
    } catch (error) {
      console.error(error);
      toast.error('تعذر تبديل السنة');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden rounded-3xl border-0 glass-card p-8 shadow-soft">
          <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-24 w-24 border-4 border-background shadow-glow">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl font-bold gradient-primary text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-right">
              <h1 className="text-2xl font-bold">{profile?.full_name || user?.full_name}</h1>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {profile?.stage && <Badge variant="secondary" className="rounded-full">{getStageLabel(profile.stage)}</Badge>}
                {profile?.region && <Badge variant="secondary" className="rounded-full">{profile.region}</Badge>}
                {profile?.study_field && <Badge variant="secondary" className="rounded-full">{getFieldLabel(profile.study_field)}</Badge>}
                {profile?.tawjihi_year && <Badge variant="secondary" className="rounded-full">توجيهي {profile.tawjihi_year}</Badge>}
              </div>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto">
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut();
                  toast.success('تم تسجيل الخروج');
                  router.push('/');
                }}
                className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
              {hasSecondYear ? (
                <YearAccountSwitch
                  activeStage={profile?.stage ?? null}
                  disabled={switching}
                  onSwitch={(stage) => {
                    void handleSwitchYear(stage);
                  }}
                />
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setSecondYearOpen(true)}
                  className="rounded-xl"
                >
                  <GraduationCap className="h-4 w-4" />
                  التسجيل سنة ثانية توجيهي
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setFieldOpen(true)}
                className="rounded-xl"
              >
                <Pencil className="h-4 w-4" />
                {profile?.study_field ? 'تعديل الحقل' : 'اختيار الحقل'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <SecondYearEnrollmentDialog open={secondYearOpen} onOpenChange={setSecondYearOpen} />
      <EditStudyFieldDialog open={fieldOpen} onOpenChange={setFieldOpen} />

      <StudentSubscriptionCard />

      {/* Info grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Personal info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
            <h3 className="mb-4 font-semibold">المعلومات الشخصية</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">الاسم:</span>
                <span className="text-sm font-medium">{profile?.full_name || 'غير محدد'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">المحافظة:</span>
                <span className="text-sm font-medium">{profile?.region || 'غير محدد'}</span>
              </div>
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">المرحلة:</span>
                <span className="text-sm font-medium">{profile?.stage ? getStageLabel(profile.stage) : 'غير محدد'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">سنة التوجيهي:</span>
                <span className="text-sm font-medium">{profile?.tawjihi_year || 'غير محدد'}</span>
              </div>
              {profile?.study_field && (
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">الفرع:</span>
                  <span className="text-sm font-medium">{getFieldLabel(profile.study_field)}</span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Stats summary */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
            <h3 className="mb-4 font-semibold">إحصائياتي</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{subjects.length}</div>
                <div className="text-xs text-muted-foreground">مواد</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{quizCount}</div>
                <div className="text-xs text-muted-foreground">اختبارات مكتملة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{totalHours}</div>
                <div className="text-xs text-muted-foreground">ساعات مذاكرة</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">{avgProgress}%</div>
                <div className="text-xs text-muted-foreground">متوسط التقدم</div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* My Subjects */}
      {subjects.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
            <h3 className="mb-4 font-semibold">موادي الدراسية</h3>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <Badge key={s.subject_id} className="rounded-xl px-3 py-2" style={{ backgroundColor: `${s.subjects.color}15`, color: s.subjects.color }}>
                  {s.subjects.name_ar} — {subjectProgressPercent(s, attempts)}%
                </Badge>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h3 className="mb-4 text-lg font-semibold">الإنجازات</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {achievements.map((ach, i) => (
            <Card
              key={i}
              className={`rounded-2xl border-0 p-4 text-center transition-all ${
                ach.earned ? 'glass-card shadow-soft hover:shadow-glow' : 'opacity-40 grayscale'
              }`}
            >
              <div
                className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${ach.color}15`, color: ach.color }}
              >
                <ach.icon className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold">{ach.title}</div>
              <div className="text-xs text-muted-foreground">{ach.desc}</div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
