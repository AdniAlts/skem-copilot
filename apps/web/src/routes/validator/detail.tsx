import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ArrowLeft, Check, X, Edit3 } from 'lucide-react';

export function ValidatorDetailRoute() {
  const { id = 'SKM-7Q2K9D1A' } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/validator">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-brand-dark">
                Validasi Final Pengajuan {id}
              </h1>
              <StatusBadge type="submission" status="waiting_validator" size="sm" />
            </div>
            <p className="text-xs text-slate-500">
              Mahasiswa: Budi Santoso &bull; Telah disetujui Dosen Wali
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="danger" size="sm" className="gap-1.5">
            <X className="w-4 h-4" />
            Tolak Berkas
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5">
            <Check className="w-4 h-4" />
            Sahkan & Validasi
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pratinjau PDF Formulir Final</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-200 text-xs text-slate-400">
            [Formulir FM.MHS.PENGAJUANSKEM dengan E-Sign Mahasiswa & Verifikator]
          </CardContent>
        </Card>

        <Card className="space-y-4">
          <CardHeader>
            <CardTitle className="text-base">Penyesuaian Kredit Final</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block">Estimasi Skor AI (Tabel Bobot)</span>
              <span className="text-lg font-bold text-brand-dark">1,10 Poin</span>
            </div>

            <div className="p-3 border border-dashed border-teal-200 bg-teal-50/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-dark text-xs flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-brand-teal" />
                  Ubah Kredit Final (Opsional)
                </span>
                <span className="text-[11px] text-slate-500">Wajib sertakan alasan</span>
              </div>
              <p className="text-xs text-slate-500">
                Sebagai Validator, Anda dapat menyesuaikan nilai kredit akhir dengan alasan tertulis
                resmi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
