import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, PenLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { SignatureModal } from '../../components/SignatureModal';
import { SimulasiBadge } from '../../components/SimulasiBadge';
import { useAuth } from '../../api/auth-context';
import { getSignature } from '../../api/signature';

export function VerifikatorSettingsRoute() {
  const { user } = useAuth();
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const { data: signatureUrl, isLoading } = useQuery({
    queryKey: ['signature'],
    queryFn: getSignature,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/verifikator" title="Kembali ke antrian">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-serif font-bold text-brand-dark">Pengaturan Verifikator</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tanda Tangan</CardTitle>
          <SimulasiBadge />
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-slate-600">
            {user?.name}
            {user?.jabatan ? ` · ${user.jabatan}` : ''}
          </p>
          <div className="h-32 flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
            {isLoading ? (
              <span className="text-xs text-slate-400">Memuat…</span>
            ) : signatureUrl && user?.hasSignature ? (
              <img src={signatureUrl} alt="Tanda tangan tersimpan" className="max-h-28" />
            ) : (
              <span className="text-xs text-slate-400">Belum ada tanda tangan tersimpan</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Tanda tangan hanya dipakai untuk formulir yang Anda setujui. Ini gambar tanda tangan,
            bukan tanda tangan elektronik tersertifikasi.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsSignatureOpen(true)}
          >
            <PenLine className="w-4 h-4" />
            {user?.hasSignature ? 'Ganti tanda tangan' : 'Siapkan tanda tangan'}
          </Button>
        </CardContent>
      </Card>

      <SignatureModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        description="Tanda tangan ini disimpan di akun Anda dan hanya dibubuhkan pada bagian III formulir yang Anda setujui."
      />
    </div>
  );
}
