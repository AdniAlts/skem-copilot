import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, RefreshCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { SignatureModal } from '../../components/SignatureModal';
import { useToast } from '../../components/ToastContext';
import { getSignature, saveSignature } from '../../api/signature';

export function VerifikatorSettingsRoute() {
  const { showToast } = useToast();
  const [showSignModal, setShowSignModal] = useState(false);

  const { data: signatureUrl, refetch, isLoading } = useQuery<string | null>({
    queryKey: ['verifier-signature'],
    queryFn: getSignature,
  });

  const saveMut = useMutation({
    mutationFn: (dataUrl: string) => saveSignature({ dataUrl }),
    onSuccess: () => {
      void refetch();
      showToast('Tanda tangan berhasil disimpan.', 'success');
      setShowSignModal(false);
    },
    onError: () => {
      showToast('Gagal menyimpan tanda tangan. Coba lagi.', 'error');
    },
  });

  function handleSaved(dataUrl: string) {
    saveMut.mutate(dataUrl);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-brand-blue" />
        <h1 className="text-2xl font-serif font-bold text-brand-dark">Pengaturan Tanda Tangan</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tanda Tangan Digital Verifikator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Tanda tangan Anda hanya dipakai untuk formulir pengajuan SKEM yang Anda setujui. Tidak
            ada pihak lain yang dapat mengakses berkas tanda tangan Anda.
          </p>

          {isLoading ? (
            <div className="h-24 flex items-center justify-center text-sm text-slate-400">
              Memuat…
            </div>
          ) : signatureUrl ? (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <p className="text-xs text-slate-500 font-medium">Pratinjau Tanda Tangan Saat Ini:</p>
              <img
                src={signatureUrl}
                alt="Tanda tangan tersimpan"
                className="max-h-28 object-contain"
              />
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowSignModal(true)}
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Ganti Tanda Tangan
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-slate-500">Belum ada tanda tangan tersimpan.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowSignModal(true)}
              >
                Buat Tanda Tangan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SignatureModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        onSave={handleSaved}
        title="Tanda Tangan Verifikator"
        description="Tanda tangan hanya dipakai untuk formulir yang Anda setujui."
      />
    </div>
  );
}
