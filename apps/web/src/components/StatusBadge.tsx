import React from 'react';
import {
  type ReviewStatus,
  type SubmissionStatus,
  type OfficialStatus,
  REVIEW_STATUS_LABELS,
  SUBMISSION_STATUS_LABELS,
  OFFICIAL_STATUS_LABELS,
} from '@skem/shared';
import {
  Clock,
  Loader2,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  AlertOctagon,
  Ban,
  FileText,
  XCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type StatusBadgeType =
  | { type: 'review'; status: ReviewStatus }
  | { type: 'submission'; status: SubmissionStatus }
  | { type: 'official'; status: OfficialStatus };

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: 'review' | 'submission' | 'official';
  status: ReviewStatus | SubmissionStatus | OfficialStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ type, status, size = 'md', className, ...props }: StatusBadgeProps) {
  let label = '';
  let colorClasses = '';
  let icon: React.ReactNode = null;

  if (type === 'review') {
    const revStatus = status as ReviewStatus;
    label = REVIEW_STATUS_LABELS[revStatus] ?? revStatus;

    switch (revStatus) {
      case 'queued':
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        icon = <Clock className="w-3.5 h-3.5 text-slate-500" />;
        break;
      case 'analyzing':
        colorClasses = 'bg-brand-blue-50 text-brand-blue border-brand-blue-200/80';
        icon = <Loader2 className="w-3.5 h-3.5 text-brand-blue animate-spin" />;
        break;
      case 'ready':
        colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
        break;
      case 'needs_fix':
        colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
        icon = <HelpCircle className="w-3.5 h-3.5 text-amber-600" />;
        break;
      case 'problem':
        colorClasses = 'bg-red-50 text-brand-terracotta border-red-200';
        icon = <AlertTriangle className="w-3.5 h-3.5 text-brand-terracotta" />;
        break;
      case 'error':
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
        icon = <AlertOctagon className="w-3.5 h-3.5 text-red-500" />;
        break;
      case 'cancelled':
        colorClasses = 'bg-slate-100 text-slate-500 border-slate-200';
        icon = <Ban className="w-3.5 h-3.5 text-slate-400" />;
        break;
      default:
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        icon = <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  } else if (type === 'submission') {
    const subStatus = status as SubmissionStatus;
    label = SUBMISSION_STATUS_LABELS[subStatus] ?? subStatus;

    switch (subStatus) {
      case 'draft':
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        icon = <FileText className="w-3.5 h-3.5 text-slate-500" />;
        break;
      case 'waiting_verifier':
        colorClasses = 'bg-brand-blue-50 text-brand-blue border-brand-blue-200';
        icon = <Clock className="w-3.5 h-3.5 text-brand-blue" />;
        break;
      case 'waiting_validator':
        colorClasses = 'bg-brand-blue-50 text-brand-blue border-brand-blue-200';
        icon = <Clock className="w-3.5 h-3.5 text-brand-blue" />;
        break;
      case 'approved':
        colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
        break;
      case 'rejected':
        colorClasses = 'bg-red-50 text-brand-terracotta border-red-200';
        icon = <XCircle className="w-3.5 h-3.5 text-brand-terracotta" />;
        break;
      default:
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        icon = <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  } else if (type === 'official') {
    const offStatus = status as OfficialStatus;
    label = OFFICIAL_STATUS_LABELS[offStatus] ?? offStatus;

    switch (offStatus) {
      case 'dalam_proses':
        colorClasses = 'bg-brand-blue-50 text-brand-blue border-brand-blue-200';
        icon = <Clock className="w-3.5 h-3.5 text-brand-blue" />;
        break;
      case 'disetujui':
        colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
        break;
      case 'ditolak':
        colorClasses = 'bg-red-50 text-brand-terracotta border-red-200';
        icon = <XCircle className="w-3.5 h-3.5 text-brand-terracotta" />;
        break;
      default:
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        icon = <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        colorClasses,
        className,
      )}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
