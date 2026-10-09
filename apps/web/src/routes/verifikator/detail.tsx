import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowLeft, Check, X } from 'lucide-react';

export function VerifikatorDetailRoute() {
  const { id = 'SKM-7Q2K9D1A' } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/verifikator">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-brand-dark">
                Verifikasi Pengajuan {id}
              </h1>
              <StatusBadge type="review" status="ready" size="sm" />
            </div>
            <p className="text-xs text-slate-500">
              Mahasiswa: Budi Santoso (3124500001) &bull; Kelas 2 D3 IT B
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="danger" size="sm" className="gap-1.5">
            <X className="w-4 h-4" />
            Tolak Pengajuan
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5">
            <Check className="w-4 h-4" />
            Setujui (E-Sign)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dokumen Bukti Sertifikat</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-200 text-xs text-slate-400">
            [Pratinjau PDF Sertifikat Mahasiswa]
          </CardContent>
        </Card>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base">Rincian Data & Catatan AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100 text-xs text-slate-700">
              <span className="font-semibold text-brand-teal block mb-1">
                Catatan Hasil Analisis AI Pre-Check
              </span>
              Tingkat kegiatan diklasifikasikan sebagai <strong>Nasional</strong> berdasarkan 5
              provinsi peserta yang tertera pada sertifikat.
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs text-slate-400 block">Nama Kegiatan</span>
                <span className="font-medium text-brand-dark">
                  Lomba Desain Poster Nasional 2026
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Tanggal Kegiatan</span>
                <span className="font-medium text-brand-dark">20 Agustus 2026</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs text-slate-400 block">Peran / Capaian</span>
                <span className="font-medium text-brand-dark">Juara II</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Estimasi Skor</span>
                <span className="font-semibold text-brand-teal text-base">1,10 Poin</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
