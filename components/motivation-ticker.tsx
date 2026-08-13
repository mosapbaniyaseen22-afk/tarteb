'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LabibLogo } from '@/components/labib-logo';
import { cn } from '@/lib/utils';

const LINES = [
  'اللهم لا سهل إلا ما جعلته سهلاً',
  'ربِّ يسِّر ولا تعسِّر، وبارك لي في وقتي',
  'اللهم إني أسألك الفهم والحفظ والتوفيق',
  'اللهم علّمنا ما ينفعنا وانفعنا بما علّمتنا',
  'توكلت على الحي الذي لا يموت',
  'اللهم افتح علينا فتوح العارفين',
  'حسبي الله ونعم الوكيل',
  'اللهم بلّغنا ما نتمناه برحمتك',
  'كل ساعة مذاكرة تقربك خطوة من حلمك',
  'التعب اليوم راحة الغد، أكمل الطريق',
  'أنت أقدر مما تظن، لا تتوقف الآن',
  'المذاكرة عبادة إذا صلحت النية',
  'ابدأ الآن، البركة في الحركة',
  'لا يضيع جهد من صدق النية',
  'خطوة واحدة كافية لتبدأ من جديد',
  'النتيجة تستحق كل هذه الساعات',
] as const;

const ROTATE_MS = 6500;

type MotivationTickerProps = {
  className?: string;
};

export function MotivationTicker({ className }: MotivationTickerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setIndex((current) => (current + 1) % LINES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(tick);
  }, []);

  const line = LINES[index];

  return (
    <div
      className={cn(
        'relative isolate w-full max-w-md overflow-hidden rounded-full border border-primary/15 bg-background/70 px-3 py-2 shadow-soft backdrop-blur-md',
        className,
      )}
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/80 to-transparent" />
      <div className="flex items-center gap-2">
        <LabibLogo size="sm" className="h-7 w-7 shadow-none ring-1 ring-primary/15" />
        <div className="relative min-h-[1.5rem] min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="truncate text-sm font-medium text-foreground"
            >
              {line}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <motion.span
        key={`bar-${index}`}
        className="absolute inset-x-3 bottom-0 h-0.5 origin-right rounded-full bg-gradient-to-l from-primary to-secondary"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }}
      />
    </div>
  );
}
