import { useState } from 'react';
import { HelpCircle, Send, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { Button } from './Button';
import { WhyButton, WhyModal } from './WhyModal';
import type { AgentQuestion as AgentQuestionType, GuidelineRef } from '@skem/shared';
import { cn } from '../lib/utils';

export interface AgentQuestionProps {
  question: AgentQuestionType;
  publicId?: string;
  currentStep?: number;
  totalSteps?: number;
  fileName?: string;
  activityName?: string;
  isSubmitting?: boolean;
  /** Mode baca-saja: hanya tampilkan pertanyaan & jawaban, tanpa form submit. */
  readOnly?: boolean;
  onSubmit?: (questionId: number, answer: string) => Promise<void>;
  onNavigateToDetail?: () => void;
  className?: string;
}

export function AgentQuestion({
  question,
  currentStep = 1,
  totalSteps = 1,
  fileName,
  activityName,
  isSubmitting = false,
  readOnly = false,
  onSubmit,
  onNavigateToDetail,
  className,
}: AgentQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string>(question.answer || '');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [whyModal, setWhyModal] = useState<{
    guidelineRef: GuidelineRef | null;
    title: string;
    explanation?: string;
  } | null>(null);

  const isLevelQuestion = question.field.toLowerCase().includes('level') || question.field.toLowerCase().includes('tingkat');
  const isUnknownSelected = selectedOption === 'unknown' || selectedOption.toLowerCase() === 'saya tidak tahu';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || isSubmitting || !onSubmit) return;

    setSubmitError(null);
    try {
      await onSubmit(question.id, selectedOption);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirimkan jawaban. Silakan coba lagi.';
      setSubmitError(msg);
    }
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-slate-800 text-xs space-y-3.5 shadow-xs transition-all',
        className
      )}
    >
      {/* Header Pertanyaan */}
      <div className="flex items-start justify-between gap-2 border-b border-amber-200/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-amber-200/80 text-amber-900">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-amber-950 block text-[11px] uppercase tracking-wider">
              Pertanyaan AI Pre-Check
            </span>
            {(fileName || activityName) && (
              <span className="text-[10px] text-amber-800 block truncate max-w-xs">
                Dokumen: {fileName || activityName}
              </span>
            )}
          </div>
        </div>

        {totalSteps > 1 && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-[10px] font-semibold border border-amber-300">
            {currentStep} dari {totalSteps}
          </span>
        )}
      </div>

      {/* Teks Pertanyaan Utama */}
      <div>
        <p className="font-semibold text-slate-900 text-xs leading-relaxed mb-1">
          {question.question}
        </p>

        {/* Bantuan Tingkat Kegiatan jika pertanyaan terkait tingkat */}
        {isLevelQuestion && (
          <div className="mt-1.5 p-2 bg-amber-100/60 rounded border border-amber-200/80 text-[11px] text-amber-900 flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 flex-1">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Tingkat kegiatan ditentukan oleh asal peserta, bukan lokasi acara.
              </span>
            </div>
            <WhyButton
              onClick={() =>
                setWhyModal({
                  guidelineRef: {
                    id: 'istilah-tingkat-kegiatan',
                    title: 'Definisi Tingkat Kegiatan',
                    ref: 'Pedoman SKEM, B. Ketentuan Umum, Istilah dan Definisi poin 12, hlm. 10',
                  },
                  title: 'Definisi Tingkat Kegiatan',
                  explanation:
                    'Tingkat Kegiatan adalah klasifikasi skala kegiatan yang ditentukan berdasarkan cakupan peserta, bukan lokasi penyelenggaraan:\n• Tingkat Internasional: peserta berasal dari sekurang-kurangnya 3 negara.\n• Tingkat Nasional: peserta berasal dari sekurang-kurangnya 3 provinsi di Indonesia.\n• Tingkat Regional: peserta berasal dari sekurang-kurangnya 1 provinsi (3 kota/kabupaten).\n• Tingkat Kampus: peserta berasal dari lingkungan internal PENS.',
                })
              }
            />
          </div>
        )}
      </div>

      {/* Pilihan Jawaban (Radio Buttons) */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-2.5 p-2.5 rounded-lg border text-xs transition-all',
                  readOnly ? 'cursor-default' : 'cursor-pointer',
                  isSelected
                    ? 'bg-white border-brand-blue shadow-xs text-slate-900 font-medium'
                    : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white hover:border-amber-300'
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => !readOnly && setSelectedOption(opt.value)}
                  className="w-3.5 h-3.5 text-brand-blue focus:ring-brand-blue border-slate-300"
                  disabled={isSubmitting || readOnly}
                  readOnly={readOnly}
                />
                <span className="flex-1">{opt.label}</span>
              </label>
            );
          })}
        </div>

        {/* Notifikasi / Arahan jika memilih "Saya tidak tahu" */}
        {isUnknownSelected && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] leading-relaxed flex items-start gap-2 animate-fade-in">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>
                Jika tidak yakin, Anda dapat melengkapi dan mengedit metadata tingkat kegiatan secara manual di halaman rincian pengajuan.
              </span>
              {onNavigateToDetail && (
                <button
                  type="button"
                  onClick={onNavigateToDetail}
                  className="block mt-1 text-brand-blue font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Buka Halaman Detail</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {submitError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Tombol Aksi — hanya jika bukan readOnly */}
        {!readOnly && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedOption || isSubmitting}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Jawaban'}</span>
            </Button>
          </div>
        )}
      </form>

      {/* Modal Kenapa? */}
      {whyModal && (
        <WhyModal
          isOpen={true}
          onClose={() => setWhyModal(null)}
          guidelineRef={whyModal.guidelineRef}
          title={whyModal.title}
          explanation={whyModal.explanation}
        />
      )}
    </div>
  );
}
