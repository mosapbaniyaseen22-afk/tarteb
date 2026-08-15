'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, Upload, Trash2, FileDown, Link as LinkIcon, FileSearch, Users, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabibLogo } from '@/components/labib-logo';
import { AdminActivationCodes } from '@/components/admin-activation-codes';
import {
  ADMIN_EMAIL,
  ADMIN_RESOURCE_TYPES,
  ADMIN_SUBJECT_OPTIONS,
  adminFileUrl,
  loadAdminResources,
  getSubscriberPresence,
  type AdminResource,
  type AdminResourceType,
  type AppSubscriber,
  type SubscriberPresence,
} from '@/lib/admin';
import { getStageLabel } from '@/lib/utils';

const EXAM_YEARS = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + 1 - index));

type UserListFilter = 'all' | 'online' | 'logged_out';

function formatSubscriberSeen(iso: string) {
  const seen = new Date(iso).getTime();
  if (!Number.isFinite(seen)) return '';
  const diff = Date.now() - seen;
  if (diff < 2 * 60 * 1000) return 'الآن';
  if (diff < 60 * 60 * 1000) return `قبل ${Math.max(1, Math.floor(diff / 60000))} د`;
  if (diff < 24 * 60 * 60 * 1000) return `قبل ${Math.floor(diff / 3600000)} س`;
  return `آخر ظهور ${new Date(iso).toLocaleDateString('ar-JO')}`;
}

function presenceLabel(presence: SubscriberPresence) {
  switch (presence) {
    case 'online':
      return 'متواجد الآن';
    case 'logged_out':
      return 'سجّل خروج';
    case 'away':
      return 'غير متصل';
    default: {
      const exhaustive: never = presence;
      return exhaustive;
    }
  }
}

