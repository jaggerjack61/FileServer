import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  children: ReactNode;
  tone?: 'error' | 'warning' | 'info' | 'success';
  action?: ReactNode;
  className?: string;
}

const toneClasses = {
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-300',
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-green-400/20 dark:bg-green-500/10 dark:text-green-300',
};

export function Alert({ children, tone = 'error', action, className }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm',
        toneClasses[tone],
        className
      )}
    >
      <div>{children}</div>
      {action}
    </div>
  );
}
