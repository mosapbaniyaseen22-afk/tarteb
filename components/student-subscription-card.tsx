'use client';

import Link from 'next/link';
import { Crown, ChevronLeft } from 'lucide-react';
import { PRO_OFFER_LABEL, PRO_PRICE_LABEL } from '@/lib/pro';
import { useSubscription } from '@/lib/use-subscription';

export function StudentSubscriptionCard() {
  const { active, daysLeft, loading } = useSubscription();

  if (loading) return null;

  if (active) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-glow">
        <span className="flex items-center gap-2 font-semibold">
          <Crown className="h-4 w-4" />
          ترتيب+ مفعّل • متبقي {daysLeft} يوم
        </span>
      </div>
    );
  }

  return (
    <Link
      href="/subscribe"
      className="flex items-center justify-between gap-3 rounded-2xl gradient-primary px-4 py-3 text-white shadow-glow"
    >
      <span className="flex items-center gap-2 font-semibold">
        <Crown className="h-4 w-4" />
        اشترك بـ {PRO_PRICE_LABEL} • {PRO_OFFER_LABEL}
      </span>
      <ChevronLeft className="h-4 w-4 opacity-80" />
    </Link>
  );
}
