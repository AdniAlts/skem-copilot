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
        'inline-flex items-center justify-center font-bold rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none gap-2',
        // Ukuran
        size === 'sm' && 'h-9 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-[50px] px-5 text-[15px] rounded-xl',
        // Varian
        variant === 'primary' &&
          'bg-brand-blue text-white hover:bg-brand-blue-700 focus-visible:ring-brand-blue active:bg-brand-blue-800 shadow-cta',
        variant === 'secondary' &&
          'bg-emerald-50 text-brand-blue-600 hover:bg-brand-blue-100 focus-visible:ring-brand-blue-300 active:bg-brand-blue-200',
        variant === 'danger' &&
          'bg-brand-terracotta text-white hover:bg-red-600 focus-visible:ring-brand-terracotta active:bg-red-700',
        variant === 'outline' &&
          'border border-slate-300 bg-white text-brand-dark hover:bg-brand-bg focus-visible:ring-brand-blue-300',
        variant === 'ghost' &&
          'bg-transparent text-brand-blue hover:bg-emerald-50 focus-visible:ring-brand-blue-300',
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
