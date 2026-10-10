import { useQuery } from '@tanstack/react-query';
import {
  Send,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useAuth } from '../api/auth-context';
import { getSignature } from '../api/signature';

export interface SubmissionItem {
  publicId: string;
  activityName?: string;
  fileName?: string;
  estimatedCredit: number | null;
  hasWarning?: boolean;
}

export interface SkippedItem {
  publicId: string;
  activityName?: string;
  fileName?: string;
  reason: string;
}

export interface SubmitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  submissionsToSubmit: SubmissionItem[];
  skippedSubmissions?: SkippedItem[];
  verifierName?: string;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
}

export function SubmitDialog({
  isOpen,
  onClose,
  submissionsToSubmit,
  skippedSubmissions = [],
  verifierName,
  onSubmit,
  isSubmitting = false,
}: SubmitDialogProps) {
  const { user } = useAuth();

  // Query pratinjau tanda tangan
  const { data: signatureUrl } = useQuery({
    queryKey: ['signature'],
    queryFn: getSignature,
    enabled: isOpen,
  });

  const totalCredit = submissionsToSubmit.reduce(
    (acc, item) => acc + (item.estimatedCredit || 0),
    0,
  );

  const warningsCount = submissionsToSubmit.filter((s) => s.hasWarning).length;

  const targetVerifier = verifierName || user?.verifierName || 'Dosen Wali (Verifikator Kelas)';

  // Format tanggal hari ini dalam Bahasa Indonesia
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const count = submissionsToSubmit.length;
  const title = `Tanda tangani dan kirim ${count} pengajuan ke ${targetVerifier}?`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-xs text-slate-700 max-h-[80vh] overflow-y-auto pr-1">
        {/* Ringkasan Pengajuan yang Dikirim */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-slate-800 font-semibold border-b border-slate-200 pb-1.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Berkas yang Siap Diajukan ({count})</span>
            </span>
            <span className="text-emerald-700 font-mono">
              Total: {totalCredit.toFixed(2).replace('.', ',')} Poin
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto divide-y divide-slate-100">
            {submissionsToSubmit.map((sub) => (
              <div
                key={sub.publicId}
                className="py-1.5 flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">
                    {sub.activityName || sub.fileName || sub.publicId}
                  </span>
                  {sub.hasWarning && (
                    <span
                      title="Memiliki catatan peringatan"
                      className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] shrink-0 font-medium"
                    >
                      Catatan
                    </span>
                  )}
                </div>
                <span className="font-mono font-semibold text-slate-700 shrink-0">
                  {sub.estimatedCredit !== null
                    ? `${sub.estimatedCredit.toFixed(2).replace('.', ',')} Poin`
                    : 'Kombinasi Luar Tabel'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daftar Berkas yang Tidak Ikut (Skipped) */}
        {skippedSubmissions.length > 0 && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{skippedSubmissions.length} Berkas Tidak Ikut Diajukan:</span>
            </div>
            <ul className="space-y-1 pl-4 list-disc text-slate-600">
              {skippedSubmissions.map((item) => (
                <li key={item.publicId} className="truncate">
                  <span className="font-medium text-slate-800">
                    {item.activityName || item.fileName || item.publicId}
                  </span>{' '}
                  <span className="text-slate-500 italic">({item.reason})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Peringatan jika ada catatan peringatan */}
        {warningsCount > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-[11px] leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">
                {warningsCount} pengajuan memiliki catatan peringatan
              </span>
              Berkas tetap dapat diajukan. Dosen Wali (Verifikator) akan meninjau catatan tersebut
              saat proses verifikasi.
            </div>
          </div>
        )}

        {/* Pernyataan Mahasiswa (FM.MHS.PENGAJUANSKEM Bagian IV) */}
        <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/60 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
              IV. Pernyataan Mahasiswa
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Surabaya, {todayFormatted}</span>
          </div>

          <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
            Saya menyatakan bahwa data yang saya isi dalam formulir ini adalah benar dan dapat
            dipertanggungjawabkan. Saya bersedia menerima sanksi akademik sesuai ketentuan yang
            berlaku di Politeknik Elektronika Negeri Surabaya apabila di kemudian hari terbukti data
            yang saya isi tidak benar.
          </p>

          {/* Pratinjau Tanda Tangan Mahasiswa */}
          <div className="flex items-center justify-end pt-2 border-t border-dashed border-slate-200">
            <div className="text-center w-52 space-y-1">
              <span className="text-[10px] text-slate-500 block">
                Tanda Tangan Digital Mahasiswa:
              </span>
              <div className="h-16 w-full border border-slate-200 rounded bg-white flex items-center justify-center p-1 overflow-hidden">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Tanda Tangan Mahasiswa"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 italic">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Tersimpan di Sistem</span>
                  </div>
                )}
              </div>
              <span className="font-semibold text-slate-900 text-xs block truncate">
                {user?.name || 'Mahasiswa'}
              </span>
              <span className="text-[10px] font-mono text-slate-500 block">
                NRP. {user?.nrp || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Keterangan Proses 100% Online */}
        <div className="p-2.5 bg-brand-blue-50/70 border border-brand-blue-200 rounded-lg flex items-start gap-2 text-brand-blue-950 text-[11px] leading-relaxed">
          <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
          <span>
            Seluruh proses pengajuan dan verifikasi SKEM dilakukan 100% secara daring. Tidak
            memerlukan cetak formulir atau tanda tangan basah.
          </span>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting || count === 0}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Mengirimkan...' : 'Tanda tangani dan kirim'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
