import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  padding = true,
  hover = false,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none',
        padding && 'p-6',
        hover && 'hover:bg-gray-50 hover:shadow-md transition-all cursor-pointer dark:hover:bg-white/[0.08]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
