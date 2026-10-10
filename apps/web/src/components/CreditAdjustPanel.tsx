import { useState } from 'react';
import type { SubmissionDetail } from '@skem/shared';
import { Button } from './Button';
import { DECISION_NOTE_MAX_LENGTH, formatCredit, formatDateTimeId } from '../lib/verifier';
import { validateCreditAdjust } from '../lib/validator';

export interface CreditAdjustPanelProps {
  estimatedCredit: number | null;
  /** Kredit hasil ubah Validator (null jika belum diubah). */
  finalCredit: number | null;
  adjustments: SubmissionDetail['reviews'];
  canEdit: boolean;
  isSaving?: boolean;
  /** Melempar error jika gagal; isian dipertahankan. */
  onSave: (finalCredit: number, reason: string) => Promise<void>;
}

/** Kredit final: satu-satunya data yang boleh diubah Validator, selalu dengan alasan tercatat. */
export function CreditAdjustPanel({
  estimatedCredit,
  finalCredit,
  adjustments,
  canEdit,
  isSaving = false,
  onSave,
}: CreditAdjustPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [creditText, setCreditText] = useState('');
  const [reason, setReason] = useState('');
  const current = finalCredit ?? estimatedCredit;
  const { error, value } = validateCreditAdjust(creditText, reason, current);
  const showError = creditText.trim() !== '' && reason.trim() !== '' && error;

  const reset = () => {
    setIsEditing(false);
    setCreditText('');
    setReason('');
  };

  return (
    <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3 text-xs">
      <h3 className="text-sm font-semibold text-slate-800">Kredit Final</h3>
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className="text-slate-500">Estimasi dari tabel</dt>
          <dd className="text-base font-bold font-serif text-slate-800">
            {formatCredit(estimatedCredit)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Kredit final yang akan ditetapkan</dt>
          <dd className="text-base font-bold font-serif text-emerald-800">
            {formatCredit(current)}
          </dd>
        </div>
      </dl>

      {current === null && (
        <p className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
          Estimasi kredit belum tersedia (kombinasi tidak ada di tabel bobot), sehingga pengajuan
          belum dapat divalidasi. Tolak dengan alasan atau arahkan ke Unit Kemahasiswaan.
        </p>
      )}

      {canEdit && current !== null && !isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-brand-blue font-semibold hover:underline"
        >
          Ubah kredit final
        </button>
      )}

      {isEditing && (
        <form
          className="space-y-2 border-t border-slate-100 pt-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (error || value === null) return;
            try {
              await onSave(value, reason);
              reset();
            } catch {
              // Gagal: isian dipertahankan; pesan error ditampilkan pemanggil.
            }
          }}
        >
          <label htmlFor="final-credit" className="block font-semibold text-slate-800">
            Kredit final baru
          </label>
          <input
            id="final-credit"
            inputMode="decimal"
            value={creditText}
            onChange={(event) => setCreditText(event.target.value)}
            placeholder="mis. 0,5"
            className="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <label htmlFor="credit-reason" className="block font-semibold text-slate-800">
            Alasan perubahan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="credit-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={DECISION_NOTE_MAX_LENGTH}
            rows={3}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <p className={showError ? 'text-red-600' : 'text-slate-500'}>
            {showError ? error : 'Perubahan dan alasannya tercatat beserta nama Anda.'}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reset} disabled={isSaving}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!!error || isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      )}

      {adjustments.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <h4 className="font-semibold text-slate-700 mb-1.5">Riwayat perubahan kredit</h4>
          <ul className="space-y-1.5">
            {adjustments.map((review) => (
              <li key={review.id}>
                Diubah oleh <span className="font-medium">{review.reviewerName}</span>,{' '}
                {formatDateTimeId(review.createdAt)}.
                {review.note && <span className="text-slate-600"> Alasan: {review.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
