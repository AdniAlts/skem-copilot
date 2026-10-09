import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, HelpCircle, RefreshCw, X, Upload, ExternalLink } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import type { SubmissionCard as SubmissionCardType } from '@skem/shared';
import { cn } from '../lib/utils';

export interface SubmissionCardProps {
  submission: SubmissionCardType;
  onCancel?: (publicId: string) => void;
  onReupload?: (publicId: string) => void;
  onRetry?: (publicId: string) => void;
  onAnswer?: (publicId: string) => void;
  className?: string;
}

export function SubmissionCard({
  submission,
  onCancel,
  onReupload,
  onRetry,
  onAnswer,
  className,
}: SubmissionCardProps) {
  const {
    publicId,
    fileName,
    reviewStatus,
    activityName,
    estimatedCredit,
    warnings,
    openQuestionCount,
    lastError,
  } = submission;

  const isDraft = reviewStatus === 'queued' || reviewStatus === 'analyzing';
  const isReady = reviewStatus === 'ready';
  const needsFix = reviewStatus === 'needs_fix';
  const hasProblem = reviewStatus === 'problem';
  const hasError = reviewStatus === 'error';

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-500 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-brand-dark truncate">{fileName}</h3>
            {activityName && (
              <p className="text-xs text-slate-600 truncate mt-0.5">{activityName}</p>
            )}
          </div>
        </div>
        <StatusBadge type="review" status={reviewStatus} size="sm" />
      </div>

      {/* Content based on status */}
      <div className="space-y-3">
        {/* Estimated Credit */}
        {isReady && estimatedCredit !== null && (
          <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
            <span className="text-xs text-emerald-700">Estimasi Kredit:</span>
            <span className="text-sm font-semibold text-emerald-800">
              {estimatedCredit.toFixed(2)}
            </span>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {warnings.map((warning, index) => (
                <p key={index} className="text-xs text-amber-800">
                  {warning.message}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        {needsFix && openQuestionCount > 0 && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-800">
                {openQuestionCount} pertanyaan perlu dijawab
              </p>
            </div>
          </div>
        )}

        {/* Problem */}
        {hasProblem && (
          <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              Terdapat masalah pada dokumen. Silakan periksa dan unggah ulang.
            </p>
          </div>
        )}

        {/* Error */}
        {hasError && (
          <div className="flex items-start gap-2 p-2 bg-slate-100 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700 font-medium mb-1">
                Gagal menganalisis dokumen
              </p>
              {lastError && (
                <p className="text-xs text-slate-600 truncate">{lastError}</p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          {isDraft && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(publicId)}
              className="flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Batalkan
            </Button>
          )}

          {(hasProblem || isDraft) && onReupload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReupload(publicId)}
              className="flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah Ulang
            </Button>
          )}

          {hasError && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(publicId)}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </Button>
          )}

          {needsFix && onAnswer && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAnswer(publicId)}
              className="flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Jawab Pertanyaan
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Link to={`/mahasiswa/detail/${publicId}`}>
              <Button
                variant={isReady ? 'primary' : 'outline'}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <span>{isReady ? 'Buka Detail & Ajukan' : 'Lihat Detail'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
