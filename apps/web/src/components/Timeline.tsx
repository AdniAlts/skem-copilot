import React from 'react';
import {
  Check,
  CheckCircle2,
  CornerDownRight,
  MoreHorizontal,
  X,
  XCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { SubmissionStatus } from '@skem/shared';
import { cn } from '../lib/utils';

export interface TimelineItem {
  field?: 'status' | 'review_status';
  from?: string | null;
  to: string;
  at: string;
  by?: string | null;
  note?: string | null;
}

export interface ReviewItem {
  id: number;
  stage: 'verifier' | 'validator';
  decision: 'approve' | 'reject' | 'adjust_credit';
  note?: string | null;
  reviewerName: string;
  createdAt: string;
}

export interface SubmissionTimelineProps {
  status: SubmissionStatus;
  timeline?: TimelineItem[];
  reviews?: ReviewItem[];
  finalCredit?: number | null;
  className?: string;
  compact?: boolean;
}

interface StepInfo {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  state: 'completed' | 'current' | 'pending' | 'rejected';
  note?: string | null;
  actor?: string | null;
  date?: string | null;
}

export function Timeline({
  status,
  timeline = [],
  reviews = [],
  finalCredit,
  className,
  compact = false,
}: SubmissionTimelineProps) {
  // Determine rejection details if any
  const rejectionReview = reviews.find((r) => r.decision === 'reject');
  const rejectionNote =
    rejectionReview?.note ||
    timeline.find((t) => t.to === 'rejected' && t.note)?.note ||
    'Pengajuan ditolak oleh staf verifikasi.';

  // Build the 4 canonical stages:
  // 1. Draf (diajukan)
  // 2. Verifikator (Dosen Wali)
  // 3. Validator (Kemahasiswaan)
  // 4. Keputusan Akhir (Disetujui / Ditolak)

  const steps: StepInfo[] = [
    {
      key: 'draft',
      title: 'Draf Diajukan',
      subtitle: 'Mahasiswa menandatangani & mengajukan',
      icon: FileText,
      state: 'completed',
    },
    {
      key: 'verifier',
      title: 'Verifikasi Dosen Wali',
      subtitle: 'Pemeriksaan kesesuaian berkas kelas',
      icon: UserCheck,
      state:
        status === 'waiting_verifier'
          ? 'current'
          : status === 'waiting_validator' || status === 'approved'
            ? 'completed'
            : status === 'rejected' && rejectionReview?.stage === 'verifier'
              ? 'rejected'
              : status === 'rejected'
                ? 'completed'
                : 'pending',
    },
    {
      key: 'validator',
      title: 'Validasi Kemahasiswaan',
      subtitle: 'Pemeriksaan final & penetapan kredit',
      icon: ShieldCheck,
      state:
        status === 'waiting_validator'
          ? 'current'
          : status === 'approved'
            ? 'completed'
            : status === 'rejected' && rejectionReview?.stage === 'validator'
              ? 'rejected'
              : status === 'waiting_verifier'
                ? 'pending'
                : 'pending',
    },
    {
      key: 'decision',
      title: status === 'rejected' ? 'Pengajuan Ditolak' : 'Disetujui',
      subtitle:
        status === 'approved'
          ? finalCredit !== null && finalCredit !== undefined
            ? `Kredit final: ${finalCredit.toFixed(2)} poin`
            : 'Formulir final siap'
          : status === 'rejected'
            ? 'Perlu perbaikan atau unggah ulang'
            : 'Menunggu proses validasi',
      icon: status === 'rejected' ? XCircle : CheckCircle2,
      state: status === 'approved' ? 'completed' : status === 'rejected' ? 'rejected' : 'pending',
    },
  ];

  if (compact) {
    const isReached = (idx: number) =>
      idx >= 0 && idx < steps.length && steps[idx]?.state !== 'pending';
    return (
      <div className={cn('w-full', className)}>
        <div className="flex w-full">
          {steps.map((step, idx) => {
            const isCompleted = step.state === 'completed';
            const isCurrent = step.state === 'current';
            const isRejected = step.state === 'rejected';
            const lineLeft =
              isReached(idx) && isReached(idx - 1) ? 'bg-brand-blue' : 'bg-slate-200';
            const lineRight =
              isReached(idx) && isReached(idx + 1) ? 'bg-brand-blue' : 'bg-slate-200';

            return (
              <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-center">
                  <span className={cn('h-0.5 flex-1', idx === 0 ? 'invisible' : lineLeft)} />
                  <span
                    className={cn(
                      'grid h-6 w-6 flex-none place-items-center rounded-full border-2',
                      isRejected
                        ? 'border-brand-terracotta bg-brand-terracotta text-white'
                        : isCompleted
                          ? 'border-brand-blue bg-brand-blue text-white'
                          : isCurrent
                            ? 'border-brand-blue bg-white text-brand-blue'
                            : 'border-slate-300 bg-white',
                    )}
                    title={`${step.title} (${step.subtitle})`}
                  >
                    {isRejected ? (
                      <X className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : isCompleted ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : isCurrent ? (
                      <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'h-0.5 flex-1',
                      idx === steps.length - 1 ? 'invisible' : lineRight,
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-center text-[11.5px] leading-tight',
                    isRejected
                      ? 'font-bold text-red-700'
                      : isCurrent
                        ? 'font-bold text-brand-dark'
                        : isCompleted
                          ? 'text-brand-dark'
                          : 'text-slate-400',
                  )}
                >
                  {step.title}
                </span>
                {isRejected && (
                  <span className="inline-flex h-5 items-center gap-0.5 whitespace-nowrap rounded-full bg-brand-terracotta pl-1 pr-[7px] text-[10.5px] font-bold text-white">
                    <CornerDownRight className="h-3 w-3" />
                    Ditolak (perlu perbaikan)
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Rejection notice in compact mode */}
        {status === 'rejected' && (
          <div className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-snug text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-bold">Alasan Penolakan:</span> {rejectionNote}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Full detailed timeline view
  return (
    <div className={cn('space-y-4', className)}>
      {/* Visual Step Progress */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
        {steps.map((step, idx) => {
          const isCompleted = step.state === 'completed';
          const isCurrent = step.state === 'current';
          const isRejected = step.state === 'rejected';

          return (
            <div
              key={step.key}
              className={cn(
                'p-2.5 rounded-lg border text-left transition-all',
                isCompleted
                  ? 'bg-white border-emerald-200'
                  : isCurrent
                    ? 'bg-white border-brand-blue ring-1 ring-brand-blue'
                    : isRejected
                      ? 'bg-red-50 border-red-200 ring-1 ring-brand-terracotta'
                      : 'bg-white/50 border-slate-200 opacity-60',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isCurrent
                        ? 'bg-brand-blue-100 text-brand-blue'
                        : isRejected
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {idx + 1}
                </span>
                <span
                  className={cn(
                    'text-xs font-bold truncate',
                    isCompleted
                      ? 'text-emerald-900'
                      : isCurrent
                        ? 'text-brand-blue'
                        : isRejected
                          ? 'text-red-800'
                          : 'text-slate-600',
                  )}
                >
                  {step.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{step.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Alasan Penolakan Box */}
      {status === 'rejected' && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800">Catatan Penolakan Staf</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{rejectionNote}</p>
            <p className="text-[11px] text-red-600/80 mt-2">
              Silakan perbaiki data atau unggah ulang dokumen sertifikat yang valid pada menu
              unggah.
            </p>
          </div>
        </div>
      )}

      {/* Disetujui & Nilai Final Box */}
      {status === 'approved' && finalCredit !== null && finalCredit !== undefined && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-900">
                Pengajuan Telah Divalidasi & Disetujui
              </h4>
              <p className="text-xs text-emerald-700">
                Kredit resmi telah ditambahkan ke akumulasi SKEM Anda.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-emerald-700 block font-medium">Kredit Final</span>
            <span className="text-lg font-serif font-bold text-emerald-800">
              +{finalCredit.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Log Riwayat Aktivitas & Catatan Staf */}
      {timeline.length > 0 && (
        <div className="border border-slate-100 rounded-xl p-3 bg-white">
          <h5 className="text-xs font-semibold text-slate-700 mb-2">Riwayat Proses Pengajuan</h5>
          <div className="space-y-2">
            {timeline.map((item, idx) => (
              <div
                key={idx}
                className="text-xs flex items-start justify-between py-1 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-800">
                      {item.note || `Status berubah menjadi ${item.to}`}
                    </span>
                    {item.by && (
                      <span className="text-slate-400 text-[11px] ml-1.5">oleh {item.by}</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap ml-2">
                  {new Date(item.at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
