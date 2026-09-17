'use client';

import { MessageCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstagramMark } from '@/components/instagram-links';
import {
  PRO_INSTAGRAM_HANDLE,
  PRO_PRICE_LABEL,
  PRO_WHATSAPP_LOCAL,
  PRO_WHATSAPP_MESSAGE,
  proInstagramPayUrl,
  proWhatsAppUrl,
} from '@/lib/pro';

type Props = {
  className?: string;
};

export function CliqPayButtons({ className = '' }: Props) {
  return (
    <div className={className}>
      <div className="rounded-2xl bg-accent/50 p-4">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <Smartphone className="h-4 w-4 text-primary" />
          الدفع عبر كليك
        </div>
        <p className="text-sm text-muted-foreground">
          ادفع {PRO_PRICE_LABEL} بكليك، بعدين أرسل الوصل عبر واتساب {PRO_WHATSAPP_LOCAL} أو إنستغرام @{PRO_INSTAGRAM_HANDLE}.
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button asChild className="h-12 rounded-2xl gradient-primary font-semibold">
          <a href={proWhatsAppUrl(PRO_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            دفع كليك عبر واتساب
          </a>
        </Button>
        <Button asChild variant="outline" className="h-12 rounded-2xl font-semibold">
          <a href={proInstagramPayUrl()} target="_blank" rel="noopener noreferrer">
            <InstagramMark className="h-4 w-4" />
            دفع كليك عبر إنستغرام
          </a>
        </Button>
      </div>
    </div>
  );
}
