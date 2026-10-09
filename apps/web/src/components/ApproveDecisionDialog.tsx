import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { DECISION_NOTE_MAX_LENGTH, formatDateId } from '../lib/verifier';

export interface ApproveDecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Melempar error jika gagal; catatan dipertahankan. */
  onConfirm: (note: string) => Promise<void>;
  isSubmitting?: boolean;
  verifierName: string;
  jabatan: string | null;
  /** URL gambar tanda tangan tersimpan milik Verifikator sendiri. */
  signatureUrl: string | null;
}

/** Konfirmasi Setujui dengan pratinjau bagian III formulir yang akan terisi. */
export function ApproveDecisionDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  verifierName,
  jabatan,
  signatureUrl,
}: ApproveDecisionDialogProps) {
  const [note, setNote] = useState('');

  const close = () => {
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Setujui dan Bubuhkan Tanda Tangan">
      <div className="space-y-4 text-xs text-slate-700">
        <p>Bagian III formulir FM.MHS.PENGAJUANSKEM akan terisi seperti berikut:</p>

        <div className="rounded-lg border border-slate-300 p-3">
          <p className="font-semibold text-slate-900 mb-2">III. Verifikasi</p>
          <dl className="grid grid-cols-3 gap-y-1.5">
            <dt className="text-slate-500">Nama Verifikator</dt>
            <dd className="col-span-2 font-medium">{verifierName}</dd>
            <dt className="text-slate-500">Jabatan</dt>
            <dd className="col-span-2 font-medium">{jabatan ?? '—'}</dd>
            <dt className="text-slate-500">Tanggal Verifikasi</dt>
            <dd className="col-span-2 font-medium">{formatDateId(new Date())}</dd>
            <dt className="text-slate-500">Keputusan</dt>
            <dd className="col-span-2 font-medium">☑ Disetujui ☐ Ditolak</dd>
            <dt className="text-slate-500">Tanda Tangan</dt>
            <dd className="col-span-2">
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="Tanda tangan Verifikator"
                  className="h-14 border border-dashed border-slate-300 rounded bg-white"
                />
              ) : (
                <span className="text-slate-400">Pratinjau tidak tersedia</span>
              )}
            </dd>
          </dl>
        </div>

        <div>
          <label htmlFor="approve-note" className="block font-semibold text-slate-800 mb-1">
            Catatan (opsional)
          </label>
          <textarea
            id="approve-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={DECISION_NOTE_MAX_LENGTH}
            rows={3}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>

        <p className="text-[11px] text-slate-500">
          Tanda tangan berupa gambar tersimpan, bukan tanda tangan elektronik tersertifikasi
          (Simulasi). Setelah disetujui, pengajuan otomatis diteruskan ke Validator.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={close} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            onClick={async () => {
              try {
                await onConfirm(note);
                setNote('');
              } catch {
                // Gagal: catatan dipertahankan; pesan error ditampilkan pemanggil.
              }
            }}
          >
            {isSubmitting ? 'Memproses...' : 'Setujui dan bubuhkan tanda tangan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
