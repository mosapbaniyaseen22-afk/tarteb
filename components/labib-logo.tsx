import { cn } from '@/lib/utils';

type LabibLogoSize = 'sm' | 'md' | 'lg';

type LabibLogoProps = {
  size?: LabibLogoSize;
  className?: string;
};

export function LabibLogo({ size = 'md', className }: LabibLogoProps) {
  let box = 'h-10 w-10';
  switch (size) {
    case 'sm':
      box = 'h-8 w-8';
      break;
    case 'md':
      box = 'h-10 w-10';
      break;
    case 'lg':
      box = 'h-12 w-12';
      break;
    default: {
      const exhaustive: never = size;
      return exhaustive;
    }
  }

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full bg-white shadow-glow ring-2 ring-primary/20',
        box,
        className,
      )}
    >
      <img
        src="/labib-logo.jpeg"
        alt="لبيب"
        className="h-full w-full scale-[1.28] object-cover"
      />
    </span>
  );
}
