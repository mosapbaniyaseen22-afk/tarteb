'use client';

import { getStageLabel, normalizeTawjihiStage, type TawjihiStage } from '@/lib/utils';

type Props = {
  activeStage: string | null;
  onSwitch: (stage: TawjihiStage) => void;
  disabled?: boolean;
};

const OPTIONS: { id: TawjihiStage; hint: string }[] = [
  { id: 'tawjihi_first', hint: 'الحادي عشر' },
  { id: 'tawjihi_second', hint: 'الثاني عشر' },
];

export function YearAccountSwitch({ activeStage, onSwitch, disabled }: Props) {
  const current = normalizeTawjihiStage(activeStage);

  return (
    <div className="w-full min-w-[12.5rem]">
      <div className="mb-1 text-center text-[11px] text-muted-foreground sm:text-right">تبديل الحساب</div>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-accent/50 p-1">
        {OPTIONS.map((option) => {
          const active = current === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSwitch(option.id)}
              className={`rounded-xl px-2 py-2 text-center transition-all ${
                active ? 'gradient-primary text-white shadow-glow' : 'text-muted-foreground hover:bg-background/70'
              }`}
            >
              <div className="text-xs font-semibold">{getStageLabel(option.id)}</div>
              <div className={`text-[10px] ${active ? 'text-white/80' : 'opacity-70'}`}>{option.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
