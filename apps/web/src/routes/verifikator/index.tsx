import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/Table';
import { ArrowRight, UserCheck } from 'lucide-react';

export function VerifikatorQueueRoute() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-teal" />
            <h1 className="text-2xl font-serif font-bold text-brand-dark">
              Antrian Verifikasi Kelas 2 D3 IT B
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Dosen Wali: Dr. Contoh Dosen Wali &bull; 2 berkas menunggu keputusan
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Mahasiswa</CardTitle>
          <span className="text-xs text-slate-500">Menampilkan 2 data</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>Kegiatan</TableHead>
                <TableHead>Status AI</TableHead>
                <TableHead>Kredit</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="font-semibold text-brand-dark">Budi Santoso</div>
                  <div className="text-xs text-slate-400">3124500001</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-800">Lomba Desain Poster Nasional</div>
                  <div className="text-xs text-slate-400">Tingkat Nasional &bull; Juara II</div>
                </TableCell>
                <TableCell>
                  <StatusBadge type="review" status="ready" size="sm" />
                </TableCell>
                <TableCell className="font-semibold text-brand-teal">1,10 Poin</TableCell>
                <TableCell className="text-right">
                  <Link to="/verifikator/detail/SKM-7Q2K9D1A">
                    <Button variant="ghost" size="sm" className="gap-1">
                      Periksa <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="font-semibold text-brand-dark">Nisa Rahma</div>
                  <div className="text-xs text-slate-400">3124500002</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-800">Pelatihan Kepemimpinan Mahasiswa</div>
                  <div className="text-xs text-slate-400">Tingkat Kampus &bull; Peserta</div>
                </TableCell>
                <TableCell>
                  <StatusBadge type="review" status="ready" size="sm" />
                </TableCell>
                <TableCell className="font-semibold text-brand-teal">0,25 Poin</TableCell>
                <TableCell className="text-right">
                  <Link to="/verifikator/detail/SKM-8P3L0E2B">
                    <Button variant="ghost" size="sm" className="gap-1">
                      Periksa <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
