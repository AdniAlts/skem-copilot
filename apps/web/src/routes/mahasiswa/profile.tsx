import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { SimulasiBadge } from '../../components/SimulasiBadge';
import { Button } from '../../components/Button';
import { User, PenTool } from 'lucide-react';

export function MahasiswaProfileRoute() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-brand-dark">Profil Mahasiswa</h1>
        <SimulasiBadge />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand-teal" />
            <CardTitle className="text-base">Data Akademik</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block">Nama Lengkap</span>
              <span className="font-semibold text-brand-dark">Budi Santoso</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">NRP</span>
              <span className="font-semibold text-brand-dark">3124500001</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block">Program Studi</span>
              <span className="text-slate-700">D3 Teknik Informatika</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Kelas & Angkatan</span>
              <span className="text-slate-700">2 D3 IT B (2025)</span>
            </div>
          </div>
          <div className="pt-1">
            <span className="text-xs text-slate-400 block">Dosen Wali (Verifikator)</span>
            <span className="text-slate-700 font-medium">Dr. Contoh Dosen Wali</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-brand-teal" />
            <CardTitle className="text-base">Tanda Tangan Elektronik (E-Sign)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-4">
            Tanda tangan digunakan untuk lembar pernyataan mahasiswa pada formulir pengajuan SKEM
            (simulasi).
          </p>
          <div className="h-28 rounded border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400 mb-4">
            [Pratinjau Gambar Tanda Tangan]
          </div>
          <Button variant="secondary" size="sm">
            Ubah Tanda Tangan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
