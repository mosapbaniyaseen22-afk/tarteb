'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Copy, Check, KeyRound, Plus, Trash2, Ban, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ACTIVATION_DURATION_DAYS,
  codeStatusLabel,
  remainingDays,
  type ActivationCode,
  type ActivationCodeFilter,
  type ActivationCodeStatus,
} from '@/lib/activation';

type AdminCode = ActivationCode & { status: ActivationCodeStatus };

type CodesPayload = {
  items?: AdminCode[];
  stats?: {
    total: number;
    unused: number;
    active: number;
    expired: number;
    revoked: number;
  };
};

const GENERATE_COUNTS = [1, 5, 10, 25];

function matchesFilter(row: AdminCode, filter: ActivationCodeFilter) {
  switch (filter) {
    case 'all':
      return true;
    case 'unused':
    case 'active':
    case 'expired':
    case 'revoked':
      return row.status === filter;
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

function filterCodes(rows: AdminCode[], filter: ActivationCodeFilter, query: string) {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (!matchesFilter(row, filter)) return false;
    if (!needle) return true;
    return [row.code, row.note, row.usedByName, row.usedByEmail]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });
}

function statusClass(status: ActivationCodeStatus) {
  switch (status) {
    case 'unused':
      return 'bg-primary/10 text-primary';
    case 'active':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    case 'expired':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    case 'revoked':
      return 'bg-destructive/10 text-destructive';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function AdminActivationCodes() {
  const [items, setItems] = useState<AdminCode[]>([]);
  const [stats, setStats] = useState({ total: 0, unused: 0, active: 0, expired: 0, revoked: 0 });
  const [filter, setFilter] = useState<ActivationCodeFilter>('all');
  const [query, setQuery] = useState('');
  const [count, setCount] = useState(5);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [created, setCreated] = useState<AdminCode[]>([]);

  const refresh = async () => {
    const response = await fetch('/api/admin/codes', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = (await response.json()) as CodesPayload;
    setItems(payload.items ?? []);
    setStats(payload.stats ?? { total: 0, unused: 0, active: 0, expired: 0, revoked: 0 });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(() => filterCodes(items, filter, query), [items, filter, query]);

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, note }),
      });
      const payload = (await response.json()) as { error?: string; items?: AdminCode[] };
      if (!response.ok) {
        toast.error(payload.error || 'تعذر إنشاء الأكواد');
        return;
      }
      const next = (payload.items ?? []).map((item) => ({ ...item, status: 'unused' as const }));
      setCreated(next);
      setNote('');
      toast.success(`تم إنشاء ${next.length} كود تفعيل`);
      await refresh();
    } catch {
      toast.error('تعذر إنشاء الأكواد');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (value: string, id: string) => {
    await copyText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1500);
    toast.success('تم نسخ الكود');
  };

  const handleCopyCreated = async () => {
    await copyText(created.map((item) => item.code).join('\n'));
    toast.success('تم نسخ كل الأكواد الجديدة');
  };

  const handleRevoke = async (id: string) => {
    const response = await fetch(`/api/admin/codes/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke' }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error || 'تعذر إلغاء الكود');
      return;
    }
    toast.success('تم إلغاء الكود');
    await refresh();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/codes/${id}`, { method: 'DELETE' });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error || 'تعذر حذف الكود');
      return;
    }
    toast.success('تم حذف الكود');
    await refresh();
  };

  const filters: { id: ActivationCodeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'الكل', count: stats.total },
    { id: 'unused', label: 'غير مستخدم', count: stats.unused },
    { id: 'active', label: 'مفعّل', count: stats.active },
    { id: 'expired', label: 'منتهي', count: stats.expired },
    { id: 'revoked', label: 'ملغى', count: stats.revoked },
  ];

  return (
    <Card className="rounded-3xl border-0 glass-card p-4 shadow-soft md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">أكواد تفعيل الاشتراك</h2>
          <p className="text-sm text-muted-foreground">
            كل كود يفعّل الموقع لطالب واحد لمدة {ACTIVATION_DURATION_DAYS} يوماً من لحظة إدخاله. بعد انتهائه يطلب الاشتراك مجدداً.
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void handleGenerate(event)} className="mb-5 rounded-2xl bg-accent/40 p-4">
        <div className="mb-3 text-sm font-semibold">إنشاء أكواد جديدة</div>
        <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
          <div>
            <Label className="mb-2 block">عدد الأكواد</Label>
            <div className="flex flex-wrap gap-2">
              {GENERATE_COUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCount(value)}
                  className={`h-10 min-w-12 rounded-xl px-3 text-sm font-semibold ${
                    count === value ? 'gradient-primary text-white shadow-glow' : 'bg-background text-muted-foreground'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">ملاحظة داخلية (اختياري)</Label>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="مثال: دفعة أيار"
              className="h-11 rounded-xl"
            />
          </div>
          <Button type="submit" disabled={creating} className="h-11 rounded-xl gradient-primary">
            <Plus className="h-4 w-4" />
            {creating ? 'جاري الإنشاء...' : 'إنشاء الأكواد'}
          </Button>
        </div>
      </form>

      {created.length > 0 && (
        <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="font-semibold">الأكواد الجديدة — انسخها وأعطها للطلاب</div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => void handleCopyCreated()}>
              <Copy className="h-4 w-4" />
              نسخ الكل
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {created.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleCopy(item.code, `new-${item.id}`)}
                className="flex items-center justify-between rounded-xl bg-background px-3 py-2 font-mono text-sm"
              >
                {item.code}
                {copied === `new-${item.id}` ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={`rounded-2xl px-3 py-2 text-center transition ${
              filter === option.id ? 'gradient-primary text-white shadow-glow' : 'bg-accent/50 text-muted-foreground'
            }`}
          >
            <div className="text-lg font-bold">{option.count}</div>
            <div className="text-[11px] sm:text-xs">{option.label}</div>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالكود أو اسم الطالب أو البريد"
          className="h-11 rounded-xl pr-10"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد أكواد في هذا العرض. أنشئ دفعة جديدة من الأعلى.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((item) => (
            <div key={item.id} className="rounded-2xl bg-accent/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopy(item.code, item.id)}
                  className="font-mono text-sm font-semibold tracking-wide"
                >
                  {item.code}
                </button>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(item.status)}`}>
                  {codeStatusLabel(item.status)}
                </span>
                {item.status === 'active' && item.expiresAt && (
                  <span className="text-xs text-muted-foreground">متبقي {remainingDays(item.expiresAt)} يوم</span>
                )}
                <div className="ms-auto flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => void handleCopy(item.code, item.id)}>
                    {copied === item.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  {item.storedStatus === 'unused' ? (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => void handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : item.storedStatus !== 'revoked' ? (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => void handleRevoke(item.id)}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.note ? `${item.note} • ` : ''}
                {item.usedByName || item.usedByEmail
                  ? `استخدمه ${item.usedByName || 'طالب'}${item.usedByEmail ? ` • ${item.usedByEmail}` : ''}`
                  : `أُنشئ ${new Date(item.createdAt).toLocaleDateString('ar-JO')}`}
                {item.expiresAt ? ` • ينتهي ${new Date(item.expiresAt).toLocaleDateString('ar-JO')}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
