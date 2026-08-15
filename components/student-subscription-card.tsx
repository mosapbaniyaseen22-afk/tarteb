'use client';

import Link from 'next/link';
import { Crown, ChevronLeft } from 'lucide-react';

export function StudentSubscriptionCard() {
  return (
    <Link
      href="/subscribe"
      className="flex items-center justify-between gap-3 rounded-2xl gradient-primary px-4 py-3 text-white shadow-glow"
    >
      <span className="flex items-center gap-2 font-semibold">
        <Crown className="h-4 w-4" />
        اشترك في لبيب+
      </span>
      <ChevronLeft className="h-4 w-4 opacity-80" />
    </Link>
  );
}
