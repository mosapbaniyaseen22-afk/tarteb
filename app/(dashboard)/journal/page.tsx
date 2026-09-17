'use client';

import { JournalNotebook } from '@/components/journal/journal-notebook';
import { SubscriptionGate } from '@/components/subscription-gate';

export default function JournalPage() {
  return (
    <SubscriptionGate
      title="مذكراتي بالاشتراك"
      description="دفترك الدراسي يفتح بعد الاشتراك. ادفع عبر كليك ثم فعّل الكود."
    >
      <JournalNotebook />
    </SubscriptionGate>
  );
}
