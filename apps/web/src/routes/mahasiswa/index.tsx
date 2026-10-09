import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Upload, ArrowRight, Award } from 'lucide-react';

export function MahasiswaDashboardRoute() {
  return (
    <div className="space-y-6">
      {/* Sapaan & Ringkasan Kredit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-brand-dark">
            Selamat Datang, Mahasiswa
          </h1>
          <p className="text-sm text-slate-600">
            Kelas 2 D3 IT B &bull; Dosen Wali: Dr. Dosen Wali (Verifikator)
          </p>
        </div>
        <Link to="/mahasiswa/unggah">
          <Button variant="primary" className="gap-2">
            <Upload className="w-4 h-4" />
            Unggah Sertifikat
          </Button>
        </Link>
      </div>

      {/* Progress Menuju 3.0 Kredit */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-teal" />
            <CardTitle>Progres Kredit SKEM (Target 3,00)</CardTitle>
          </div>
          <span className="text-sm font-semibold text-brand-teal">1,20 / 3,00 Poin</span>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="bg-brand-teal h-3 rounded-full transition-all duration-300"
              style={{ width: '40%' }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-0.5">Komponen 1 (Wajib)</span>
              Target 1,25 &bull; Terpenuhi 0,50
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-0.5">Komponen 2 (Wajib)</span>
              Target 0,50 &bull; Terpenuhi 0,25
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-0.5">
                Komponen 3 (Pilihan)
              </span>
              Min. 1,25 &bull; Terpenuhi 0,45
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Pengajuan Terakhir */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Terakhir</CardTitle>
          <span className="text-xs text-slate-500">2 kegiatan terdaftar</span>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-colors">
            <div>
              <h5 className="font-semibold text-brand-dark text-sm">
                Lomba Desain Poster Nasional 2026
              </h5>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge type="review" status="ready" size="sm" />
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500">Estimasi Kredit: 1,10</span>
              </div>
            </div>
            <Link to="/mahasiswa/detail/SKM-7Q2K9D1A">
              <Button variant="ghost" size="sm" className="gap-1">
                Lihat <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-colors">
            <div>
              <h5 className="font-semibold text-brand-dark text-sm">
                Seminar Nasional Teknologi Kampus
              </h5>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge type="review" status="needs_fix" size="sm" />
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-amber-700">1 pertanyaan klarifikasi</span>
              </div>
            </div>
            <Link to="/mahasiswa/detail/SKM-8P3L0E2B">
              <Button variant="ghost" size="sm" className="gap-1">
                Jawab <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
