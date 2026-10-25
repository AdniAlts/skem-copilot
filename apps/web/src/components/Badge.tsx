import React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'blue' | 'amber' | 'terracotta' | 'slate';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-full transition-colors',
        size === 'sm' && 'h-[22px] px-2 text-[11.5px]',
        size === 'md' && 'h-6 px-2.5 text-xs',
        variant === 'default' && 'bg-slate-100 text-slate-700',
        variant === 'outline' && 'border border-slate-200 text-slate-700 bg-white',
        variant === 'blue' && 'bg-brand-blue-100 text-brand-blue-600',
        variant === 'amber' && 'bg-amber-50 text-amber-800',
        variant === 'terracotta' && 'bg-red-50 text-red-700',
        variant === 'slate' && 'bg-slate-100 text-slate-600',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
