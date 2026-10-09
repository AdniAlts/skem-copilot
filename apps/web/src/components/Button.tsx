import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2',
        // Ukuran
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-5 py-2.5 text-base',
        // Varian
        variant === 'primary' &&
          'bg-brand-teal text-white hover:bg-teal-700 focus:ring-brand-teal active:bg-teal-800 shadow-sm',
        variant === 'secondary' &&
          'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400 active:bg-slate-300',
        variant === 'danger' &&
          'bg-brand-terracotta text-white hover:bg-red-700 focus:ring-brand-terracotta active:bg-red-800 shadow-sm',
        variant === 'outline' &&
          'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
        variant === 'ghost' &&
          'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400',
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  );
}
