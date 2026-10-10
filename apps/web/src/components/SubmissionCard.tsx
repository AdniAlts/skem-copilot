import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  X,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { AgentQuestion } from './AgentQuestion';
import { answerQuestion } from '../api/submissions';
import type {
  SubmissionCard as SubmissionCardType,
  AgentQuestion as AgentQuestionType,
} from '@skem/shared';
import { cn } from '../lib/utils';

export interface SubmissionCardProps {
  submission: SubmissionCardType;
  onCancel?: (publicId: string) => void;
  onReupload?: (publicId: string) => void;
  onRetry?: (publicId: string) => void;
  onAnswer?: (publicId: string) => void;
  onOpenSubmit?: (publicId: string) => void;
  questions?: AgentQuestionType[];
  className?: string;
}

const DEFAULT_LEVEL_QUESTION: AgentQuestionType = {
  id: 1,
  seq: 1,
  field: 'level',
  question: 'Peserta kegiatan ini berasal dari mana?',
  options: [
    { value: 'campus', label: 'Hanya lingkungan internal PENS' },
    { value: 'regional', label: 'Satu provinsi (minimal 3 kota/kabupaten)' },
    { value: 'national', label: 'Minimal 3 provinsi di Indonesia' },
    { value: 'international', label: 'Minimal 3 negara' },
    { value: 'unknown', label: 'Saya tidak tahu' },
  ],
};

export function SubmissionCard({
  submission,
  onCancel,
  onReupload,
  onRetry,
  onAnswer,
  onOpenSubmit,
  questions,
  className,
}: SubmissionCardProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

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

  const activeQuestion = questions?.[0] || DEFAULT_LEVEL_QUESTION;

  const handleAnswerSubmit = async (questionId: number, answer: string) => {
    setIsSubmittingAnswer(true);
    try {
      await answerQuestion(publicId, { questionId, answer });
      // Invalidate queries so card and batch progress update without reload
      await queryClient.invalidateQueries({ queryKey: ['batch'] });
      await queryClient.invalidateQueries({ queryKey: ['submissions'] });
      await queryClient.invalidateQueries({ queryKey: ['submission', publicId] });
      setIsAnswering(false);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors',
        className,
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
              {estimatedCredit.toFixed(2).replace('.', ',')} Poin
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

        {/* Questions Summary Box */}
        {needsFix && openQuestionCount > 0 && !isAnswering && (
          <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{openQuestionCount} pertanyaan perlu dijawab</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onAnswer) {
                  onAnswer(publicId);
                } else {
                  setIsAnswering(true);
                }
              }}
              className="text-xs font-semibold text-brand-blue hover:underline flex items-center gap-1"
            >
              <span>Jawab Sekarang</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Inline Agent Question */}
        {needsFix && isAnswering && (
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Menjawab langsung pada kartu:</span>
              <button
                type="button"
                onClick={() => setIsAnswering(false)}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
              >
                <span>Tutup</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <AgentQuestion
              question={activeQuestion}
              fileName={fileName}
              activityName={activityName || undefined}
              isSubmitting={isSubmittingAnswer}
              onSubmit={handleAnswerSubmit}
              onNavigateToDetail={() => navigate(`/mahasiswa/detail/${publicId}`)}
            />
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
              <p className="text-xs text-slate-700 font-medium mb-1">Gagal menganalisis dokumen</p>
              {lastError && <p className="text-xs text-slate-600 truncate">{lastError}</p>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
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

          {needsFix && !isAnswering && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (onAnswer) {
                  onAnswer(publicId);
                } else {
                  setIsAnswering(true);
                }
              }}
              className="flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Jawab Pertanyaan
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isReady && onOpenSubmit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenSubmit(publicId)}
                className="flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan</span>
              </Button>
            )}
            <Link to={`/mahasiswa/detail/${publicId}`}>
              <Button
                variant={isReady && !onOpenSubmit ? 'primary' : 'outline'}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <span>{isReady && !onOpenSubmit ? 'Buka Detail & Ajukan' : 'Lihat Detail'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
