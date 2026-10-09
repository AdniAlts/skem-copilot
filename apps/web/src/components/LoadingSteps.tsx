import { Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface StepItem {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface LoadingStepsProps {
  steps: StepItem[];
  title?: string;
  className?: string;
}

export function LoadingSteps({
  steps,
  title = 'Sedang Menganalisis Dokumen',
  className,
}: LoadingStepsProps) {
  return (
    <div className={cn('rounded-card border border-slate-200 bg-white p-5', className)}>
      {title && (
        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h4>
      )}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isInProgress = step.status === 'in_progress';

          return (
            <div key={step.id || index} className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isCompleted && 'bg-emerald-100 text-emerald-800',
                  isInProgress && 'bg-teal-100 text-brand-teal',
                  !isCompleted && !isInProgress && 'bg-slate-100 text-slate-400',
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isInProgress ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm transition-colors',
                  isCompleted && 'font-medium text-slate-700',
                  isInProgress && 'font-semibold text-brand-dark',
                  !isCompleted && !isInProgress && 'text-slate-400',
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
