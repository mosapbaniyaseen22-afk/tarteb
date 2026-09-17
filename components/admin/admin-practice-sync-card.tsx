'use client';

import { useState } from 'react';
import { CircleHelp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { type AdminResource } from '@/lib/admin';
import { isPracticeSourceType, NO_PRACTICE_SENTINEL, questionsForResource } from '@/lib/practice';

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error('الخادم لم يُرجع رداً. حاول مرة أخرى.');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('تعذر قراءة رد الخادم. حاول مرة أخرى.');
  }
}

function needsPracticeSync(item: AdminResource) {
  if (!isPracticeSourceType(item.type)) return false;
  return !item.questions.some((question) => (
    question.prompt
    && question.prompt !== NO_PRACTICE_SENTINEL
    && question.options.length >= 2
  ));
}

type AdminPracticeSyncCardProps = {
  items: AdminResource[];
  onRefresh: () => Promise<void>;
};

export function AdminPracticeSyncCard({ items, onRefresh }: AdminPracticeSyncCardProps) {
  const [syncing, setSyncing] = useState(false);
  const pending = items.filter(needsPracticeSync);
  const ready = items.filter((item) => questionsForResource(item).length > 0).length;

  const syncPracticeFromPublished = async () => {
    setSyncing(true);
    try {
      let remaining = 1;
      let extracted = 0;
      let safety = 0;
      while (remaining > 0 && safety < 40) {
        safety += 1;
        const response = await fetch('/api/admin/sync-practice', { method: 'POST' });
        const payload = await readJsonResponse<{ error?: string; remaining?: number; updated?: number; quizzes?: number }>(response);
        if (!response.ok) {
          toast.error(payload.error || 'تعذر تحديث امتحانات الطلاب');
          return;
        }
        remaining = payload.remaining ?? 0;
        const quizzes = payload.quizzes ?? payload.updated ?? 0;
        if (quizzes > 0) extracted += quizzes;
      }
      await onRefresh();
      toast.success(
        extracted > 0
          ? `صار في امتحانات للطلاب: ${extracted} سؤال من المواد المنشورة`
          : 'امتحانات الطلاب جاهزة من المواد المنشورة',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث امتحانات الطلاب');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CircleHelp className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold">تحديث اختبر نفسك للطلاب</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            يسحب الأسئلة من المواد والامتحانات المنشورة، ويعمل منها امتحانات بنمط وزاري في حسابات الطلاب داخل التطبيق.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {ready} ملف جاهز للطلاب
            {pending.length > 0 ? ` • ${pending.length} ملف يحتاج تحديث` : ''}
          </p>
        </div>
        <Button
          className="h-12 shrink-0 rounded-2xl gradient-primary"
          disabled={syncing}
          onClick={() => {
            void syncPracticeFromPublished();
          }}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'جاري التحديث للطلاب...' : 'تحديث امتحانات الطلاب'}
        </Button>
      </div>
    </Card>
  );
}
