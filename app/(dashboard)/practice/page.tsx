'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { addQuizAttempt, loadQuizAttempts } from '@/lib/app-data';
import { useAdminResources } from '@/lib/use-admin-resources';
import {
  UNGROUPED_LESSON,
  UNGROUPED_UNIT,
  collectPracticeQuestions,
  countMcq,
  groupPracticeTree,
  lessonQuiz,
  questionsForResource,
  type PracticeLesson,
  type PracticeQuestion,
  type PracticeUnit,
} from '@/lib/practice';
import { jordanDateISO } from '@/lib/prayer-times';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, CircleHelp, Layers, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type { QuizAttempt, UserSubject } from '@/lib/supabase';

type QuizPhase = 'pick-subject' | 'pick-unit' | 'pick-lesson' | 'quiz' | 'result';

export default function PracticePage() {
  const { user, userSubjects, profile } = useAuth();
  const { resources, loading: resourcesLoading } = useAdminResources(profile?.stage);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [phase, setPhase] = useState<QuizPhase>('pick-subject');
  const [quiz, setQuiz] = useState<PracticeQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setSubjects(userSubjects);
      const nextAttempts = user ? await loadQuizAttempts(user.id) : [];
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
      if (questionsForResource(item).length === 0) return false;
      if (selectedName) return item.subjectName === 'الكل' || item.subjectName === selectedName;
      if (subjectNames.length === 0) return true;
      return item.subjectName === 'الكل' || subjectNames.includes(item.subjectName);
    });
  }, [resources, selectedName, subjectNames]);

  const pool = useMemo(
    () => collectPracticeQuestions(visibleResources, selectedName),
    [visibleResources, selectedName],
  );
  const units = useMemo(() => groupPracticeTree(pool), [pool]);
  const currentUnit: PracticeUnit | null = units.find((item) => item.name === selectedUnit) ?? null;
  const currentLesson: PracticeLesson | null = currentUnit?.lessons.find((item) => item.name === selectedLesson) ?? null;
  const lessonMcqCount = currentLesson ? countMcq(currentLesson.questions) : 0;

  const startLessonQuiz = (lesson = currentLesson) => {
    if (!lesson) return;
    const nextQuiz = lessonQuiz(lesson.questions);
    if (nextQuiz.length === 0) return;
    setQuiz(nextQuiz);
    setStep(0);
    setAnswers({});
    setPhase('quiz');
  };

  const chooseSubject = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedUnit(null);
    setSelectedLesson(null);
    setPhase('pick-subject');
  };

  const openUnits = () => {
    if (units.length === 0) return;
    if (units.length === 1) {
      const onlyUnit = units[0];
      if (!onlyUnit) return;
      setSelectedUnit(onlyUnit.name);
      setPhase('pick-lesson');
      return;
    }
    setPhase('pick-unit');
  };

  const chooseUnit = (unit: PracticeUnit) => {
    setSelectedUnit(unit.name);
    setSelectedLesson(null);
    setPhase('pick-lesson');
  };

  const chooseLesson = (lesson: PracticeLesson) => {
    setSelectedLesson(lesson.name);
    startLessonQuiz(lesson);
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

  const backFromPhase = (from: QuizPhase) => {
    switch (from) {
      case 'pick-unit':
        setPhase('pick-subject');
        return;
      case 'pick-lesson':
        setPhase(units.length > 1 ? 'pick-unit' : 'pick-subject');
        return;
      case 'quiz':
      case 'result':
        setPhase('pick-lesson');
        return;
      case 'pick-subject':
        return;
      default: {
        const exhaustive: never = from;
        return exhaustive;
      }
    }
  };

  if (loading || resourcesLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const subjectPicker = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedSubject === 'all' ? 'default' : 'outline'}
        className="rounded-full"
        onClick={() => chooseSubject('all')}
      >
        كل المواد
      </Button>
      {subjects.map((subject) => (
        <Button
          key={subject.subject_id}
          variant={selectedSubject === subject.subject_id ? 'default' : 'outline'}
          className="rounded-full"
          onClick={() => chooseSubject(subject.subject_id)}
        >
          {subject.subjects.name_ar}
        </Button>
      ))}
    </div>
  );

  const attemptsList = attempts.length > 0 ? (
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
  ) : null;

  let body: ReactNode;
  switch (phase) {
    case 'pick-subject':
      body = (
        <>
          {subjectPicker}
          <Card className="rounded-3xl border-0 glass-card p-8 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CircleHelp className="h-8 w-8" />
            </div>
            {pool.length === 0 ? (
              <>
                <h2 className="text-lg font-semibold">لا توجد أسئلة بعد</h2>
                <p className="mt-2 text-sm text-muted-foreground">سيظهر التدريب هنا عندما يُرفع كتاب أو بنك أسئلة للمادة</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">اختبر نفسك</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  اختر الوحدة ثم الدرس، وأجب عن أسئلة ضع دائرة
                </p>
                <Button onClick={openUnits} className="mt-5 rounded-xl gradient-primary">
                  <Sparkles className="h-4 w-4" />
                  اختيار الوحدة
                </Button>
              </>
            )}
          </Card>
          {attemptsList}
        </>
      );
      break;
    case 'pick-unit':
      body = (
        <>
          {subjectPicker}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">اختر الوحدة</h2>
            <Button variant="ghost" className="rounded-xl" onClick={() => backFromPhase('pick-unit')}>رجوع</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {units.map((unit) => {
              const mcq = unit.lessons.reduce((sum, lesson) => sum + countMcq(lesson.questions), 0);
              return (
                <button
                  key={unit.name}
                  type="button"
                  onClick={() => chooseUnit(unit)}
                  className="rounded-3xl border-0 glass-card p-5 text-right shadow-soft transition hover:-translate-y-0.5"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="font-semibold">{unit.name === UNGROUPED_UNIT ? 'أسئلة الكتاب' : unit.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {unit.lessons.length} درس • {mcq} سؤال ضع دائرة
                  </div>
                </button>
              );
            })}
          </div>
        </>
      );
      break;
    case 'pick-lesson':
      body = (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{selectedName || 'كل المواد'}</p>
              <h2 className="text-lg font-semibold">{currentUnit?.name === UNGROUPED_UNIT ? 'اختر الدرس' : currentUnit?.name}</h2>
            </div>
            <Button variant="ghost" className="rounded-xl" onClick={() => backFromPhase('pick-lesson')}>رجوع</Button>
          </div>
          <div className="grid gap-3">
            {(currentUnit?.lessons ?? []).map((lesson) => {
              const mcq = countMcq(lesson.questions);
              return (
                <button
                  key={lesson.name}
                  type="button"
                  onClick={() => chooseLesson(lesson)}
                  disabled={mcq === 0}
                  className="rounded-3xl border-0 glass-card p-5 text-right shadow-soft transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{lesson.name === UNGROUPED_LESSON ? 'أسئلة عامة' : lesson.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {mcq > 0 ? `${mcq} سؤال ضع دائرة` : 'لا توجد أسئلة ضع دائرة في هذا الدرس'}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      );
      break;
    case 'quiz':
      body = current ? (
        <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{current.unit || current.subjectName}</span>
            <div className="flex items-center gap-3">
              <span>{step + 1} / {quiz.length}</span>
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => backFromPhase('quiz')}>رجوع</Button>
            </div>
          </div>
          {current.lesson && (
            <p className="mb-3 text-xs text-muted-foreground">{current.lesson}</p>
          )}
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
      ) : null;
      break;
    case 'result':
      body = (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-3xl border-0 glass-card p-8 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">{score.correct} من {score.total}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentLesson?.name || quiz[0]?.lesson || 'نتيجة الاختبار'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {score.total > 0 && score.correct / score.total >= 0.7 ? 'ممتاز، ثبت هذا المستوى' : 'راجع الأخطاء وأعد المحاولة'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => startLessonQuiz()} className="rounded-xl gradient-primary" disabled={lessonMcqCount === 0}>
                <RotateCcw className="h-4 w-4" />
                اختبار جديد
              </Button>
              <Button variant="outline" onClick={() => backFromPhase('result')} className="rounded-xl">العودة للدروس</Button>
            </div>
          </Card>
        </motion.div>
      );
      break;
    default: {
      const exhaustive: never = phase;
      body = exhaustive;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">اختبر نفسك</h1>
        <p className="text-sm text-muted-foreground">مادة، ثم وحدة، ثم درس، ثم أسئلة ضع دائرة من الكتاب</p>
      </div>
      {body}
    </div>
  );
}
