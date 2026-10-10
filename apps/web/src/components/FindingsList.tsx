import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { WhyButton, WhyModal } from './WhyModal';
import type { Finding, GuidelineRef } from '@skem/shared';
import { cn } from '../lib/utils';

export interface FindingsListProps {
  findings: Finding[];
  className?: string;
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  category: 'Kategori Kegiatan',
  level: 'Tingkat Kegiatan',
  role: 'Peran / Jabatan',
  activity_name: 'Nama Kegiatan',
  name_match: 'Kesesuaian Nama Mahasiswa',
  deadline: 'Batas Waktu Kegiatan',
  completeness: 'Kelengkapan Dokumen',
  credit: 'Penetapan Bobot Kredit',
};

export function FindingsList({ findings, className }: FindingsListProps) {
  const [activeModal, setActiveModal] = useState<{
    guidelineRef: GuidelineRef | null;
    title: string;
    explanation?: string;
  } | null>(null);

  if (!findings || findings.length === 0) {
    return (
      <div className={cn('p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500', className)}>
        Belum ada hasil pemeriksaan untuk berkas ini.
      </div>
    );
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-4 h-4 text-brand-blue" />
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Hasil Pemeriksaan AI Pre-Check ({findings.length})
        </h4>
      </div>

      <div className="space-y-2">
        {findings.map((finding, idx) => {
          const isPass = finding.result === 'pass';
          const isWarn = finding.result === 'warn';
          const isFail = finding.result === 'fail';

          const label = CHECK_TYPE_LABELS[finding.checkType] || finding.checkType;

          return (
            <div
              key={`${finding.checkType}-${idx}`}
              className={cn(
                'p-3 rounded-lg border text-xs transition-colors flex items-start gap-2.5',
                isPass && 'bg-emerald-50/60 border-emerald-200 text-emerald-900',
                isWarn && 'bg-amber-50/60 border-amber-200 text-amber-900',
                isFail && 'bg-red-50/60 border-red-200 text-red-900'
              )}
            >
              <div className="shrink-0 mt-0.5">
                {isPass && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {isWarn && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {isFail && <XCircle className="w-4 h-4 text-red-600" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-slate-900 font-semibold">{label}</span>
                    {finding.confidence !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/80 border border-slate-200 text-slate-600 font-mono">
                        {Math.round(finding.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  {finding.guidelineRef && (
                    <WhyButton
                      onClick={() =>
                        setActiveModal({
                          guidelineRef: finding.guidelineRef ?? null,
                          title: `Aturan ${label}`,
                          explanation: finding.message,
                        })
                      }
                      size="xs"
                    />
                  )}
                </div>

                <p className="text-slate-700 leading-relaxed text-xs">
                  {finding.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {activeModal && (
        <WhyModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          guidelineRef={activeModal.guidelineRef}
          title={activeModal.title}
          explanation={activeModal.explanation}
        />
      )}
    </div>
  );
}
