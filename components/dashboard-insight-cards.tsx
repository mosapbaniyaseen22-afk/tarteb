'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LabibLogo } from '@/components/labib-logo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tawjihiJourney, tawjihiPhaseHint, tawjihiPhaseLabel } from '@/lib/tawjihi-journey';
import { timeToMinutes } from '@/lib/prayer-times';
import { activityDates, studyStreakDays } from '@/lib/user-stats';
import { getWeekDays } from '@/lib/week';
import type { QuizAttempt, ScheduleEntry, StudySession } from '@/lib/supabase';
import { Compass, Flame, Play, Sparkles } from 'lucide-react';

type DashboardInsightCardsProps = {
  tawjihiYear: number | null | undefined;
  attempts: QuizAttempt[];
  sessions: StudySession[];
  todaySchedule: ScheduleEntry[];
  todayISO: string;
};

type MissionKind = 'schedule' | 'practice';

type Mission = {
  kind: MissionKind;
  title: string;
  subtitle: string;
  href: string;
  color: string;
  timeLabel: string | null;
};

function formatClock(value: string) {
  const [hoursRaw, minutes] = value.split(':');
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || !minutes) return value.slice(0, 5);
  const period = hours >= 12 ? 'م' : 'ص';
  const display = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${display}:${minutes.slice(0, 2)} ${period}`;
}

function pickNextMission(todaySchedule: ScheduleEntry[], now = new Date()): Mission {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcomingBlock = [...todaySchedule]
    .filter((entry) => timeToMinutes(entry.end_time) >= nowMinutes)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];

  if (upcomingBlock) {
    return {
      kind: 'schedule',
      title: upcomingBlock.activity,
      subtitle: upcomingBlock.subject_name || 'من جدولك',
      href: '/scheduler',
      color: upcomingBlock.color || '#0EA5E9',
      timeLabel: `${formatClock(upcomingBlock.start_time)} — ${formatClock(upcomingBlock.end_time)}`,
    };
  }

  return {
    kind: 'practice',
    title: 'اختبر نفسك الآن',
    subtitle: 'سؤال واحد يفتح الطريق',
    href: '/practice',
    color: '#22C55E',
    timeLabel: null,
  };
}

function missionCta(kind: MissionKind) {
  switch (kind) {
    case 'schedule':
      return 'إلى الجدول';
    case 'practice':
      return 'ابدأ التدريب';
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function DashboardInsightCards({
  tawjihiYear,
  attempts,
  sessions,
  todaySchedule,
  todayISO,
}: DashboardInsightCardsProps) {
  const journey = tawjihiJourney(tawjihiYear);
  const mission = pickNextMission(todaySchedule);
  const dates = activityDates(sessions, attempts);
  const streak = studyStreakDays(dates, todayISO);
  const weekDays = getWeekDays(todayISO);
  const ring = 2 * Math.PI * 42;
  const ringOffset = ring - (ring * journey.yearProgress) / 100;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <Card className="relative h-full overflow-hidden rounded-3xl border-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(255,255,255,0.22),transparent_42%),linear-gradient(145deg,#1d4ed8_0%,#0f766e_58%,#0f172a_120%)] p-6 text-white shadow-glow">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2 text-white/80">
              <Compass className="h-4 w-4" />
              <span className="text-sm">بوصلة التوجيهي</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative h-[108px] w-[108px] shrink-0">
                <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90">
                  <circle cx="54" cy="54" r="42" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
                  <motion.circle
                    cx="54"
                    cy="54"
                    r="42"
                    fill="none"
                    stroke="white"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ring}
                    initial={{ strokeDashoffset: ring }}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <LabibLogo size="md" className="h-12 w-12 ring-white/30" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {journey.daysLeft === null ? '—' : Math.max(0, journey.daysLeft)}
                </div>
                <div className="text-sm text-white/80">
                  {journey.phase === 'exam_day' ? 'اليوم يومك' : journey.phase === 'after' ? 'انتهى العدّ' : 'يوماً على الحلم'}
                </div>
                <div className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  {tawjihiPhaseLabel(journey.phase)}
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/75">{tawjihiPhaseHint(journey.phase)}</p>
            <div className="mt-auto pt-4 text-xs text-white/55">
              {journey.examLabel ? (
                <Link href="/profile" className="hover:text-white">{journey.examLabel} • المسار {journey.yearProgress}%</Link>
              ) : (
                <Link href="/profile" className="underline decoration-white/30 underline-offset-4 hover:text-white">أضف سنة التوجيهي من ملفك</Link>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Card className="relative h-full overflow-hidden rounded-3xl border-0 glass-card p-6 shadow-soft">
          <div className="absolute -left-10 top-0 h-28 w-28 rounded-full blur-3xl" style={{ backgroundColor: `${mission.color}30` }} />
          <div className="relative flex h-full flex-col">
            <div className="mb-4 flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-sm">خطوتك الآن</span>
            </div>
            <div
              className="mb-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: `${mission.color}18`, color: mission.color }}
            >
              {mission.subtitle}
            </div>
            <h3 className="text-xl font-bold leading-snug">{mission.title}</h3>
            {mission.timeLabel && (
              <p className="mt-2 text-sm text-muted-foreground">{mission.timeLabel}</p>
            )}
            <div className="mt-auto pt-5">
              <Link href={mission.href}>
                <Button className="rounded-xl gradient-primary">
                  <Play className="h-4 w-4" />
                  {missionCta(mission.kind)}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="relative h-full overflow-hidden rounded-3xl border-0 glass-card p-6 shadow-soft">
          <div className="relative flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Flame className="h-4 w-4 text-warning" />
                <span className="text-sm">ليالي الاجتهاد</span>
              </div>
              <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                {streak} {streak === 1 ? 'ليلة' : 'ليالٍ'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {streak > 0 ? 'سلسلة أيام ذاكرت أو اختبرت فيها نفسك' : 'أكمل اختباراً اليوم لتُشعل أول ليلة'}
            </p>
            <div className="mt-5 flex items-end justify-between gap-1">
              {weekDays.map((day) => {
                const lit = dates.has(day.date);
                const isToday = day.date === todayISO;
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                    <motion.span
                      className={`h-8 w-8 rounded-full border-2 sm:h-10 sm:w-10 ${
                        lit
                          ? 'border-warning bg-warning shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                          : isToday
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-accent/60'
                      }`}
                      animate={lit ? { scale: [1, 1.06, 1] } : undefined}
                      transition={lit ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
                    />
                    <span className={`text-[11px] ${isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {day.short}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-auto pt-4 text-xs text-muted-foreground">
              الدائرة الذهبية = يوم أنجزت فيه شيئاً
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
