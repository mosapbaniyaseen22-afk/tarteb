'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, Check, Crown, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CliqPayButtons } from '@/components/cliq-pay-buttons';
import {
  PRO_FREE_FEATURES,
  PRO_OFFER_LABEL,
  PRO_PAID_FEATURES,
  PRO_PRICE_LABEL,
} from '@/lib/pro';
import { ACTIVATION_DURATION_DAYS, formatActivationCode } from '@/lib/activation';
import { activateSubscriptionCode } from '@/lib/subscription-client';

const benefits = [
  `تفعيل ترتيب+ لمدة شهر بـ ${PRO_PRICE_LABEL} (${PRO_OFFER_LABEL})`,
  ...PRO_PAID_FEATURES,
  ...PRO_FREE_FEATURES,
];

export default function SubscribePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [activating, setActivating] = useState(false);

  const handleActivate = async (event: FormEvent) => {
    event.preventDefault();
    if (activating) return;
    setActivating(true);
    try {
      const result = await activateSubscriptionCode(code);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`تم تفعيل الاشتراك لمدة ${ACTIVATION_DURATION_DAYS} يوماً`);
      router.push('/dashboard');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        العودة للرئيسية
      </button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden rounded-3xl border-0 glass-card p-6 shadow-soft md:p-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-glow">
            <Crown className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">اشترك في ترتيب+</h1>
          <p className="mt-2 text-lg font-semibold text-primary">
            {PRO_PRICE_LABEL} • {PRO_OFFER_LABEL}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            ادفع عبر كليك، بعدين أرسل الوصل على واتساب أو إنستغرام لنرسل لك كود التفعيل.
          </p>

          <form onSubmit={(event) => void handleActivate(event)} className="mt-6 space-y-3">
            <Label>أدخل كود الاشتراك</Label>
            <Input
              value={code}
              onChange={(event) => setCode(formatActivationCode(event.target.value))}
              placeholder="LBIB-XXXX-XXXX"
              className="h-12 rounded-xl text-center font-mono tracking-widest"
              autoComplete="off"
            />
            <Button type="submit" disabled={activating || code.trim().length < 8} variant="outline" className="h-12 w-full rounded-xl">
              <KeyRound className="h-4 w-4" />
              {activating ? 'جاري التفعيل...' : 'تفعيل الكود'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            أو
            <div className="h-px flex-1 bg-border" />
          </div>

          <ul className="space-y-2">
            {benefits.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>

          <CliqPayButtons className="mt-6" />

          <p className="mt-3 text-center text-sm font-medium text-primary">
            يرجى إرسال الوصل بعد الدفع
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
