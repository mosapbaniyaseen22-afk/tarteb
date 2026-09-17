'use client';

import { useId } from 'react';
import { INSTAGRAM_PAGES } from '@/lib/instagram';

export function InstagramMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `ig-grad-${uid}`;

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        d="M8.2 4.8h7.6A3.4 3.4 0 0 1 19.2 8.2v7.6a3.4 3.4 0 0 1-3.4 3.4H8.2A3.4 3.4 0 0 1 4.8 15.8V8.2A3.4 3.4 0 0 1 8.2 4.8Z"
      />
      <circle cx="12" cy="12" r="3.15" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="16.35" cy="7.65" r="0.85" fill="#fff" />
    </svg>
  );
}

type InstagramLinksProps = {
  variant?: 'cards' | 'icons' | 'compact';
  className?: string;
};

export function InstagramLinks({ variant = 'cards', className = '' }: InstagramLinksProps) {
  switch (variant) {
    case 'compact':
      return (
        <div className={`flex items-center gap-1 ${className}`}>
          {INSTAGRAM_PAGES.map((page) => (
            <a
              key={page.href}
              href={page.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${page.label} ${page.handle}`}
              aria-label={`${page.label} على إنستغرام ${page.handle}`}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              className="relative z-10 rounded-md p-1 transition hover:opacity-80"
            >
              <InstagramMark className="h-4 w-4" />
            </a>
          ))}
        </div>
      );
    case 'icons':
      return (
        <div className={`flex items-center justify-center gap-1.5 ${className}`}>
          {INSTAGRAM_PAGES.map((page) => (
            <a
              key={page.href}
              href={page.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`${page.label} ${page.handle}`}
              aria-label={`${page.label} على إنستغرام ${page.handle}`}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              className="relative z-10 rounded-md p-1 transition hover:opacity-80"
            >
              <InstagramMark className="h-5 w-5" />
            </a>
          ))}
        </div>
      );
    case 'cards':
      return (
        <div className={`flex flex-wrap items-stretch justify-center gap-3 ${className}`}>
          {INSTAGRAM_PAGES.map((page) => (
            <a
              key={page.href}
              href={page.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              className="relative z-10 flex min-w-[10.5rem] items-center gap-3 rounded-2xl glass-card px-4 py-3 text-right shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
            >
              <InstagramMark className="h-12 w-12 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{page.label}</span>
                <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                  {page.handle}
                </span>
              </span>
            </a>
          ))}
        </div>
      );
    default: {
      const exhaustive: never = variant;
      return exhaustive;
    }
  }
}
