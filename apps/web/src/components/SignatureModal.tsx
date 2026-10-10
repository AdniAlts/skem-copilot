import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { SignaturePad } from './SignaturePad';
import { saveSignature } from '../api/signature';
import { useToast } from './ToastContext';

export interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback menerima dataUrl setelah tanda tangan tersimpan (untuk halaman verifikator dll). */
  onSave?: (dataUrl: string) => void;
  /** Callback lama — dipanggil tanpa argumen setelah flow standar (simpan ke server) selesai. */
  onSuccess?: () => void;
  /** Judul modal kustom. Default: "Siapkan Tanda Tangan Anda". */
  title?: string;
  /** Deskripsi singkat di bawah judul modal. */
  description?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  onSuccess,
  title = 'Siapkan Tanda Tangan Anda',
  description,
}: SignatureModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSignature = async (payload: { dataUrl: string; file?: File }) => {
    setIsSaving(true);
    try {
      await saveSignature(payload);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['signature'] });
      await queryClient.invalidateQueries({ queryKey: ['verifier-signature'] });
      showToast('Tanda tangan digital berhasil disimpan.', 'success');
      // Jika ada onSave (misal verifikator), panggil dengan dataUrl
      if (onSave) {
        onSave(payload.dataUrl);
      }
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      showToast('Gagal menyimpan tanda tangan digital. Silakan coba lagi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const defaultDescription = !description
    ? 'Tanda tangan digital ini akan disimpan di akun Anda dan dibubuhkan secara otomatis pada bagian IV formulir resmi FM.MHS.PENGAJUANSKEM saat mengajukan berkas ke Dosen Wali.'
    : description;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-3.5">
        <p className="text-xs text-slate-600 leading-relaxed">{defaultDescription}</p>

        <SignaturePad onSave={handleSaveSignature} onCancel={onClose} isSaving={isSaving} />
      </div>
    </Modal>
  );
}
