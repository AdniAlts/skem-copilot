import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { DECISION_NOTE_MAX_LENGTH, validateRejectNote } from '../lib/verifier';

export interface RejectDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Melempar error jika gagal; isian dipertahankan agar tidak perlu diketik ulang. */
  onSubmit: (note: string) => Promise<void>;
  isSubmitting?: boolean;
  /** Mis. "Tolak Pengajuan SKM-…" */
  title?: string;
}

/** Modal Tolak dengan alasan wajib (aturan sama dengan RejectBodySchema di API). */
export function RejectDecisionModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  title = 'Alasan Penolakan',
}: RejectDecisionModalProps) {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const error = validateRejectNote(note);

  const close = () => {
    setNote('');
    setTouched(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title}>
      <form
        className="space-y-3 text-xs"
        onSubmit={async (event) => {
          event.preventDefault();
          setTouched(true);
          if (error) return;
          try {
            await onSubmit(note);
            setNote('');
            setTouched(false);
          } catch {
            // Gagal: alasan tetap dipertahankan; pesan error ditampilkan pemanggil.
          }
        }}
      >
        <label htmlFor="reject-note" className="block font-semibold text-slate-800">
          Alasan penolakan <span className="text-red-500">*</span>
        </label>
        <textarea
          id="reject-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={DECISION_NOTE_MAX_LENGTH}
          rows={5}
          autoFocus
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal"
          placeholder="Contoh: Nama pada sertifikat bukan nama mahasiswa ini."
          aria-describedby="reject-note-help"
          aria-invalid={touched && !!error}
        />
        <div id="reject-note-help" className="flex items-start justify-between gap-2">
          <span className={touched && error ? 'text-red-600' : 'text-slate-500'}>
            {touched && error ? error : 'Alasan akan dilihat mahasiswa.'}
          </span>
          <span className="text-slate-400 shrink-0">
            {note.length}/{DECISION_NOTE_MAX_LENGTH}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={close} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="danger" size="sm" disabled={!!error || isSubmitting}>
            {isSubmitting ? 'Mengirim...' : 'Kirim penolakan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