function filterSubscribers(rows: AppSubscriber[], filter: UserListFilter) {
  switch (filter) {
    case 'all':
      return rows;
    case 'online':
      return rows.filter((row) => getSubscriberPresence(row) === 'online');
    case 'logged_out':
      return rows.filter((row) => getSubscriberPresence(row) === 'logged_out');
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

function emptyUsersMessage(filter: UserListFilter) {
  switch (filter) {
    case 'all':
      return 'لا يوجد مستخدمون ظاهرون بعد. يظهر الاسم هنا تلقائياً عندما يدخل الطالب للتطبيق.';
    case 'online':
      return 'لا يوجد أحد متواجد الآن.';
    case 'logged_out':
      return 'لا يوجد من سجّل خروج بعد.';
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [items, setItems] = useState<AdminResource[]>([]);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<AdminResourceType>('material');
  const [subjectName, setSubjectName] = useState('الكل');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ingestNotes, setIngestNotes] = useState<string[]>([]);
  const [subscribers, setSubscribers] = useState<AppSubscriber[]>([]);
  const [usersOpen, setUsersOpen] = useState(false);
  const [userFilter, setUserFilter] = useState<UserListFilter>('all');

  const refreshItems = async () => {
    setItems(await loadAdminResources());
  };

  const refreshSubscribers = async () => {
    try {
      const response = await fetch('/api/admin/subscribers', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as { subscribers?: AppSubscriber[] };
      setSubscribers(payload.subscribers ?? []);
    } catch {
      setSubscribers([]);
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        if (response.ok) {
          setAuthenticated(true);
          await refreshItems();
          await refreshSubscribers();
        }
      } finally {
        setChecking(false);
      }
    };
    void check();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const tick = window.setInterval(() => {
      void refreshSubscribers();
    }, 20000);
    return () => window.clearInterval(tick);
  }, [authenticated]);

  const grouped = useMemo(() => {
    return ADMIN_RESOURCE_TYPES.map((group) => ({
      ...group,
      items: items.filter((item) => item.type === group.id),
    }));
  }, [items]);

  const onlineCount = useMemo(
    () => subscribers.filter((row) => getSubscriberPresence(row) === 'online').length,
    [subscribers],
  );
  const loggedOutCount = useMemo(
    () => subscribers.filter((row) => getSubscriberPresence(row) === 'logged_out').length,
    [subscribers],
  );
  const visibleUsers = useMemo(
    () => filterSubscribers(subscribers, userFilter),
    [subscribers, userFilter],
  );

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoggingIn(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error || 'تعذر تسجيل الدخول');
        return;
      }
      setAuthenticated(true);
      setPassword('');
      await refreshItems();
      await refreshSubscribers();
      toast.success('تم الدخول إلى لوحة الأدمن');
    } catch {
      toast.error('تعذر الاتصال بالخادم');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    toast.success('تم تسجيل الخروج');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setYear('');
    setExternalUrl('');
    setFile(null);
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('أدخل عنوان المحتوى');
      return;
    }
    if (!file && !externalUrl.trim()) {
      toast.error('ارفع ملفاً أو أضف رابطاً');
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.set('type', type);
      form.set('title', title.trim());
      form.set('description', description.trim());
      form.set('subjectName', subjectName);
      form.set('year', year);
      form.set('externalUrl', externalUrl.trim());
      if (file) form.set('file', file);

      const response = await fetch('/api/admin/resources', { method: 'POST', body: form });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error || 'تعذر رفع المحتوى');
        return;
      }
      toast.success('تم نشر المحتوى للطلاب');
      resetForm();
      await refreshItems();
    } catch {
      toast.error('تعذر رفع المحتوى');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/resources/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      toast.error('تعذر حذف العنصر');
      return;
    }
    toast.success('تم حذف المحتوى');
    await refreshItems();
  };

  const ingestFiles = async (files: File[]) => {
    const allowed = files.filter((item) => /\.(pdf|docx)$/i.test(item.name));
    if (allowed.length === 0) {
      toast.error('ارفع ملف PDF أو Word ‎.docx');
      return;
    }

    setIngesting(true);
    try {
      const form = new FormData();
      for (const item of allowed) form.append('file', item);
      const response = await fetch('/api/admin/ingest', { method: 'POST', body: form });
      const payload = (await response.json()) as {
        error?: string;
        items?: Array<{ summary: string; scannedLikely: boolean; item: { title: string } }>;
      };
      if (!response.ok) {
        toast.error(payload.error || 'تعذر استخراج الملف');
        return;
      }

      const notes = (payload.items ?? []).map((row) =>
        row.scannedLikely
          ? `${row.item.title}: ${row.summary} (النص قليل، قد يكون الملف صورة)`
          : `${row.item.title}: ${row.summary}`,
      );
      setIngestNotes(notes);
      toast.success(notes.length === 1 ? 'تم استخراج الملف ووضعه في مكانه' : `تم استخراج ${notes.length} ملفات ووضعها في أماكنها`);
      await refreshItems();
    } catch {
      toast.error('تعذر استخراج الملف');
    } finally {
      setIngesting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center gradient-hero">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center gradient-hero px-4">
        <Card className="w-full max-w-md rounded-3xl border-0 glass-card p-8 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">دخول الأدمن</h1>
              <p className="text-sm text-muted-foreground">لوحة إدارة محتوى لبيب</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="mb-2 block">البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={ADMIN_EMAIL}
                className="rounded-xl"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="mb-2 block">كلمة السر</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="rounded-xl"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={loggingIn} className="h-12 w-full rounded-2xl gradient-primary">
              {loggingIn ? 'جاري الدخول...' : 'دخول'}
            </Button>
            <Button type="button" variant="ghost" className="w-full rounded-xl" onClick={() => router.push('/')}>
              العودة للمنصة
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <LabibLogo size="md" />
            <div>
              <div className="font-bold">لوحة أدمن لبيب</div>
              <div className="text-xs text-muted-foreground">أكواد التفعيل، المستخدمون، ونشر المواد</div>
            </div>
          </div>
          <Button variant="ghost" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <AdminActivationCodes />

        <Card className="rounded-3xl border-0 glass-card p-4 shadow-soft md:p-6">
          <button
            type="button"
            onClick={() => setUsersOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 text-right"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold">قائمة المستخدمين</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {subscribers.length} مستخدم • {onlineCount} متواجد الآن • {loggedOutCount} سجّل خروج
                </p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${usersOpen ? 'rotate-180' : ''}`} />
          </button>

          {usersOpen && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'all' as const, label: 'الكل', count: subscribers.length },
                  { id: 'online' as const, label: 'متواجد الآن', count: onlineCount },
                  { id: 'logged_out' as const, label: 'سجّل خروج', count: loggedOutCount },
                ]).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setUserFilter(option.id)}
                    className={`rounded-2xl px-3 py-2 text-center transition ${
                      userFilter === option.id
                        ? 'gradient-primary text-white shadow-glow'
                        : 'bg-accent/50 text-muted-foreground'
                    }`}
                  >
                    <div className="text-lg font-bold">{option.count}</div>
                    <div className="text-[11px] sm:text-xs">{option.label}</div>
                  </button>
                ))}
              </div>

              {visibleUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyUsersMessage(userFilter)}</p>
              ) : (
                <div className="space-y-2">
                  {visibleUsers.map((subscriber) => {
                    const presence = getSubscriberPresence(subscriber);
                    const statusTime = presence === 'logged_out' && subscriber.loggedOutAt
                      ? subscriber.loggedOutAt
                      : subscriber.lastSeenAt;
                    return (
                      <div key={subscriber.id} className="flex items-center gap-3 rounded-2xl bg-accent/40 px-4 py-3">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-sm font-bold text-white">
                          {(subscriber.name || 'ط').charAt(0)}
                          <span
                            className={`absolute -left-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background ${
                              presence === 'online'
                                ? 'bg-green-500'
                                : presence === 'logged_out'
                                  ? 'bg-destructive'
                                  : 'bg-muted-foreground/40'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{subscriber.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {subscriber.stage ? getStageLabel(subscriber.stage) : 'طالب'}
                            {subscriber.email ? ` • ${subscriber.email}` : ''}
                          </div>
                        </div>
                        <div className="text-left text-xs text-muted-foreground">
                          <div className="font-medium text-foreground">{presenceLabel(presence)}</div>
                          <div>{formatSubscriberSeen(statusTime)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-6">
            <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">استخراج تلقائي من PDF أو Word</h2>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                ارفع الملف فقط. النظام يقرأ النص، يحدد إن كان مادة أو امتحان أو أسئلة، ثم يضعه في صفحة الطلاب المناسبة.
              </p>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  if (ingesting) return;
                  void ingestFiles(Array.from(event.dataTransfer.files));
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-4 py-10 text-center transition ${
                  dragOver ? 'border-primary bg-primary/10' : 'border-border bg-accent/30 hover:bg-accent/50'
                }`}
              >
                <Upload className="mb-3 h-8 w-8 text-primary" />
                <div className="font-semibold">{ingesting ? 'جاري استخراج المحتوى...' : 'اسحب الملف هنا أو اضغط للاختيار'}</div>
                <div className="mt-1 text-xs text-muted-foreground">PDF أو Word ‎.docx • حتى 20 ميغابايت</div>
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="hidden"
                  disabled={ingesting}
                  onChange={(event) => {
                    void ingestFiles(Array.from(event.target.files ?? []));
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              {ingestNotes.length > 0 && (
                <div className="mt-4 space-y-2">
                  {ingestNotes.map((note) => (
                    <div key={note} className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
              <h2 className="mb-4 text-xl font-bold">رفع يدوي (رابط أو فيديو أو تعديل النوع)</h2>
              <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block">النوع</Label>
                  <Select value={type} onValueChange={(value) => setType(value as AdminResourceType)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ADMIN_RESOURCE_TYPES.map((option) => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">المادة</Label>
                  <Select value={subjectName} onValueChange={setSubjectName}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ADMIN_SUBJECT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-2 block">العنوان</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: ملخص الوحدة الأولى" className="rounded-xl" />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-2 block">الوصف</Label>
                  <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="وصف مختصر يظهر للطلاب" className="min-h-[90px] rounded-xl" />
                </div>
                {(type === 'ministerial_exam' || type === 'suggested_exam') && (
                  <div>
                    <Label className="mb-2 block">سنة الامتحان</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر السنة" /></SelectTrigger>
                      <SelectContent>
                        {EXAM_YEARS.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="mb-2 block">رابط اختياري</Label>
                  <Input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="يوتيوب أو رابط خارجي" className="rounded-xl" />
                </div>
                <div className="md:col-span-2">
                  <Label className="mb-2 block">الملف</Label>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="rounded-xl"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" disabled={saving} className="rounded-xl gradient-primary">
                    <Upload className="h-4 w-4" />
                    {saving ? 'جاري الرفع...' : 'نشر للطلاب'}
                  </Button>
                </div>
              </form>
            </Card>

            {grouped.map((group) => (
              <section key={group.id} className="space-y-3">
                <h3 className="text-lg font-semibold">{group.label} ({group.items.length})</h3>
                {group.items.length === 0 ? (
                  <Card className="rounded-2xl border-0 glass-card p-6 text-sm text-muted-foreground">
                    لا يوجد محتوى بعد في هذا القسم
                  </Card>
                ) : (
                  group.items.map((item) => (
                    <Card key={item.id} className="flex flex-col gap-3 rounded-2xl border-0 glass-card p-4 shadow-soft sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <div className="font-semibold">{item.title}</div>
                        <p className="text-sm text-muted-foreground">
                          {item.subjectName}
                          {item.year ? ` • ${item.year}` : ''}
                          {item.autoClassified ? ' • استخراج تلقائي' : ''}
                          {item.questions.length > 0 ? ` • ${item.questions.length} سؤال` : ''}
                          {item.description ? ` • ${item.description}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {item.fileName && (
                          <Button variant="ghost" size="icon" className="rounded-xl" asChild>
                            <a href={adminFileUrl(item.id)} target="_blank" rel="noreferrer">
                              <FileDown className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {item.externalUrl && (
                          <Button variant="ghost" size="icon" className="rounded-xl" asChild>
                            <a href={item.externalUrl} target="_blank" rel="noreferrer">
                              <LinkIcon className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </section>
            ))}
        </div>
      </main>
    </div>
  );
}
