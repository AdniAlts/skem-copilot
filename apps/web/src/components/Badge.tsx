import React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'teal' | 'amber' | 'terracotta' | 'slate';
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
        'inline-flex items-center font-medium rounded-full transition-colors',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        variant === 'default' && 'bg-slate-100 text-slate-700',
        variant === 'outline' && 'border border-slate-300 text-slate-700 bg-transparent',
        variant === 'teal' && 'bg-teal-50 text-brand-teal border border-teal-200/60',
        variant === 'amber' && 'bg-amber-50 text-amber-800 border border-amber-200/60',
        variant === 'terracotta' && 'bg-red-50 text-brand-terracotta border border-red-200/60',
        variant === 'slate' && 'bg-slate-100 text-slate-600',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
