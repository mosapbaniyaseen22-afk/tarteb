'use client';

import { useState } from 'react';
import { TimeWithPlanWizard } from '@/components/planner/time-with-plan-wizard';
import type { UserSubject } from '@/lib/supabase';

const PREVIEW_SUBJECTS: UserSubject[] = [
  {
    id: '1',
    user_id: 'preview',
    subject_id: 'math',
    progress: 0,
    stage: 'tawjihi_second',
    subjects: { id: 'math', name: 'math', name_ar: 'الرياضيات', stage: 'tawjihi_second', field: 'scientific', color: '#2563EB', icon: 'calculator' },
  },
  {
    id: '2',
    user_id: 'preview',
    subject_id: 'ar',
    progress: 0,
    stage: 'tawjihi_second',
    subjects: { id: 'ar', name: 'arabic', name_ar: 'اللغة العربية', stage: 'tawjihi_second', field: null, color: '#0F766E', icon: 'book' },
  },
  {
    id: '3',
    user_id: 'preview',
    subject_id: 'en',
    progress: 0,
    stage: 'tawjihi_second',
    subjects: { id: 'en', name: 'english', name_ar: 'اللغة الإنجليزية', stage: 'tawjihi_second', field: null, color: '#7C3AED', icon: 'languages' },
  },
  {
    id: '4',
    user_id: 'preview',
    subject_id: 'phy',
    progress: 0,
    stage: 'tawjihi_second',
    subjects: { id: 'phy', name: 'physics', name_ar: 'الفيزياء', stage: 'tawjihi_second', field: 'scientific', color: '#EA580C', icon: 'atom' },
  },
];

export default function SchedulePreviewPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-dvh gradient-hero p-6">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-3 text-2xl font-bold">نظّم يومك مع خطتك</h1>
        <p className="mb-6 text-sm text-muted-foreground">يومك، بعدين موادي بالساعات والأيام، بعدين مواعيد خلال اليوم.</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-3xl glass-card p-5 text-right shadow-soft"
        >
          <div className="font-bold">نظّم يومك مع خطتك</div>
          <p className="mt-1 text-sm text-muted-foreground">نومك ومدرستك، موادي، خلال اليوم، وبعدين الجدول</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">1. يومك</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">2. موادي</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">3. خلال اليوم</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">4. الجدول</span>
          </div>
        </button>
      </div>
      <TimeWithPlanWizard
        open={open}
        onOpenChange={setOpen}
        userId="preview"
        studentName="الطالب"
        plan={null}
        prayerTimes={{
          fajr: '04:50',
          dhuhr: '12:35',
          asr: '16:05',
          maghrib: '18:48',
          isha: '20:10',
          sunrise: '06:20',
          cityName: 'عمان',
          date: '2026-09-17',
          source: 'preview',
        }}
        userSubjects={PREVIEW_SUBJECTS}
        onCreated={() => undefined}
        onFinished={() => setOpen(false)}
      />
    </div>
  );
}
