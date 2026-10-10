import { Loader2, CheckCircle2, Clock, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { BatchProgress } from '@skem/shared';
import { cn } from '../lib/utils';

export interface ProgressTrackerProps {
  progress: BatchProgress['progress'];
  className?: string;
}

export function ProgressTracker({ progress, className }: ProgressTrackerProps) {
  const { total, done, counts } = progress;
  const percentage = total > 0 ? (done / total) * 100 : 0;

  const isComplete = done === total && total > 0;
  const hasErrors = (counts.error ?? 0) > 0;
  const hasProblems = (counts.problem ?? 0) > 0;

  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 p-4', className)}>
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-brand-dark">
            {isComplete ? 'Selesai' : 'Memproses'}
          </span>
          <span className="text-sm text-slate-600">
            {done} dari {total} file
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              isComplete
                ? hasErrors || hasProblems
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
                : 'bg-brand-blue'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Status Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Analyzing */}
        {(counts.analyzing ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-brand-blue-50 rounded-lg">
            <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
            <div>
              <div className="text-xs text-brand-blue-700">Dianalisis</div>
              <div className="text-sm font-semibold text-brand-blue-800">{counts.analyzing}</div>
            </div>
          </div>
        )}

        {/* Queued */}
        {(counts.queued ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <Clock className="w-4 h-4 text-slate-500" />
            <div>
              <div className="text-xs text-slate-600">Antrian</div>
              <div className="text-sm font-semibold text-slate-700">{counts.queued}</div>
            </div>
          </div>
        )}

        {/* Ready */}
        {(counts.ready ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-xs text-emerald-700">Siap</div>
              <div className="text-sm font-semibold text-emerald-800">{counts.ready}</div>
            </div>
          </div>
        )}

        {/* Needs Fix */}
        {(counts.needs_fix ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div>
              <div className="text-xs text-amber-700">Perlu Perbaikan</div>
              <div className="text-sm font-semibold text-amber-800">{counts.needs_fix}</div>
            </div>
          </div>
        )}

        {/* Problem */}
        {(counts.problem ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <div>
              <div className="text-xs text-red-700">Bermasalah</div>
              <div className="text-sm font-semibold text-red-800">{counts.problem}</div>
            </div>
          </div>
        )}

        {/* Error */}
        {(counts.error ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
            <AlertOctagon className="w-4 h-4 text-slate-500" />
            <div>
              <div className="text-xs text-slate-600">Gagal</div>
              <div className="text-sm font-semibold text-slate-700">{counts.error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
