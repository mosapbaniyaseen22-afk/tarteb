'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { addQuizAttempt, loadQuizAttempts } from '@/lib/app-data';
import { loadAdminResources, resourceMatchesSubject, type AdminQuestion, type AdminResource } from '@/lib/admin';
import { jordanDateISO } from '@/lib/prayer-times';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleHelp, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type { QuizAttempt, UserSubject } from '@/lib/supabase';

type PracticeQuestion = AdminQuestion & {
  resourceId: string;
  resourceTitle: string;
  subjectName: string;
};

type QuizPhase = 'pick' | 'quiz' | 'result';

const QUIZ_SIZE = 10;

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swap] as T;
    next[swap] = current as T;
  }
  return next;
}

function collectQuestions(resources: AdminResource[], subjectName: string | null) {
  const pool: PracticeQuestion[] = [];
  resources.forEach((resource) => {
    if (resource.questions.length === 0) return;
    if (subjectName && !resourceMatchesSubject(resource, subjectName)) return;
    resource.questions.forEach((question) => {
      pool.push({
        ...question,
        resourceId: resource.id,
        resourceTitle: resource.title,
        subjectName: resource.subjectName,
      });
    });
  });
  return pool;
}

export default function PracticePage() {
  const { user, userSubjects } = useAuth();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [resources, setResources] = useState<AdminResource[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [phase, setPhase] = useState<QuizPhase>('pick');
  const [quiz, setQuiz] = useState<PracticeQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setSubjects(userSubjects);
      const [nextResources, nextAttempts] = await Promise.all([
        loadAdminResources(),
        user ? loadQuizAttempts(user.id) : Promise.resolve([]),
      ]);
      setResources(nextResources);
      setAttempts(nextAttempts);
      setLoading(false);
    };
    void load();
  }, [user, userSubjects]);

  const subjectNames = useMemo(() => subjects.map((item) => item.subjects.name_ar), [subjects]);
  const selectedName = selectedSubject === 'all'
    ? null
    : subjects.find((item) => item.subject_id === selectedSubject)?.subjects.name_ar ?? selectedSubject;

  const visibleResources = useMemo(() => {
    return resources.filter((item) => {
      if (item.questions.length === 0) return false;
      if (selectedName) return resourceMatchesSubject(item, selectedName);
      if (subjectNames.length === 0) return true;
      return item.subjectName === 'الكل' || subjectNames.includes(item.subjectName);
    });
  }, [resources, selectedName, subjectNames]);

  const questionCount = collectQuestions(visibleResources, selectedName).length;

  const startQuiz = () => {
    const pool = collectQuestions(visibleResources, selectedName);
    const nextQuiz = shuffle(pool).slice(0, Math.min(QUIZ_SIZE, pool.length));
    if (nextQuiz.length === 0) return;
    setQuiz(nextQuiz);
    setStep(0);
    setAnswers({});
    setPhase('quiz');
  };

  const current = quiz[step];
  const selectedAnswer = answers[step];

  const finishQuiz = async (finalAnswers: Record<number, string>) => {
    const graded = quiz.filter((question) => question.answerKey);
    const correct = quiz.filter((question, index) => question.answerKey && finalAnswers[index] === question.answerKey).length;
    const total = graded.length || quiz.length;
    setScore({ correct, total });
    setPhase('result');
    if (!user) return;
    const saved = await addQuizAttempt({
      user_id: user.id,
      subject_name: selectedName || quiz[0]?.subjectName || 'الكل',
      resource_id: quiz.length === 1 ? quiz[0]?.resourceId ?? null : null,
      correct,
      total,
      attempt_date: jordanDateISO(),
    });
    setAttempts((prev) => [saved, ...prev]);
  };

  const chooseOption = (key: string) => {
    if (!current) return;
    const nextAnswers = { ...answers, [step]: key };
    setAnswers(nextAnswers);
    window.setTimeout(() => {
      if (step + 1 >= quiz.length) {
        void finishQuiz(nextAnswers);
        return;
      }
      setStep((value) => value + 1);
    }, 220);
  };

  const reset = () => {
    setPhase('pick');
    setQuiz([]);
    setStep(0);
    setAnswers({});
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">اختبر نفسك</h1>
        <p className="text-sm text-muted-foreground">تدريب سريع على أسئلة موادك، كما يرفعها الأدمن</p>
      </div>

      {phase === 'pick' && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSubject === 'all' ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setSelectedSubject('all')}
            >
              كل المواد
            </Button>
            {subjects.map((subject) => (
              <Button
                key={subject.subject_id}
                variant={selectedSubject === subject.subject_id ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setSelectedSubject(subject.subject_id)}
              >
                {subject.subjects.name_ar}
              </Button>
            ))}
          </div>

          <Card className="rounded-3xl border-0 glass-card p-8 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CircleHelp className="h-8 w-8" />
            </div>
            {questionCount === 0 ? (
              <>
                <h2 className="text-lg font-semibold">لا توجد أسئلة بعد</h2>
                <p className="mt-2 text-sm text-muted-foreground">سيظهر التدريب هنا عندما تُرفع أسئلة لموادك</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">اختبار سريع</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {Math.min(QUIZ_SIZE, questionCount)} أسئلة من {questionCount} سؤال متاح
                </p>
                <Button onClick={startQuiz} className="mt-5 rounded-xl gradient-primary">
                  <Sparkles className="h-4 w-4" />
                  ابدأ الآن
                </Button>
              </>
            )}
          </Card>

          {attempts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">آخر نتائجك</h3>
              {attempts.slice(0, 5).map((attempt) => (
                <Card key={attempt.id} className="flex items-center justify-between rounded-2xl border-0 glass-card px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{attempt.subject_name}</div>
                    <div className="text-xs text-muted-foreground">{attempt.attempt_date}</div>
                  </div>
                  <div className="text-sm font-bold text-primary">
                    {attempt.correct}/{attempt.total}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {phase === 'quiz' && current && (
        <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{current.subjectName}</span>
            <span>{step + 1} / {quiz.length}</span>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full gradient-primary" style={{ width: `${((step + 1) / quiz.length) * 100}%` }} />
          </div>
          <h2 className="text-lg font-semibold leading-relaxed">{current.prompt}</h2>
          <div className="mt-5 space-y-2">
            {current.options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => chooseOption(option.key)}
                className={`w-full rounded-2xl border px-4 py-3 text-right text-sm transition ${
                  selectedAnswer === option.key
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-transparent bg-accent/60 hover:bg-accent'
                }`}
              >
                <span className="ml-2 font-bold text-primary">{option.key}</span>
                {option.text}
              </button>
            ))}
          </div>
        </Card>
      )}

      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-3xl border-0 glass-card p-8 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">{score.correct} من {score.total}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {score.total > 0 && score.correct / score.total >= 0.7 ? 'ممتاز، ثبت هذا المستوى' : 'راجع الأخطاء وأعد المحاولة'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={startQuiz} className="rounded-xl gradient-primary" disabled={questionCount === 0}>
                <RotateCcw className="h-4 w-4" />
                اختبار جديد
              </Button>
              <Button variant="outline" onClick={reset} className="rounded-xl">العودة</Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
