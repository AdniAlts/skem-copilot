import React from 'react';
import {
  CheckCircle2,
  Clock,
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
      state:
        status === 'approved'
          ? 'completed'
          : status === 'rejected'
            ? 'rejected'
            : 'pending',
    },
  ];

  if (compact) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between relative">
          {/* Connector line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />

          {steps.map((step, idx) => {
            const isCompleted = step.state === 'completed';
            const isCurrent = step.state === 'current';
            const isRejected = step.state === 'rejected';

            let circleClass = 'bg-white border-slate-300 text-slate-400';
            if (isCompleted) {
              circleClass = 'bg-emerald-600 border-emerald-600 text-white';
            } else if (isCurrent) {
              circleClass = 'bg-brand-blue-600 border-brand-blue-600 text-white ring-4 ring-brand-blue-100';
            } else if (isRejected) {
              circleClass = 'bg-red-600 border-red-600 text-white ring-4 ring-red-100';
            }

            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center group">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-semibold transition-all',
                    circleClass,
                  )}
                  title={`${step.title} (${step.subtitle})`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isRejected ? (
                    <XCircle className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1 text-center font-medium max-w-[70px] truncate',
                    isCurrent
                      ? 'text-brand-blue font-semibold'
                      : isRejected
                        ? 'text-red-700 font-semibold'
                        : isCompleted
                          ? 'text-slate-700'
                          : 'text-slate-400',
                  )}
                >
                  {step.title.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rejection notice in compact mode */}
        {status === 'rejected' && (
          <div className="mt-3 p-2.5 bg-red-50/80 border border-red-200 rounded-lg text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-red-800 block">Alasan Penolakan:</span>
              <p className="text-red-700 text-xs mt-0.5">{rejectionNote}</p>
            </div>
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
                  ? 'bg-white border-emerald-200 shadow-xs'
                  : isCurrent
                    ? 'bg-brand-blue-50/70 border-brand-blue-200 shadow-xs ring-1 ring-brand-blue'
                    : isRejected
                      ? 'bg-red-50/70 border-red-200 shadow-xs ring-1 ring-red-400'
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
                    'text-xs font-semibold truncate',
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
              Silakan perbaiki data atau unggah ulang dokumen sertifikat yang valid pada menu unggah.
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
                      <span className="text-slate-400 text-[11px] ml-1.5">
                        oleh {item.by}
                      </span>
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
