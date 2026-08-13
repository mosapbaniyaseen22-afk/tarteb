'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { loadQuizAttempts } from '@/lib/app-data';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronLeft, BookMarked } from 'lucide-react';
import type { QuizAttempt, UserSubject } from '@/lib/supabase';
import { subjectProgressPercent } from '@/lib/user-stats';

export default function SubjectsPage() {
  const { user, userSubjects } = useAuth();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setSubjects(userSubjects);
      if (user) setAttempts(await loadQuizAttempts(user.id));
      setLoading(false);
    };
    void load();
  }, [user, userSubjects]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">موادي الدراسية</h1>
        <p className="text-sm text-muted-foreground">{subjects.length} مادة</p>
      </div>

      {subjects.length === 0 ? (
        <Card className="rounded-3xl border-0 glass-card p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">لا توجد مواد</h3>
          <p className="mt-2 text-sm text-muted-foreground">لم يتم اختيار مواد بعد</p>
          <Link href="/onboarding">
            <Button className="mt-4 rounded-xl gradient-primary">اختر مرحلتك الدراسية</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subjects.map((us, i) => (
            <motion.div
              key={us.subject_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Link href={`/subjects/${us.subject_id}`}>
                <Card className="group cursor-pointer rounded-3xl border-0 glass-card p-6 shadow-soft transition-all hover:shadow-glow">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${us.subjects.color}15`, color: us.subjects.color }}
                    >
                      <BookMarked className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{us.subjects.name_ar}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={subjectProgressPercent(us, attempts)} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground">{subjectProgressPercent(us, attempts)}%</span>
                      </div>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
