'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, FileDown, Filter, Link as LinkIcon } from 'lucide-react';
import { ResourceViewer } from '@/components/resource-viewer';
import { resourceFileHref, resourceMatchesSubject, type AdminResource } from '@/lib/admin';
import { useAdminResources } from '@/lib/use-admin-resources';
import type { UserSubject } from '@/lib/supabase';

export default function ExamsPage() {
  const { userSubjects, profile } = useAuth();
  const { resources, loading } = useAdminResources(profile?.stage);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewerItem, setViewerItem] = useState<AdminResource | null>(null);

  useEffect(() => {
    setSubjects(userSubjects);
  }, [userSubjects]);

  const selectedSubjectName =
    selectedSubject === 'all'
      ? null
      : subjects.find((item) => item.subject_id === selectedSubject)?.subjects.name_ar ?? null;

  const visible = useMemo(() => {
    return resources.filter((item) => {
      const examType = item.type === 'ministerial_exam' || item.type === 'suggested_exam' || item.type === 'electronic_exam';
      if (!examType) return false;
      if (selectedYear !== 'all' && String(item.year ?? '') !== selectedYear) return false;
      if (selectedSubjectName && !resourceMatchesSubject(item, selectedSubjectName)) return false;
      if (selectedSubject === 'all') {
        if (subjects.length === 0) return true;
        const names = subjects.map((row) => row.subjects.name_ar);
        return item.subjectName === 'الكل' || names.includes(item.subjectName);
      }
      return true;
    });
  }, [resources, selectedYear, selectedSubject, selectedSubjectName, subjects]);

  const years = Array.from(
    new Set(resources.filter((item) => item.year).map((item) => String(item.year))),
  ).sort((a, b) => Number(b) - Number(a));

  const ministerial = visible.filter((item) => item.type === 'ministerial_exam');
  const suggested = visible.filter((item) => item.type === 'suggested_exam');
  const electronic = visible.filter((item) => item.type === 'electronic_exam');

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const renderList = (items: AdminResource[], emptyText: string) => {
    if (items.length === 0) {
      return (
        <Card className="rounded-3xl border-0 glass-card p-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <Card
              className="flex cursor-pointer items-center gap-4 rounded-3xl border-0 glass-card p-5 shadow-soft"
              onClick={() => setViewerItem(item)}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {item.subjectName}{item.year ? ` • ${item.year}` : ''}{item.questions.length > 0 ? ` • ${item.questions.length} سؤال` : ''}
                </p>
              </div>
              {item.fileName && resourceFileHref(item) && (
                <a
                  href={resourceFileHref(item) ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl p-2 hover:bg-accent"
                  onClick={(event) => event.stopPropagation()}
                >
                  <FileDown className="h-5 w-5" />
                </a>
              )}
              {item.externalUrl && (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl p-2 hover:bg-accent"
                  onClick={(event) => event.stopPropagation()}
                >
                  <LinkIcon className="h-5 w-5" />
                </a>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الامتحانات</h1>
        <p className="text-sm text-muted-foreground">امتحانات وزارية ومقترحة يرفعها الأدمن</p>
      </div>

      <Card className="flex flex-col gap-3 rounded-3xl border-0 glass-card p-4 shadow-soft sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" /> تصفية:
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="rounded-xl sm:w-40"><SelectValue placeholder="السنة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل السنوات</SelectItem>
            {years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="rounded-xl sm:w-40"><SelectValue placeholder="المادة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المواد</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject.subject_id} value={subject.subject_id}>{subject.subjects.name_ar}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">الامتحانات الوزارية</h2>
        {renderList(ministerial, 'لا توجد امتحانات وزارية بعد')}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">الامتحانات المقترحة</h2>
        {renderList(suggested, 'لا توجد امتحانات مقترحة بعد')}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">الامتحانات الإلكترونية</h2>
        {renderList(electronic, 'لا توجد امتحانات إلكترونية بعد')}
      </section>

      <ResourceViewer item={viewerItem} open={Boolean(viewerItem)} onOpenChange={(open) => { if (!open) setViewerItem(null); }} />
    </div>
  );
}
