import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { UploadCloud, FileText } from 'lucide-react';

export function MahasiswaUploadRoute() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-brand-dark">Unggah Berkas Sertifikat</h1>
        <p className="text-sm text-slate-600">
          Unggah hingga 10 berkas PDF sertifikat sekaligus untuk dianalisis oleh AI Pre-Check Agent.
        </p>
      </div>

      <Card className="border-dashed border-2 border-slate-300 p-8 text-center bg-white/70">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-brand-teal mb-4">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h3 className="text-base font-serif font-semibold text-brand-dark mb-1">
          Tarik dan lepas file PDF ke sini
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
          Maksimal 10 file PDF per batch. Seluruh proses dilakukan secara online tanpa perlu
          mencetak formulir kertas.
        </p>
        <Button variant="primary" size="md">
          Pilih File dari Perangkat
        </Button>
      </Card>

      <div className="p-4 rounded-lg bg-teal-50/50 border border-teal-100 flex items-start gap-3 text-xs text-slate-600">
        <FileText className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-brand-teal block mb-0.5">
            Petunjuk Format Sertifikat
          </span>
          Pastikan nama Anda tercantum jelas pada sertifikat. Sistem akan memeriksa nama, tanggal
          pelaksanaan, kategori kegiatan, dan cakupan peserta.
        </div>
      </div>
    </div>
  );
}
