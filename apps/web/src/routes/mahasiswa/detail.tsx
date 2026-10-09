import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowLeft, Send } from 'lucide-react';

export function MahasiswaDetailRoute() {
  const { id = 'SKM-7Q2K9D1A' } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/mahasiswa">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-brand-dark">Pengajuan {id}</h1>
              <StatusBadge type="review" status="ready" size="sm" />
            </div>
            <p className="text-xs text-slate-500">
              Lomba Desain Poster Nasional 2026 &bull; Diperbarui 09 Okt 2026
            </p>
          </div>
        </div>

        <Button variant="primary" className="gap-2">
          <Send className="w-4 h-4" />
          Ajukan ke Verifikator
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Pratinjau Berkas</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-200 text-xs text-slate-400">
            Pratinjau PDF Sertifikat
          </CardContent>
        </Card>

        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle className="text-base">Hasil Analisis & Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 block">Kategori</span>
                <span className="font-medium text-brand-dark">Komponen 3 - Prestasi & Lomba</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Tingkat Kegiatan</span>
                <span className="font-medium text-brand-dark">
                  Nasional (Peserta dari 5 Provinsi)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 block">Peran / Capaian</span>
                <span className="font-medium text-brand-dark">Juara II</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Estimasi Kredit</span>
                <span className="font-semibold text-brand-teal text-base">1,10 Poin</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
