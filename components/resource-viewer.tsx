'use client';

import { useMemo, useState } from 'react';
import { FileDown, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminFileUrl, resourceFileHref, resourceTypeLabel, type AdminResource } from '@/lib/admin';
import { questionsForResource } from '@/lib/practice';

type ResourceViewerProps = {
  item: AdminResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ResourceViewer({ item, open, onOpenChange }: ResourceViewerProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const questions = useMemo(() => (item ? questionsForResource(item) : []), [item]);
  const hasText = Boolean(item?.extractedText?.trim());
  const defaultTab = questions.length > 0 ? 'questions' : 'content';

  const score = useMemo(() => {
    const graded = questions.filter((question) => question.answerKey);
    if (graded.length === 0) return null;
    const correct = graded.filter((question, index) => answers[String(index)] === question.answerKey).length;
    return { correct, total: graded.length };
  }, [answers, questions]);

  const resetQuiz = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetQuiz();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-3xl">
        {item && (
          <>
            <DialogHeader className="text-right">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>
                {resourceTypeLabel(item.type)} • {item.subjectName}
                {item.year ? ` • ${item.year}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              {resourceFileHref(item) && (
                <Button variant="outline" className="rounded-xl" asChild>
                  <a href={resourceFileHref(item) ?? adminFileUrl(item.id)} target="_blank" rel="noreferrer">
                    <FileDown className="h-4 w-4" />
                    الملف الأصلي
                  </a>
                </Button>
              )}
              {item.externalUrl && (
                <Button variant="outline" className="rounded-xl" asChild>
                  <a href={item.externalUrl} target="_blank" rel="noreferrer">
                    <LinkIcon className="h-4 w-4" />
                    الرابط
                  </a>
                </Button>
              )}
            </div>

            <Tabs key={item.id} defaultValue={defaultTab} className="space-y-4">
              <TabsList className="rounded-2xl bg-accent/50 p-1">
                <TabsTrigger value="content" className="rounded-xl">المحتوى</TabsTrigger>
                {questions.length > 0 && (
                  <TabsTrigger value="questions" className="rounded-xl">الأسئلة ({questions.length})</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="content">
                {hasText ? (
                  <div className="whitespace-pre-wrap rounded-2xl bg-accent/40 p-4 text-sm leading-8">
                    {item.extractedText}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    لا يوجد نص مستخرج. افتح الملف الأصلي إن كان صورة ممسوحة أو بدون طبقة نص.
                  </p>
                )}
              </TabsContent>

              {questions.length > 0 && (
                <TabsContent value="questions" className="space-y-4">
                  {questions.map((question, index) => {
                    const answerId = String(index);
                    const selected = answers[answerId];
                    return (
                      <div key={`${item.id}-${answerId}-${question.number}`} className="rounded-2xl border border-border/60 p-4">
                        {(question.unit || question.lesson) && (
                          <p className="mb-2 text-xs text-muted-foreground">
                            {[question.unit, question.lesson].filter(Boolean).join(' • ')}
                          </p>
                        )}
                        <p className="font-medium">
                          {question.number}. {question.prompt}
                        </p>
                        {question.options.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {question.options.map((option) => {
                              const isSelected = selected === option.key;
                              const isCorrect = submitted && question.answerKey === option.key;
                              const isWrong = submitted && isSelected && question.answerKey && question.answerKey !== option.key;
                              return (
                                <button
                                  key={option.key}
                                  type="button"
                                  disabled={submitted}
                                  onClick={() => setAnswers((current) => ({ ...current, [answerId]: option.key }))}
                                  className={`flex w-full rounded-xl border px-3 py-2 text-right text-sm transition ${
                                    isCorrect
                                      ? 'border-green-500 bg-green-500/10'
                                      : isWrong
                                        ? 'border-destructive bg-destructive/10'
                                        : isSelected
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border hover:bg-accent'
                                  }`}
                                >
                                  {option.key}) {option.text}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">سؤال للمراجعة من الملف.</p>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      className="rounded-xl gradient-primary"
                      onClick={() => setSubmitted(true)}
                      disabled={submitted || questions.every((question) => question.options.length === 0)}
                    >
                      تصحيح الإجابات
                    </Button>
                    {submitted && (
                      <Button variant="outline" className="rounded-xl" onClick={resetQuiz}>
                        إعادة المحاولة
                      </Button>
                    )}
                    {submitted && score && (
                      <span className="text-sm font-semibold">
                        النتيجة: {score.correct} / {score.total}
                      </span>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
