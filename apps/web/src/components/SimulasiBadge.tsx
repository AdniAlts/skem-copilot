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
        'inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold uppercase tracking-wider',
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-0.5 text-xs',
        className,
      )}
      title={note ?? 'Komponen / data ini merupakan simulasi untuk prototipe'}
      {...props}
    >
      <Sparkles
        className={size === 'sm' ? 'w-2.5 h-2.5 text-amber-700' : 'w-3 h-3 text-amber-700'}
      />
      <span>Simulasi</span>
    </span>
  );
}
