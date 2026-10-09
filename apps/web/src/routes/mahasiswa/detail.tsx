import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  FileCheck2,
  FileText,
  Upload,
  X,
  FileUp,
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
import { AgentQuestion } from '../../components/AgentQuestion';
import { SignatureModal } from '../../components/SignatureModal';
import { SubmitDialog } from '../../components/SubmitDialog';
import { useAuth } from '../../api/auth-context';
import { useToast } from '../../components/ToastContext';
import {
  getSubmissionDetail,
  patchSubmission,
  getCertificateUrl,
  submitToVerifier,
  answerQuestion,
  cancelSubmission,
  reuploadSubmission,
} from '../../api/submissions';
import type { PatchSubmissionBody, AgentQuestion as AgentQuestionType } from '@skem/shared';

const DEFAULT_LEVEL_QUESTION: AgentQuestionType = {
  id: 1,
  seq: 1,
  field: 'level',
  question: 'Peserta kegiatan ini berasal dari mana?',
  options: [
    { value: 'campus', label: 'Hanya lingkungan internal PENS' },
    { value: 'regional', label: 'Satu provinsi (minimal 3 kota/kabupaten)' },
    { value: 'national', label: 'Minimal 3 provinsi di Indonesia' },
    { value: 'international', label: 'Minimal 3 negara' },
    { value: 'unknown', label: 'Saya tidak tahu' },
  ],
};

