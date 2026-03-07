import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'dark';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, variant = 'default', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const isDark = variant === 'dark';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'mb-1 block text-sm font-medium',
              isDark ? 'text-slate-200' : 'text-gray-700 dark:text-slate-200'
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-2xl border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-1',
            isDark
              ? 'border-white/10 bg-slate-950/50 text-white placeholder:text-slate-500 focus:border-cyan-300 focus:ring-cyan-300'
              : 'border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300 dark:focus:ring-cyan-300',
            error && (isDark
              ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400'
              : 'border-red-500 focus:border-red-500 focus:ring-red-500'),
            className
          )}
          {...props}
        />
        {error && (
          <p className={cn('mt-1 text-xs', isDark ? 'text-rose-300' : 'text-red-600 dark:text-rose-300')}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
