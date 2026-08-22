'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  ClipboardList,
  FileSearch,
  FileText,
  FolderOpen,
  Link as LinkIcon,
  MonitorPlay,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ADMIN_RESOURCE_TYPES,
  resourceFileHref,
  subjectsForPublishStage,
  type AdminResource,
  type AdminResourceType,
} from '@/lib/admin';
import { getStageLabel, type TawjihiStage } from '@/lib/utils';

const EXAM_YEARS = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + 1 - index));

const CATEGORY_ICONS: Record<AdminResourceType, typeof BookOpen> = {
  material: BookOpen,
  summary: FileText,
  dossier: FolderOpen,
  questions: CircleHelp,
  ministerial_exam: ClipboardList,
  suggested_exam: Sparkles,
  electronic_exam: MonitorPlay,
  video: Video,
};

type AdminPublishHubProps = {
  stage: TawjihiStage;
  items: AdminResource[];
  onRefresh: () => Promise<void>;
  onBack: () => void;
};

export function AdminPublishHub({ stage, items, onRefresh, onBack }: AdminPublishHubProps) {
  const [type, setType] = useState<AdminResourceType>('material');
  const [subjectName, setSubjectName] = useState('الكل');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ingestNotes, setIngestNotes] = useState<string[]>([]);

  const subjectOptions = subjectsForPublishStage(stage);
  const stageItems = useMemo(() => items.filter((item) => item.stage === stage), [items, stage]);
  const typeItems = stageItems.filter((item) => item.type === type);
  const selectedCategory = ADMIN_RESOURCE_TYPES.find((item) => item.id === type) ?? ADMIN_RESOURCE_TYPES[0];

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
      form.set('stage', stage);
      form.set('externalUrl', externalUrl.trim());
      if (file) form.set('file', file);

      const response = await fetch('/api/admin/resources', { method: 'POST', body: form });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error || 'تعذر رفع المحتوى');
        return;
      }
      toast.success('تم نشر المحتوى لكل طلاب هذه السنة');
      resetForm();
      await onRefresh();
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
    toast.success('تم حذف المحتوى من صفحات الطلاب');
    await onRefresh();
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
      form.set('stage', stage);
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
      toast.success(notes.length === 1 ? 'تم نشر الملف لطلاب هذه السنة' : `تم نشر ${notes.length} ملفات لطلاب هذه السنة`);
      await onRefresh();
    } catch {
      toast.error('تعذر استخراج الملف');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">نشر المحتوى</p>
          <h2 className="text-2xl font-bold">{getStageLabel(stage)}</h2>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={onBack}>
          <ArrowRight className="h-4 w-4" />
          تغيير السنة
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_RESOURCE_TYPES.map((category) => {
          const Icon = CATEGORY_ICONS[category.id];
          const count = stageItems.filter((item) => item.type === category.id).length;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setType(category.id)}
              className={`rounded-3xl border-0 p-4 text-right shadow-soft transition ${
                type === category.id ? 'gradient-primary text-white' : 'glass-card hover:-translate-y-0.5'
              }`}
            >
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${
                type === category.id ? 'bg-white/15' : 'bg-primary/10 text-primary'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{category.label}</div>
              <div className={`mt-1 text-xs ${type === category.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                {count} منشور • {category.hint}
              </div>
            </button>
          );
        })}
      </div>

      <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">استخراج تلقائي من PDF أو Word</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          الملف يُنشر مباشرة لطلاب {getStageLabel(stage)} في الشرح أو الأسئلة أو الامتحانات حسب محتواه.
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
        <h3 className="mb-1 text-xl font-bold">نشر {selectedCategory?.label}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{selectedCategory?.hint}</p>
        <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block">المادة</Label>
            <Select value={subjectName} onValueChange={setSubjectName}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {subjectOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(type === 'ministerial_exam' || type === 'suggested_exam' || type === 'electronic_exam') && (
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
          <div className="md:col-span-2">
            <Label className="mb-2 block">العنوان</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: ملخص الوحدة الأولى" className="rounded-xl" />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-2 block">الوصف</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="وصف مختصر يظهر للطلاب" className="min-h-[90px] rounded-xl" />
          </div>
          <div>
            <Label className="mb-2 block">رابط اختياري</Label>
            <Input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="يوتيوب أو رابط خارجي" className="rounded-xl" />
          </div>
          <div>
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
              {saving ? 'جاري النشر...' : `نشر لطلاب ${getStageLabel(stage)}`}
            </Button>
          </div>
        </form>
      </Card>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{selectedCategory?.label} المنشورة ({typeItems.length})</h3>
        {typeItems.length === 0 ? (
          <Card className="rounded-2xl border-0 glass-card p-6 text-sm text-muted-foreground">
            لا يوجد محتوى منشور هنا بعد. ارفع ملفاً وسيظهر مباشرة عند الطلاب.
          </Card>
        ) : (
          typeItems.map((item) => {
            const href = resourceFileHref(item);
            return (
              <Card key={item.id} className="flex flex-col gap-3 rounded-2xl border-0 glass-card p-4 shadow-soft sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="font-semibold">{item.title}</div>
                  <p className="text-sm text-muted-foreground">
                    {item.subjectName}
                    {item.year ? ` • ${item.year}` : ''}
                    {item.autoClassified ? ' • استخراج تلقائي' : ''}
                    {item.questions.length > 0 ? ` • ${item.questions.length} سؤال` : ''}
                    {item.published ? ' • ظاهر للطلاب' : ''}
                    {item.description ? ` • ${item.description}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {href && (
                    <Button variant="ghost" size="icon" className="rounded-xl" asChild>
                      <a href={href} target="_blank" rel="noreferrer">
                        <FileText className="h-4 w-4" />
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
            );
          })
        )}
      </section>
    </div>
  );
}