export function MahasiswaDetailRoute() {
  const { id = 'SKM-7Q2K9D1A' } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReuploadModalOpen, setIsReuploadModalOpen] = useState(false);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
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
      setIsSubmitDialogOpen(false);
      showToast('Pengajuan berhasil terkirim ke Verifikator', 'success');
    },
    onError: () => {
      showToast('Gagal mengajukan berkas. Silakan coba lagi.', 'error');
    },
  });

  // Mutation Jawab Pertanyaan Agent
  const answerMutation = useMutation({
    mutationFn: (data: { questionId: number; answer: string }) => answerQuestion(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['submission', id], updated);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['batch'] });
    },
  });

  // Mutation Batalkan Pengajuan
  const cancelMutation = useMutation({
    mutationFn: () => cancelSubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['batch'] });
      setIsCancelModalOpen(false);
      showToast('Draf pengajuan berhasil dibatalkan', 'info');
      navigate('/mahasiswa');
    },
  });

  // Mutation Unggah Ulang
  const reuploadMutation = useMutation({
    mutationFn: (file: File) => reuploadSubmission(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['batch'] });
      setIsReuploadModalOpen(false);
      setReuploadFile(null);
      refetchCert();
      showToast('Berkas berhasil diunggah ulang dan dianalisis kembali', 'success');
    },
  });

  const handleStartSubmit = () => {
    if (!user?.hasSignature) {
      setIsSignatureModalOpen(true);
    } else {
      setIsSubmitDialogOpen(true);
    }
  };

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
  const hasNameMismatchWarning =
    nameFinding && (nameFinding.result === 'warn' || nameFinding.result === 'fail');

  // Tombol Ajukan hanya aktif jika reviewStatus === 'ready' dan status === 'draft'
  const isReadyToSubmit = submission.reviewStatus === 'ready' && submission.status === 'draft';
  const isDraft = submission.status === 'draft';
  const needsFix = submission.reviewStatus === 'needs_fix';
  const activeQuestion = submission.questions[0] || DEFAULT_LEVEL_QUESTION;

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
                <span className="font-medium text-slate-900">
                  {submission.activity.activityName}
                </span>
                <span>&bull;</span>
                <span className="font-mono">{submission.publicId}.pdf</span>
              </p>
            </div>
          </div>

          {/* Right Action Section: Credit Score & Actions */}
          <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
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
                <span className="text-[10px] text-amber-700 block font-semibold">Tabel Bobot</span>
                <span className="text-xs font-medium text-amber-900">Kombinasi Luar Tabel</span>
              </div>
            )}

            {isDraft && (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="gap-1.5 text-slate-700 hover:text-red-700 hover:border-red-300"
                  title="Batalkan draf pengajuan ini"
                >
                  <X className="w-4 h-4" />
                  <span>Batalkan</span>
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsReuploadModalOpen(true)}
                  className="gap-1.5"
                  title="Unggah ulang berkas PDF sertifikat baru"
                >
                  <Upload className="w-4 h-4" />
                  <span>Unggah Ulang</span>
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  disabled={!isReadyToSubmit || submitMutation.isPending}
                  onClick={handleStartSubmit}
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
              </>
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
              activeTab === 'pdf' ? 'bg-brand-teal text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            PDF Sertifikat
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* AGENT QUESTION PROMINENT BANNER (JIKA STATUS NEEDS_FIX)        */}
      {/* ============================================================== */}
      {needsFix && (
        <div className="bg-amber-50/40 rounded-xl border border-amber-300 p-4 shadow-xs animate-fade-in">
          <AgentQuestion
            question={activeQuestion}
            fileName={`${submission.publicId}.pdf`}
            activityName={submission.activity.activityName ?? undefined}
            isSubmitting={answerMutation.isPending}
            onSubmit={async (questionId, answer) => {
              await answerMutation.mutateAsync({ questionId, answer });
            }}
            onNavigateToDetail={() => setActiveTab('metadata')}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* 3-COLUMN RESPONSIVE LAYOUT (KIRI: PDF, TENGAH: FORM, KANAN: PANEL) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: PRATINJAU PDF SERTIFIKAT (4/12) */}
        <div
          className={`lg:col-span-4 space-y-4 ${activeTab === 'pdf' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-teal" />
              Berkas Sertifikat Asli
            </span>
            <span className="text-[11px] font-normal text-slate-500 font-mono">PDF Terunggah</span>
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
            <span className="text-[11px] font-normal text-slate-500">Pratinjau Resmi</span>
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
      {/* MODAL BATALKAN PENGAJUAN DRAF                                  */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Batalkan Pengajuan"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            Apakah Anda yakin ingin membatalkan pengajuan{' '}
            <strong className="text-slate-900">{submission.publicId}</strong>?
          </p>
          <p className="text-slate-500">
            Tindakan ini akan membatalkan status draf pengajuan dan menghapus data terkait dari
            antrean.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Kembali
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan Pengajuan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL UNGGAH ULANG BERKAS SERTIFIKAT                           */}
      {/* ============================================================== */}
      <Modal
        isOpen={isReuploadModalOpen}
        onClose={() => {
          setIsReuploadModalOpen(false);
          setReuploadFile(null);
        }}
        title="Unggah Ulang Berkas Sertifikat"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            Pilih berkas PDF sertifikat baru untuk menggantikan dokumen sebelumnya. Sistem akan
            menganalisis ulang berkas baru tersebut secara otomatis.
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:border-brand-teal transition-colors">
            <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <input
              type="file"
              accept=".pdf,application/pdf"
              id="reupload-input"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setReuploadFile(file);
              }}
            />
            <label
              htmlFor="reupload-input"
              className="cursor-pointer text-brand-teal font-semibold hover:underline block"
            >
              {reuploadFile ? reuploadFile.name : 'Pilih file PDF (maks. 10MB)'}
            </label>
            {reuploadFile && (
              <span className="text-[11px] text-slate-500 block mt-1">
                {(reuploadFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsReuploadModalOpen(false);
                setReuploadFile(null);
              }}
              disabled={reuploadMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!reuploadFile || reuploadMutation.isPending}
              onClick={() => {
                if (reuploadFile) reuploadMutation.mutate(reuploadFile);
              }}
            >
              {reuploadMutation.isPending ? 'Mengunggah...' : 'Unggah Sekarang'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL SIAPKAN TANDA TANGAN (JIKA BELUM ADA)                    */}
      {/* ============================================================== */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSuccess={() => {
          setIsSignatureModalOpen(false);
          setIsSubmitDialogOpen(true);
        }}
      />

      {/* ============================================================== */}
      {/* DIALOG KONFIRMASI TANDA TANGANI DAN KIRIM PENGAJUAN             */}
      {/* ============================================================== */}
      <SubmitDialog
        isOpen={isSubmitDialogOpen}
        onClose={() => setIsSubmitDialogOpen(false)}
        submissionsToSubmit={[
          {
            publicId: submission.publicId,
            activityName: submission.activity.activityName ?? undefined,
            fileName: `${submission.publicId}.pdf`,
            estimatedCredit: submission.skem.estimatedCredit,
            hasWarning: hasNameMismatchWarning,
          },
        ]}
        verifierName={submission.verifier?.name || user?.verifierName || undefined}
        onSubmit={async () => {
          await submitMutation.mutateAsync();
        }}
        isSubmitting={submitMutation.isPending}
      />
    </div>
  );
}
