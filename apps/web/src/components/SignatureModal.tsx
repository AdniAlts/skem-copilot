import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from './Modal';
import { SignaturePad } from './SignaturePad';
import { saveSignature } from '../api/signature';
import { useToast } from './ToastContext';

export interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SignatureModal({ isOpen, onClose, onSuccess }: SignatureModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSignature = async (payload: { dataUrl: string; file?: File }) => {
    setIsSaving(true);
    try {
      await saveSignature(payload);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['signature'] });
      showToast('Tanda tangan digital berhasil disimpan.', 'success');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Siapkan Tanda Tangan Anda">
      <div className="space-y-3.5">
        <p className="text-xs text-slate-600 leading-relaxed">
          Tanda tangan digital ini akan disimpan di akun Anda dan dibubuhkan secara otomatis pada
          bagian IV formulir resmi <strong className="text-slate-800">FM.MHS.PENGAJUANSKEM</strong>{' '}
          saat mengajukan berkas ke Dosen Wali.
        </p>

        <SignaturePad onSave={handleSaveSignature} onCancel={onClose} isSaving={isSaving} />
      </div>
    </Modal>
  );
}
