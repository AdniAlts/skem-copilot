import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SimulasiBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md';
  note?: string;
}

export function SimulasiBadge({ size = 'md', note, className, ...props }: SimulasiBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-brand-yellow-100 text-brand-yellow-900 border border-brand-yellow font-bold',
        size === 'sm' && 'h-6 px-2 text-[11px]',
        size === 'md' && 'h-7 px-2.5 text-xs',
        className,
      )}
      title={note ?? 'Komponen / data ini merupakan simulasi untuk prototipe'}
      {...props}
    >
      <Sparkles className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>Simulasi</span>
    </span>
  );
}
