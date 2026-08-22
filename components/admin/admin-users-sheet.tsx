'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getSubscriberPresence, type AppSubscriber, type SubscriberPresence } from '@/lib/admin';
import { getStageLabel } from '@/lib/utils';

type UserListFilter = 'all' | 'online' | 'subscribed' | 'logged_out';

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
    case 'subscribed':
      return rows.filter((row) => row.subscribed);
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
      return 'لا يوجد مستخدمون ظاهرون بعد. يظهر الاسم هنا تلقائياً عندما يسجّل الطالب دخول.';
    case 'online':
      return 'لا يوجد أحد متواجد الآن داخل التطبيق.';
    case 'subscribed':
      return 'لا يوجد مشتركون مفعّلون حالياً.';
    case 'logged_out':
      return 'لا يوجد من سجّل خروج بعد.';
    default: {
      const exhaustive: never = filter;
      return exhaustive;
    }
  }
}

type AdminUsersSheetProps = {
  subscribers: AppSubscriber[];
};

export function AdminUsersSheet({ subscribers }: AdminUsersSheetProps) {
  const [open, setOpen] = useState(false);
  const [userFilter, setUserFilter] = useState<UserListFilter>('online');

  useEffect(() => {
    if (!open) return;
    setUserFilter('online');
  }, [open]);

  const onlineCount = useMemo(
    () => subscribers.filter((row) => getSubscriberPresence(row) === 'online').length,
    [subscribers],
  );
  const subscribedCount = useMemo(
    () => subscribers.filter((row) => row.subscribed).length,
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

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="rounded-2xl"
        onClick={() => setOpen(true)}
      >
        <Users className="h-4 w-4" />
        المستخدمون الآن
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
          {onlineCount}
        </span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="text-right">
            <SheetTitle>المستخدمون الآن</SheetTitle>
            <SheetDescription>
              {subscribers.length} سجّل دخول • {subscribedCount} مشترك • {onlineCount} متواجد
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'online' as const, label: 'متواجد الآن', count: onlineCount },
                { id: 'all' as const, label: 'سجّل دخول', count: subscribers.length },
                { id: 'subscribed' as const, label: 'مشترك', count: subscribedCount },
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
                  <div className="text-[11px]">{option.label}</div>
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
                        <div className="flex items-center gap-2">
                          <div className="truncate font-semibold">{subscriber.name}</div>
                          {subscriber.subscribed ? (
                            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              مشترك
                            </span>
                          ) : null}
                        </div>
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

            <Button variant="outline" className="w-full rounded-xl" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
              إغلاق القائمة
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
