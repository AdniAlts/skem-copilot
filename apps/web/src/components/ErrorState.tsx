import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Terjadi Gangguan',
  message = 'Tidak dapat memuat data. Silakan coba beberapa saat lagi.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-red-200 bg-red-50/50 p-6 text-center flex flex-col items-center justify-center',
        className,
      )}
    >
      <div className="mb-3 rounded-full bg-red-100 p-3 text-brand-terracotta">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-serif font-semibold text-brand-dark">{title}</h4>
      <p className="mt-1 max-w-md text-sm text-slate-600">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry} className="gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            Coba lagi
          </Button>
        </div>
      )}
    </div>
  );
}
