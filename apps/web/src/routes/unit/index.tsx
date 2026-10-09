import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { BarChart3, TrendingUp, Users, CheckCircle } from 'lucide-react';

export function UnitMonitoringRoute() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-teal" />
          <h1 className="text-2xl font-serif font-bold text-brand-dark">
            Monitoring SKEM &bull; Unit Kemahasiswaan
          </h1>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Tampilan analitik dan evaluasi pelaksanaan SKEM (Read-only)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-brand-teal rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Total Pengajuan</span>
              <span className="text-xl font-bold text-brand-dark">142 Berkas</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Telah Divalidasi</span>
              <span className="text-xl font-bold text-brand-dark">118 Berkas</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Rata-rata Kredit / Mhs</span>
              <span className="text-xl font-bold text-brand-dark">2,45 Poin</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi Pengajuan per Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-44 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded text-xs text-slate-400">
            [Visualisasi Grafik Pengajuan SKEM per Kelas]
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
