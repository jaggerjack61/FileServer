import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModeChipProps {
  children: ReactNode;
  className?: string;
}

export function ModeChip({ children, className }: ModeChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
        className
      )}
    >
      {children}
    </span>
  );
}