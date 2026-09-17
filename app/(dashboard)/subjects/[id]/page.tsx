'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { addBookmark as saveBookmark, addNote as saveNote, deleteBookmark, deleteNote as removeNote, loadBookmarks, loadNotes, loadQuizAttempts } from '@/lib/app-data';
import { guestStore } from '@/lib/guest-db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  BookOpen, FileText, Download, ClipboardList, NotebookPen,
  Bookmark, Plus, Trash2, BookMarked, ArrowRight, Play, FileDown, Link as LinkIcon, CircleHelp, Lock
} from 'lucide-react';
import { ResourceViewer } from '@/components/resource-viewer';
import { SubscriptionGate } from '@/components/subscription-gate';
import { subjectProgressPercent } from '@/lib/user-stats';
import type { Subject, Note } from '@/lib/supabase';
import {
  resourceDownloadAnchorProps,
  resourceMatchesSubject,
  type AdminResource,
  type AdminResourceType,
} from '@/lib/admin';
import { useAdminResources } from '@/lib/use-admin-resources';
import { useSubscription } from '@/lib/use-subscription';

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, userSubjects, profile } = useAuth();
  const { resources } = useAdminResources(profile?.stage);
  const { active: subscribed } = useSubscription();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [viewerItem, setViewerItem] = useState<AdminResource | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const local = userSubjects.find((item) => item.subject_id === id) ?? guestStore.findSubject(id);
        if (local) setSubject(local.subjects);
        const attempts = user ? await loadQuizAttempts(user.id) : guestStore.getQuizAttempts();
        if (local) setProgress(subjectProgressPercent(local, attempts));
        if (user) {
          setNotes(await loadNotes(user.id, id));
          setBookmarks(await loadBookmarks(user.id, id));
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, user, userSubjects]);

  const addNote = async () => {
    if (!user || !id || !newNoteTitle.trim()) return;
    const data = await saveNote({
      user_id: user.id, subject_id: id, title: newNoteTitle.trim(), content: newNote.trim(),
    });
    if (data) setNotes((prev) => [data, ...prev]);
    setNewNote(''); setNewNoteTitle('');
    toast.success('تم حفظ الملاحظة');
  };

  const deleteNote = async (noteId: string) => {
    await removeNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const addBookmark = async (title: string, type: string) => {
    if (!user || !id) return;
    const data = await saveBookmark({
      user_id: user.id, subject_id: id, title, content_type: type,
    });
    if (data) setBookmarks((prev) => [data, ...prev]);
    toast.success('تم الحفظ في المحفوظات');
  };

  const removeBookmark = async (bmId: string) => {
    await deleteBookmark(bmId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bmId));
  };

  const subjectResources = (types: AdminResourceType[]) =>
    resources.filter((item) => types.includes(item.type) && resourceMatchesSubject(item, subject?.name_ar ?? ''));

  const renderResources = (
    types: AdminResourceType[],
    icon: typeof BookOpen,
    emptyText: string,
    colorClass: string,
  ) => {
    const rows = subjectResources(types);
    if (rows.length === 0) {
      return (
        <Card className="rounded-2xl border-0 glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </Card>
      );
    }

    return rows.map((item, index) => {
      const Icon = icon;
      const download = resourceDownloadAnchorProps(item);
      const openFallback = () => {
        if (item.externalUrl) {
          window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        if (item.type === 'electronic_exam') {
          setViewerItem(item);
          return;
        }
        toast.error('الملف الأصلي غير جاهز للتحميل');
      };
      return (
      <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
        <Card className="relative z-0 overflow-hidden rounded-2xl border-0 glass-card p-4 shadow-soft">
          {download ? (
            <a
              {...download}
              className="flex min-w-0 flex-col gap-3 text-inherit no-underline"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="break-words font-semibold leading-snug">{item.title}</h3>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {item.description || item.fileName || 'محتوى من الأدمن'}
                  {item.year ? ` • ${item.year}` : ''}
                  {item.questions.length > 0 ? ` • ${item.questions.length} سؤال` : ''}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                <FileDown className="h-4 w-4" />
                تحميل
              </span>
            </a>
          ) : (
            <button
              type="button"
              className="flex min-w-0 w-full flex-col gap-3 text-right"
              onClick={openFallback}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="break-words font-semibold leading-snug">{item.title}</h3>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {item.description || item.fileName || 'محتوى من الأدمن'}
                  {item.year ? ` • ${item.year}` : ''}
                  {item.questions.length > 0 ? ` • ${item.questions.length} سؤال` : ''}
                </p>
              </div>
            </button>
          )}
          <div className="mt-3 flex items-center justify-end gap-1">
            {item.externalUrl && !download && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl p-2 hover:bg-accent"
              >
                <LinkIcon className="h-5 w-5" />
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => {
                void addBookmark(item.title, item.type);
              }}
            >
              <Bookmark className="h-5 w-5" />
            </Button>
          </div>
        </Card>
      </motion.div>
      );
    });
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!subject) {
    return (
      <Card className="rounded-3xl border-0 glass-card p-12 text-center">
        <h3 className="text-lg font-semibold">المادة غير موجودة</h3>
        <Button onClick={() => router.push('/subjects')} className="mt-4 rounded-xl gradient-primary">العودة للمواد</Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative z-10 space-y-4 bg-background pb-5">
        <Button variant="ghost" onClick={() => router.push('/subjects')} className="h-11 rounded-xl px-2">
          <ArrowRight className="h-5 w-5" />
          المواد
        </Button>
        <div className="space-y-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
          >
            <BookMarked className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold leading-tight">{subject.name_ar}</h1>
            <p className="mt-1 text-sm text-muted-foreground">تقدمك في المادة</p>
          </div>
        </div>

        <Card className="rounded-3xl border-0 glass-card p-5 shadow-soft sm:p-6">
          <div className="mb-2 flex justify-between gap-3">
            <span className="text-sm font-medium">التقدم الإجمالي</span>
            <span className="text-sm font-bold gradient-text">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </Card>
      </div>

      <Tabs defaultValue="lessons" className="relative z-0">
        <div className="relative z-10 -mx-4 overflow-x-auto bg-background px-4 pb-2">
          <TabsList className="flex h-auto w-max min-w-full justify-start gap-1 rounded-2xl bg-accent/50 p-1">
            <TabsTrigger value="lessons" className="h-11 shrink-0 rounded-xl px-3 text-sm">شرح</TabsTrigger>
            <TabsTrigger value="summaries" className="h-11 shrink-0 gap-1 rounded-xl px-3 text-sm">
              تلخيصات
              {!subscribed && <Lock className="h-3.5 w-3.5" />}
            </TabsTrigger>
            <TabsTrigger value="dossiers" className="h-11 shrink-0 gap-1 rounded-xl px-3 text-sm">
              دوسيات
              {!subscribed && <Lock className="h-3.5 w-3.5" />}
            </TabsTrigger>
            <TabsTrigger value="exams" className="h-11 shrink-0 rounded-xl px-3 text-sm">امتحانات</TabsTrigger>
            <TabsTrigger value="questions" className="h-11 shrink-0 gap-1 rounded-xl px-3 text-sm">
              أسئلة
              {!subscribed && <Lock className="h-3.5 w-3.5" />}
            </TabsTrigger>
            <TabsTrigger value="videos" className="h-11 shrink-0 rounded-xl px-3 text-sm">فيديوهات</TabsTrigger>
            <TabsTrigger value="notes" className="h-11 shrink-0 rounded-xl px-3 text-sm">ملاحظات</TabsTrigger>
            <TabsTrigger value="bookmarks" className="h-11 shrink-0 rounded-xl px-3 text-sm">محفوظات</TabsTrigger>
          </TabsList>
        </div>

        {/* Lessons */}
        <TabsContent value="lessons" className="mt-6 space-y-3">
          {renderResources(['material'], BookOpen, 'لا يوجد شرح مرفوع بعد', 'bg-primary/10 text-primary')}
        </TabsContent>

        {/* Summaries */}
        <TabsContent value="summaries" className="mt-6 space-y-3">
          <SubscriptionGate
            title="التلخيصات بالاشتراك"
            description="افتح تلخيصات المادة بعد الاشتراك بـ 3 دنانير لأول شهر عبر كليك."
          >
            {renderResources(['summary'], FileText, 'لا توجد ملخصات مرفوعة بعد', 'bg-secondary/10 text-secondary')}
          </SubscriptionGate>
        </TabsContent>

        {/* Dossiers */}
        <TabsContent value="dossiers" className="mt-6 space-y-3">
          <SubscriptionGate
            title="الدوسيات بالاشتراك"
            description="افتح دوسيات المادة بعد الاشتراك بـ 3 دنانير لأول شهر عبر كليك."
          >
            {renderResources(['dossier'], Download, 'لا توجد دوسيات مرفوعة بعد', 'bg-warning/10 text-warning')}
          </SubscriptionGate>
        </TabsContent>

        {/* Exams */}
        <TabsContent value="exams" className="mt-6 space-y-3">
          {renderResources(['ministerial_exam'], ClipboardList, 'لا توجد امتحانات وزارية مرفوعة بعد', 'bg-destructive/10 text-destructive')}
          <SubscriptionGate
            title="الامتحانات المقترحة بالاشتراك"
            description="الوزاري مجاني في الأعلى. المقترحة تفتح بعد الاشتراك بـ 3 دنانير لأول شهر عبر كليك."
          >
            {renderResources(['suggested_exam', 'electronic_exam'], ClipboardList, 'لا توجد امتحانات مقترحة مرفوعة بعد', 'bg-destructive/10 text-destructive')}
          </SubscriptionGate>
        </TabsContent>

        <TabsContent value="questions" className="mt-6 space-y-3">
          <SubscriptionGate
            title="أسئلة المادة بالاشتراك"
            description="افتح بنك أسئلة المادة بعد الاشتراك بـ 3 دنانير لأول شهر عبر كليك."
          >
            {renderResources(['questions'], CircleHelp, 'لا توجد أسئلة مرفوعة بعد', 'bg-primary/10 text-primary')}
          </SubscriptionGate>
        </TabsContent>

        {/* Videos */}
        <TabsContent value="videos" className="mt-6 space-y-3">
          {renderResources(['video'], Play, 'لا توجد فيديوهات مرفوعة بعد', 'bg-secondary/10 text-secondary')}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-6 space-y-4">
          <Card className="rounded-2xl border-0 glass-card p-4 shadow-soft space-y-3">
            <div>
              <Label className="mb-2 block">عنوان الملاحظة</Label>
              <Input value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} placeholder="مثال: نقاط مهمة من الفصل الأول" className="rounded-xl" />
            </div>
            <div>
              <Label className="mb-2 block">المحتوى</Label>
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="اكتب ملاحظاتك هنا..." className="rounded-xl min-h-[100px]" />
            </div>
            <Button onClick={addNote} disabled={!newNoteTitle.trim()} className="rounded-xl gradient-primary">
              <Plus className="h-4 w-4" /> حفظ الملاحظة
            </Button>
          </Card>
          {notes.length === 0 ? (
            <Card className="rounded-2xl border-0 glass-card p-8 text-center">
              <NotebookPen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">لا توجد ملاحظات بعد</p>
            </Card>
          ) : (
            notes.map((note) => (
              <Card key={note.id} className="group rounded-2xl border-0 glass-card p-4 shadow-soft">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{note.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteNote(note.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Bookmarks */}
        <TabsContent value="bookmarks" className="mt-6 space-y-3">
          {bookmarks.length === 0 ? (
            <Card className="rounded-2xl border-0 glass-card p-8 text-center">
              <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">لا توجد محفوظات بعد. احفظ الدروس والملخصات لتجدها هنا</p>
            </Card>
          ) : (
            bookmarks.map((bm) => (
              <Card key={bm.id} className="group flex items-center gap-4 rounded-2xl border-0 glass-card p-4 shadow-soft">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bookmark className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{bm.title}</h3>
                  <p className="text-xs text-muted-foreground">{bm.content_type}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => removeBookmark(bm.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <ResourceViewer item={viewerItem} open={Boolean(viewerItem)} onOpenChange={(open) => { if (!open) setViewerItem(null); }} />
    </div>
  );
}
