import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { StatCard } from '../../components/StatCard';
import { TrendingUp, Users, CheckCircle } from 'lucide-react';

export function UnitMonitoringRoute() {
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] sm:text-[32px] leading-[1.15] font-serif font-bold text-brand-dark">
          Monitoring SKEM &bull; Unit Kemahasiswaan
        </h1>
        <p className="text-[14.5px] leading-relaxed text-slate-600">
          Tampilan analitik dan evaluasi pelaksanaan SKEM (Read-only)
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard
          label="Total Pengajuan"
          value="142 Berkas"
          icon={<Users className="h-[17px] w-[17px]" />}
        />
        <StatCard
          label="Telah Divalidasi"
          value="118 Berkas"
          tone="blue"
          icon={<CheckCircle className="h-[17px] w-[17px]" />}
        />
        <StatCard
          label="Rata-rata Kredit / Mhs"
          value="2,45 Poin"
          tone="warning"
          icon={<TrendingUp className="h-[17px] w-[17px]" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Distribusi Pengajuan per Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-center justify-center rounded-[10px] border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
            [Visualisasi Grafik Pengajuan SKEM per Kelas]
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
