'use client';

import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bed, BookMarked, BookOpen, Building2, Check, Clock, Coffee, Dumbbell,
  FlaskConical, Moon, Pencil, School, Sun, Trash2, UtensilsCrossed, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScheduleEntry } from '@/lib/supabase';

const ACTIVITY_ICONS: Record<string, typeof Clock> = {
  wake: Moon,
  sleep: Bed,
  prayer: Moon,
  quran: BookMarked,
  study: BookOpen,
  break: Coffee,
  center: Building2,
  school: School,
  sport: Dumbbell,
  meal: UtensilsCrossed,
  custom: Wand2,
};

function formatTime(value: string) {
  const [hoursRaw, minutes] = value.split(':');
  const hours = Number(hoursRaw);
  const period = hours >= 12 ? 'م' : 'ص';
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes} ${period}`;
}

function entryIcon(entry: ScheduleEntry) {
  const haystack = `${entry.activity} ${entry.subject_name ?? ''}`;
  if (haystack.includes('فيزياء')) return FlaskConical;
  if (haystack.includes('قرآن')) return BookMarked;
  if (entry.activity_type === 'wake') return entry.activity.includes('فجر') ? Moon : Sun;
  return ACTIVITY_ICONS[entry.activity_type] || Clock;
}

function barStyle(color: string, completed: boolean): CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${color} 34%, hsl(var(--card)))`,
    border: `1px solid color-mix(in srgb, ${color} 42%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 18%, transparent)`,
    opacity: completed ? 0.55 : 1,
  };
}

type Props = {
  entries: ScheduleEntry[];
  onToggle: (entry: ScheduleEntry) => void;
  onEdit: (entry: ScheduleEntry) => void;
  onDelete: (id: string) => void;
};

export function ScheduleTimeline({ entries, onToggle, onEdit, onDelete }: Props) {
  return (
    <div className="relative space-y-0" dir="ltr">
      <div className="pointer-events-none absolute bottom-4 left-[3.15rem] top-4 w-px bg-border/70" />
      <AnimatePresence>
        {entries.map((entry, index) => {
          const Icon = entryIcon(entry);
          const locked = entry.activity_type === 'prayer' && entry.id.startsWith('prayer-');
          const trackable = Boolean(entry.task_id) || (!locked && !['wake', 'sleep', 'meal', 'break', 'prayer'].includes(entry.activity_type));
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: index * 0.025 }}
              className="relative flex items-center gap-3 py-1.5"
              dir="ltr"
            >
              <div className="relative z-10 w-[4.4rem] shrink-0 text-left text-[12px] font-medium text-muted-foreground sm:text-sm">
                {formatTime(entry.start_time)}
              </div>
              <div
                className={`group relative z-10 flex min-h-[3.25rem] flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 text-foreground sm:px-4 ${
                  entry.completed ? 'line-through decoration-foreground/40' : ''
                }`}
                style={barStyle(entry.color, entry.completed)}
                dir="rtl"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/10 text-current dark:bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-right"
                  onClick={() => {
                    if (trackable) onToggle(entry);
                  }}
                >
                  <div className="truncate text-sm font-semibold">{entry.activity}</div>
                  {entry.subject_name && entry.activity_type !== 'study' && (
                    <div className="truncate text-[11px] text-muted-foreground">{entry.subject_name}</div>
                  )}
                </button>
                {trackable && (
                  <button
                    type="button"
                    onClick={() => onToggle(entry)}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                      entry.completed ? 'border-primary bg-primary text-white' : 'border-white/25 text-transparent'
                    }`}
                    aria-label={entry.completed ? 'إلغاء الإكمال' : 'تم'}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                {!locked && (
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onEdit(entry)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
