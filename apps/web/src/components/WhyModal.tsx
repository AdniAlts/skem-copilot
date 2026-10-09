import { Modal } from './Modal';
import { Button } from './Button';
import { BookOpen, HelpCircle } from 'lucide-react';
import type { GuidelineRef } from '@skem/shared';

export interface WhyModalProps {
  isOpen: boolean;
  onClose: () => void;
  guidelineRef?: GuidelineRef | null;
  explanation?: string;
  title?: string;
}

export function WhyModal({
  isOpen,
  onClose,
  guidelineRef,
  explanation,
  title = 'Penjelasan & Rujukan Pedoman SKEM',
}: WhyModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 text-brand-dark pb-2 border-b border-slate-100">
          <div className="p-2 rounded-lg bg-teal-50 text-brand-teal">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              {guidelineRef?.title || 'Ketentuan Resmi SKEM'}
            </h4>
            <p className="text-xs text-slate-500">
              Pedoman Pelaksanaan SKEM PENS
            </p>
          </div>
        </div>

        {guidelineRef && (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-teal/10 text-brand-teal uppercase tracking-wider block mb-1 w-fit">
              Pasal / Rujukan
            </span>
            <p className="text-xs font-mono text-slate-700 font-medium">
              {guidelineRef.ref}
            </p>
          </div>
        )}

        {explanation && (
          <div className="p-3.5 bg-teal-50/40 rounded-lg border border-teal-100 text-xs text-slate-800 leading-relaxed">
            <span className="font-semibold text-[10px] text-brand-teal uppercase tracking-wider block mb-1">
              Kutipan Pedoman
            </span>
            <p className="whitespace-pre-line">{explanation}</p>
          </div>
        )}

        {!explanation && !guidelineRef && (
          <p className="text-xs text-slate-500 italic">
            Tidak ada rujukan pedoman tambahan untuk item ini.
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export interface WhyButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
  size?: 'sm' | 'xs';
}

export function WhyButton({
  onClick,
  className = '',
  label = 'Kenapa?',
  size = 'xs',
}: WhyButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1 text-brand-teal hover:text-teal-800 hover:underline font-medium focus:outline-none focus:ring-1 focus:ring-brand-teal rounded px-1.5 py-0.5 transition-colors ${
        size === 'xs' ? 'text-xs' : 'text-sm'
      } ${className}`}
      title="Lihat rujukan aturan pedoman"
    >
      <HelpCircle className={size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </button>
  );
}
