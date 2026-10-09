import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { StatusBadge } from '../../components/StatusBadge';
import { SimulasiBadge } from '../../components/SimulasiBadge';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastContext';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/Table';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingSteps, type StepItem } from '../../components/LoadingSteps';
import {
  REVIEW_STATUS,
  SUBMISSION_STATUS,
  OFFICIAL_STATUS,
  type ReviewStatus,
  type SubmissionStatus,
  type OfficialStatus,
} from '@skem/shared';
import { Sparkles } from 'lucide-react';

export function DevKomponenRoute() {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg'>('md');

  const demoSteps: StepItem[] = [
    { id: '1', label: 'Membaca dokumen sertifikat (Vision LLM)', status: 'completed' },
    { id: '2', label: 'Memeriksa kecocokan nama & aturan tanggal', status: 'completed' },
    { id: '3', label: 'Menentukan kategori & tingkat kegiatan', status: 'in_progress' },
    { id: '4', label: 'Menghitung estimasi kredit dari tabel bobot', status: 'pending' },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Header Halaman Showcase */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-teal" />
          <h1 className="text-3xl font-serif font-bold text-brand-dark">
            Katalog Komponen UI & Tema (FE-01)
          </h1>
          <SimulasiBadge />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Halaman tinjauan untuk seluruh komponen dasar, variasi status badge, tombol, dialog,
          tabel, dan tema warna sesuai{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-brand-teal font-mono text-xs">
            docs/ui-spec.md §1–§3
          </code>
          .
        </p>
      </div>

      {/* 1. StatusBadge (review_status, submission_status, official_status) */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-semibold text-brand-dark border-b pb-2 border-slate-200">
          1. StatusBadge (Ikon + Label Indonesia + Warna ui-spec)
        </h2>

        {/* review_status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-sans uppercase tracking-wider text-slate-500">
              Kartu Analisis (review_status)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5 items-center">
              {REVIEW_STATUS.map((status) => (
                <StatusBadge key={status} type="review" status={status as ReviewStatus} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* submission_status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-sans uppercase tracking-wider text-slate-500">
              Siklus Pengajuan (submission_status)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5 items-center">
              {SUBMISSION_STATUS.map((status) => (
                <StatusBadge key={status} type="submission" status={status as SubmissionStatus} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* official_status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-sans uppercase tracking-wider text-slate-500">
              Status Resmi Mahasiswa (official_status)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2.5 items-center">
              {OFFICIAL_STATUS.map((status) => (
                <StatusBadge key={status} type="official" status={status as OfficialStatus} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Badge & SimulasiBadge */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-semibold text-brand-dark border-b pb-2 border-slate-200">
          2. Badge & SimulasiBadge
        </h2>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">Default Badge</Badge>
              <Badge variant="teal">Teal (Aksi / Proses)</Badge>
              <Badge variant="amber">Amber (Perlu Perhatian)</Badge>
              <Badge variant="terracotta">Terakota (Peringatan)</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="slate">Slate</Badge>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Lencana Simulasi:</span>
              <SimulasiBadge size="sm" />
              <SimulasiBadge size="md" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Button */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-semibold text-brand-dark border-b pb-2 border-slate-200">
          3. Button (Varian, Ukuran, Loading, Disabled)
        </h2>
        <Card>
          <CardContent className="space-y-6 pt-4">
            {/* Varian */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-400 block">
                Varian Warna
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary (Teal)</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Danger (Terakota)</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            {/* Ukuran */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-400 block">
                Ukuran (sm, md, lg)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">
                  Ukuran Kecil (sm)
                </Button>
                <Button variant="primary" size="md">
                  Ukuran Sedang (md)
                </Button>
                <Button variant="primary" size="lg">
                  Ukuran Besar (lg)
                </Button>
              </div>
            </div>

            {/* State Loading & Disabled */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-400 block">
                State Khusus
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" isLoading>
                  Memproses Data
                </Button>
                <Button variant="secondary" disabled>
                  Tombol Dinonaktifkan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Modal & Toast */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-semibold text-brand-dark border-b pb-2 border-slate-200">
          4. Modal Dialog & Toast Notifikasi
        </h2>
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-400 block">
                Modal Dialog
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalSize('md');
                    setIsModalOpen(true);
                  }}
                >
                  Buka Modal Standar (md)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalSize('sm');
                    setIsModalOpen(true);
                  }}
                >
                  Buka Modal Konfirmasi (sm)
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold uppercase text-slate-400 block">
                Pemicu Toast Notifikasi
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    showToast('Pengajuan berhasil disimpan sebagai draf.', 'success', 'Berhasil')
                  }
                >
                  Toast Sukses
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    showToast('Sedang menganalisis 3 berkas sertifikat...', 'info', 'Informasi')
                  }
                >
                  Toast Info
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    showToast(
                      'Nama pada sertifikat tidak sesuai dengan identitas akun Anda.',
                      'error',
                      'Kesalahan Validasi',
                    )
                  }
                >
                  Toast Error API
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-semibold text-brand-dark border-b pb-2 border-slate-200">
          5. Table
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Nama Kegiatan</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Estimasi Poin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs">1</TableCell>
              <TableCell className="font-semibold text-brand-dark">
                Lomba Desain Poster Nasional 2026
              </TableCell>
              <TableCell>Komponen 3 (Prestasi)</TableCell>
              <TableCell>
                <StatusBadge type="review" status="ready" size="sm" />
              </TableCell>
              <TableCell className="text-right font-semibold text-brand-teal">1,10</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-xs">2</TableCell>
              <TableCell className="font-semibold text-brand-dark">
                Pelatihan Kepemimpinan Mahasiswa
              </TableCell>
              <TableCell>Komponen 2 (Kepemimpinan)</TableCell>
              <TableCell>
                <StatusBadge type="review" status="needs_fix" size="sm" />
              </TableCell>
              <TableCell className="text-right font-semibold text-slate-500">0,25</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* 6. EmptyState & ErrorState */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-semibold text-brand-dark border-b pb-2 border-slate-200">
          6. State Khusus (EmptyState & ErrorState)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EmptyState
            title="Belum Ada Pengajuan"
            description="Anda belum memiliki riwayat pengajuan sertifikat SKEM di semester ini."
            action={
              <Button variant="primary" size="sm">
                Unggah Berkas Baru
              </Button>
            }
          />
          <ErrorState
            title="Gagal Memuat Antrian"
            message="Server tidak dapat dihubungi. Pastikan koneksi internet stabil atau coba sesaat lagi."
            onRetry={() => showToast('Mencoba menyambung kembali ke server...', 'info')}
          />
        </div>
      </section>

      {/* 7. LoadingSteps */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-semibold text-brand-dark border-b pb-2 border-slate-200">
          7. LoadingSteps (Tahapan Progres Analisis Dokumen)
        </h2>
        <LoadingSteps steps={demoSteps} />
      </section>

      {/* Modal Demo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size={modalSize}
        title="Contoh Dialog Konfirmasi"
        description="Semua keputusan dan perubahan data akan dicatat pada riwayat audit sistem."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                showToast('Aksi berhasil dikonfirmasi.', 'success');
              }}
            >
              Konfirmasi & Simpan
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Ini adalah isi modal. Seluruh teks antarmuka menggunakan Bahasa Indonesia sesuai dengan
          aturan domain sistem SKEM AI Co-Pilot.
        </p>
      </Modal>
    </div>
  );
}
