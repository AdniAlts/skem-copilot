import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { LoadingSteps } from '../../components/LoadingSteps';
import { ErrorState } from '../../components/ErrorState';
import { PdfViewer } from '../../components/PdfViewer';
import { FormPreview } from '../../components/FormPreview';
import { MetadataPanel } from '../../components/MetadataPanel';
import { FindingsList } from '../../components/FindingsList';
import { TokenUsagePanel } from '../../components/TokenUsagePanel';
import {
  getSubmissionDetail,
  patchSubmission,
  getCertificateUrl,
  submitToVerifier,
} from '../../api/submissions';
import type { PatchSubmissionBody } from '@skem/shared';

export function MahasiswaDetailRoute() {
  const { id = 'SKM-7Q2K9D1A' } = useParams();
  const queryClient = useQueryClient();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pdf' | 'form' | 'metadata'>('metadata');

  // Query Detail Submission
  const {
    data: submission,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => getSubmissionDetail(id),
    enabled: !!id,
  });

  // Query Signed Certificate URL
  const { data: certData, refetch: refetchCert } = useQuery({
    queryKey: ['submission-cert', id],
    queryFn: () => getCertificateUrl(id),
    enabled: !!id,
  });

  // Mutation Simpan Metadata
  const patchMutation = useMutation({
    mutationFn: (payload: PatchSubmissionBody) => patchSubmission(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['submission', id], updated);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });

  // Mutation Ajukan ke Verifikator
  const submitMutation = useMutation({
    mutationFn: () => submitToVerifier([id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setIsSubmitModalOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <LoadingSteps
          steps={[
            { id: 'fetch', label: 'Memuat data pengajuan...', status: 'in_progress' },
            { id: 'cert', label: 'Menyiapkan berkas sertifikat', status: 'pending' },
            { id: 'render', label: 'Merender pratinjau formulir', status: 'pending' },
          ]}
        />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="py-12 max-w-xl mx-auto">
        <ErrorState
          title="Gagal Memuat Pengajuan"
          message="Tidak dapat memuat rincian pengajuan SKEM. Silakan periksa koneksi atau coba lagi."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Cek Temuan Kesesuaian Nama
  const nameFinding = submission.findings.find((f) => f.checkType === 'name_match');
  const hasNameMismatchWarning = nameFinding && (nameFinding.result === 'warn' || nameFinding.result === 'fail');

  // Tombol Ajukan hanya aktif jika reviewStatus === 'ready' dan status === 'draft'
  const isReadyToSubmit = submission.reviewStatus === 'ready' && submission.status === 'draft';
  const isDraft = submission.status === 'draft';

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* TOP HEADER: BREADCRUMBS, STATUS BADGES & ACTION BUTTONS        */}
      {/* ============================================================== */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/mahasiswa">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 mt-0.5"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Pengajuan
                </span>
                <h1 className="text-lg font-bold font-mono text-brand-dark">
                  {submission.publicId}
                </h1>
                <StatusBadge type="submission" status={submission.status} size="sm" />
                <StatusBadge type="review" status={submission.reviewStatus} size="sm" />
              </div>

              <p className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-900">{submission.activity.activityName}</span>
                <span>&bull;</span>
                <span className="font-mono">{submission.publicId}.pdf</span>
              </p>
            </div>
          </div>

          {/* Right Action Section: Credit Score & Submit Button */}
          <div className="flex items-center gap-3 self-end md:self-center">
            {submission.skem.estimatedCredit !== null ? (
              <div className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-right">
                <span className="text-[10px] text-emerald-700 block font-semibold uppercase tracking-wider">
                  Estimasi Kredit
                </span>
                <span className="text-base font-bold font-serif text-emerald-800">
                  {submission.skem.estimatedCredit.toFixed(2).replace('.', ',')}{' '}
                  <span className="text-xs font-normal">Poin</span>
                </span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-right">
                <span className="text-[10px] text-amber-700 block font-semibold">
                  Tabel Bobot
                </span>
                <span className="text-xs font-medium text-amber-900">
                  Kombinasi Luar Tabel
                </span>
              </div>
            )}

            {isDraft && (
              <Button
                variant="primary"
                size="md"
                disabled={!isReadyToSubmit || submitMutation.isPending}
                onClick={() => setIsSubmitModalOpen(true)}
                className="gap-2 shadow-xs"
                title={
                  !isReadyToSubmit
                    ? 'Pengajuan baru dapat dikirimkan jika status AI Pre-Check sudah Siap (Ready)'
                    : 'Kirimkan berkas pengajuan ini ke Dosen Wali untuk diverifikasi'
                }
              >
                <Send className="w-4 h-4" />
                <span>Ajukan ke Verifikator</span>
              </Button>
            )}
          </div>
        </div>

        {/* Warning Peringatan Perbedaan Nama (Non-Blocking) */}
        {hasNameMismatchWarning && (
          <div className="mt-4 p-3.5 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">
                Peringatan Kesesuaian Nama Mahasiswa
              </span>
              <p>
                {nameFinding?.message ||
                  `Nama pada sertifikat berbeda dari nama akun (${submission.student.name}). Anda tetap bisa mengajukan; Verifikator (Dosen Wali) akan memeriksa bukti dokumen ini saat verifikasi.`}
              </p>
            </div>
          </div>
        )}

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden items-center gap-1 border-t border-slate-200 mt-4 pt-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            className={`flex-1 py-1.5 text-center font-medium rounded ${
              activeTab === 'metadata'
                ? 'bg-brand-teal text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Metadata & Hasil AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-1.5 text-center font-medium rounded ${
              activeTab === 'form'
                ? 'bg-brand-teal text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Formulir FM.MHS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-1.5 text-center font-medium rounded ${
              activeTab === 'pdf'
                ? 'bg-brand-teal text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            PDF Sertifikat
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3-COLUMN RESPONSIVE LAYOUT (KIRI: PDF, TENGAH: FORM, KANAN: PANEL) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: PRATINJAU PDF SERTIFIKAT (4/12) */}
        <div
          className={`lg:col-span-4 space-y-4 ${
            activeTab === 'pdf' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-teal" />
              Berkas Sertifikat Asli
            </span>
            <span className="text-[11px] font-normal text-slate-500 font-mono">
              PDF Terunggah
            </span>
          </div>

          <PdfViewer
            url={certData?.url || ''}
            fileName={`${submission.publicId}.pdf`}
            onRefreshUrl={() => refetchCert()}
            className="h-[740px]"
          />
        </div>

        {/* KOLOM TENGAH: PRATINJAU FORMULIR RESMI FM.MHS (4/12) */}
        <div
          className={`lg:col-span-4 space-y-4 ${
            activeTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-brand-teal" />
              Formulir FM.MHS.PENGAJUANSKEM
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              Pratinjau Resmi
            </span>
          </div>

          <div className="overflow-y-auto max-h-[740px] rounded-lg">
            <FormPreview submission={submission} />
          </div>
        </div>

        {/* KOLOM KANAN: PANEL METADATA & HASIL PEMERIKSAAN AI (4/12) */}
        <div
          className={`lg:col-span-4 space-y-4 ${
            activeTab === 'metadata' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Panel Form Metadata Editable */}
          <MetadataPanel
            submission={submission}
            readOnly={!isDraft}
            isSaving={patchMutation.isPending}
            onSave={async (payload) => {
              await patchMutation.mutateAsync(payload);
            }}
          />

          {/* Daftar Temuan AI Pre-Check */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <FindingsList findings={submission.findings} />
          </div>

          {/* Token Usage Transparansi AI */}
          <TokenUsagePanel tokenUsage={submission.tokenUsage} />
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL KONFIRMASI AJUKAN KE VERIFIKATOR                         */}
      {/* ============================================================== */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Ajukan ke Verifikator (Dosen Wali)"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            Anda akan mengajukan berkas kegiatan{' '}
            <strong className="text-slate-900">{submission.activity.activityName}</strong> kepada
            Dosen Wali ({submission.verifier?.name || 'Verifikator Kelas'}).
          </p>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Mahasiswa:</span>
              <span className="font-semibold text-slate-900">{submission.student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">NRP:</span>
              <span className="font-mono font-semibold text-slate-900">{submission.student.nrp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimasi Kredit SKEM:</span>
              <span className="font-bold text-brand-teal">
                {submission.skem.estimatedCredit !== null
                  ? `${submission.skem.estimatedCredit.toFixed(2)} Poin`
                  : 'Menunggu Keputusan'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-teal-50/60 rounded border border-teal-100 flex items-start gap-2 text-teal-900 text-[11px] leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Tanda Tangan Digital Resmi</span>
              Dengan mengklik tombol di bawah, Anda membubuhkan tanda tangan elektronik resmi pada
              bagian IV formulir FM.MHS.PENGAJUANSKEM dan menyetujui pernyataan kebenaran data.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={submitMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {submitMutation.isPending ? 'Mengirimkan...' : 'Ya, Ajukan Sekarang'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
