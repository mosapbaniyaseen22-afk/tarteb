'use client';

import type { CSSProperties, HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Logo({ size = 40, className = '', style, ...props }: LogoProps) {
  return (
    <div
      {...props}
      className={`flex items-center gap-3 ${className}`}
      style={style as CSSProperties}
    >
      <div
        className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-emerald-500 text-white shadow-glow"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 11.5L15.5 21.5v19c0 8 6 14 16.5 14S48.5 48.5 48.5 40.5v-19L32 11.5z"
            fill="#fff"
          />
          <path
            d="M22 23l10-6 10 6"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 31.5c0-1.1.9-2 2-2h24c1.1 0 2 .9 2 2v9.5c0 3-2 6-8 6s-8-3-8-6-2 6-8 6-8-3-8-6V31.5z"
            fill="#fff"
            stroke="#0f172a"
            strokeWidth="3"
          />
          <path
            d="M25 43.5V31.5m14 12V31.5"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xl font-bold text-foreground">لبيب</span>
    </div>
  );
}
