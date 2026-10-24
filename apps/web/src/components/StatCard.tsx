import React from 'react';
import { cn } from '../lib/utils';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'blue' | 'warning' | 'error' | 'neutral';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, { label: string; value: string }> = {
  blue: { label: 'text-brand-blue-600', value: 'text-brand-dark' },
  warning: { label: 'text-amber-800', value: 'text-amber-900' },
  error: { label: 'text-red-700', value: 'text-red-900' },
  neutral: { label: 'text-slate-600', value: 'text-brand-dark' },
};

/** Kartu angka ringkas (antrian, monitoring) sesuai desain: label + ikon, angka serif besar. */
export function StatCard({ label, value, icon, tone = 'neutral', className }: StatCardProps) {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-card bg-white px-4 py-3.5 shadow-card',
        className,
      )}
    >
      <span className={cn('flex items-center gap-1.5 text-[13px]', toneClasses.label)}>
        <span className={cn('flex-none', tone === 'neutral' && 'text-brand-blue')}>{icon}</span>
        {label}
      </span>
      <span className={cn('font-serif text-[32px] font-bold leading-none', toneClasses.value)}>
        {value}
      </span>
    </div>
  );
}
