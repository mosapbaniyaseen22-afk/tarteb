'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CliqPayButtons } from '@/components/cliq-pay-buttons';
import {
  PRO_FREE_FEATURES,
  PRO_OFFER_LABEL,
  PRO_PAID_FEATURES,
  PRO_PRICE_LABEL,
} from '@/lib/pro';
import { useSubscription } from '@/lib/use-subscription';

type SubscriptionGateProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function SubscriptionGate({ title, description, children }: SubscriptionGateProps) {
  const { active, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (active) return children;

  return (
    <div className="mx-auto max-w-xl">
      <Card className="rounded-3xl border-0 glass-card p-6 shadow-soft md:p-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-glow">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          <Crown className="h-4 w-4" />
          {PRO_PRICE_LABEL} • {PRO_OFFER_LABEL}
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {PRO_PAID_FEATURES.map((item) => (
            <li key={item} className="text-foreground">يفتح بالاشتراك: {item}</li>
          ))}
          {PRO_FREE_FEATURES.map((item) => (
            <li key={item} className="text-muted-foreground">{item}</li>
          ))}
        </ul>
        <CliqPayButtons className="mt-6" />
        <Button asChild variant="outline" className="mt-3 h-12 w-full rounded-2xl">
          <Link href="/subscribe">عندي كود تفعيل</Link>
        </Button>
      </Card>
    </div>
  );
}
