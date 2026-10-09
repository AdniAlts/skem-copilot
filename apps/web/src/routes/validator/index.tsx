import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/Table';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export function ValidatorQueueRoute() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-teal" />
          <h1 className="text-2xl font-serif font-bold text-brand-dark">
            Antrian Validator Lintas Kelas
          </h1>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Validasi administratif & teknis tingkat institusi &bull; 1 pengajuan menunggu finalisasi
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Disetujui Verifikator</CardTitle>
          <span className="text-xs text-slate-500">Menampilkan 1 data</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mahasiswa & Kelas</TableHead>
                <TableHead>Kegiatan</TableHead>
                <TableHead>Status Formulir</TableHead>
                <TableHead>Estimasi Kredit</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="font-semibold text-brand-dark">Budi Santoso</div>
                  <div className="text-xs text-slate-400">3124500001 &bull; 2 D3 IT B</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-800">Lomba Desain Poster Nasional</div>
                  <div className="text-xs text-slate-400">Verifikator: Dr. Contoh Dosen Wali</div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    PDF Final Tersedia
                  </span>
                </TableCell>
                <TableCell className="font-semibold text-brand-teal">1,10 Poin</TableCell>
                <TableCell className="text-right">
                  <Link to="/validator/detail/SKM-7Q2K9D1A">
                    <Button variant="ghost" size="sm" className="gap-1">
                      Validasi <ArrowRight className="w-3.5 h-3.5" />
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
