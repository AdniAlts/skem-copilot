import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center bg-white/50',
        className,
      )}
    >
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <h4 className="text-base font-serif font-semibold text-brand-dark">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
