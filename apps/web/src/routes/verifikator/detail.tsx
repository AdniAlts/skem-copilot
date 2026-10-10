import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { LoadingSteps } from '../../components/LoadingSteps';
import { ErrorState } from '../../components/ErrorState';
import { PdfViewer } from '../../components/PdfViewer';
import { FormPreview } from '../../components/FormPreview';
import { MetadataPanel } from '../../components/MetadataPanel';
import { FindingsList } from '../../components/FindingsList';
import { AgentQuestion } from '../../components/AgentQuestion';
import { SignatureModal } from '../../components/SignatureModal';
import { useToast } from '../../components/ToastContext';
import { getSubmissionDetail, getCertificateUrl } from '../../api/submissions';
import { approveSubmission, rejectSubmission } from '../../api/verifier';
import { getSignature } from '../../api/signature';
import type { SubmissionDetail } from '@skem/shared';
import type { StepItem } from '../../components/LoadingSteps';

/** Halaman detail baca-saja untuk Verifikator. Tombol Setujui dan Tolak saja — tidak ada edit. */
export function VerifikatorDetailRoute() {
  const { publicId = 'SKM-7Q2K9D1A' } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Fetch submission detail
  const { data: submission, isLoading, isError, refetch } = useQuery<SubmissionDetail>({
    queryKey: ['submission-detail', publicId],
    queryFn: () => getSubmissionDetail(publicId),
    refetchOnWindowFocus: true,
  });

  // Fetch certificate URL for PdfViewer
  const { data: certData } = useQuery({
    queryKey: ['certificate-url', publicId],
    queryFn: () => getCertificateUrl(publicId),
    enabled: !!submission,
  });

  // Mutation: approve
  const approveMut = useMutation({
    mutationFn: () => approveSubmission(publicId),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['verifier-queue'] });
      const toastMsg =
        res.finalForm.status === 'ready'
          ? 'Disetujui dan diteruskan ke Validator. Formulir final telah dibuat.'
          : 'Disetujui dan diteruskan ke Validator.';
      showToast(toastMsg, 'success');
      setShowConfirmModal(false);
      navigate('/verifikator');
    },
    onError: () => {
      showToast('Gagal menyetujui. Coba lagi.', 'error');
    },
  });

  // Mutation: reject
  const rejectMut = useMutation({
    mutationFn: () => rejectSubmission(publicId, rejectNote),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['verifier-queue'] });
      showToast('Pengajuan ditolak dan mahasiswa telah diberitahu.', 'info');
      setShowRejectModal(false);
      navigate('/verifikator');
    },
    onError: () => {
      showToast('Gagal menolak. Coba lagi.', 'error');
    },
  });

  /** Tombol Setujui: cek tanda tangan dulu. */
  async function handleApproveClick() {
    const sig = await getSignature();
    if (sig) {
      setSignatureDataUrl(sig);
      setShowConfirmModal(true);
    } else {
      // Belum punya tanda tangan — buka modal tanda tangan dulu
      setShowSignModal(true);
    }
  }

  /** Setelah tanda tangan disimpan di SignatureModal, tampilkan konfirmasi. */
  function handleSignatureSaved(dataUrl: string) {
    setSignatureDataUrl(dataUrl);
    setShowSignModal(false);
    setShowConfirmModal(true);
  }

  if (isLoading) {
    const loadingSteps: StepItem[] = [
      { id: 'fetch', label: 'Memuat data pengajuan…', status: 'in_progress' },
      { id: 'render', label: 'Menyiapkan tampilan…', status: 'pending' },
    ];
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <LoadingSteps steps={loadingSteps} />
      </div>
    );
  }

  if (isError || !submission) {
    return (
      <ErrorState
        message="Gagal memuat detail pengajuan."
        onRetry={() => void refetch()}
        className="min-h-[40vh]"
      />
    );
  }

  const isPending = submission.status === 'waiting_verifier';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/verifikator">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-serif font-bold text-brand-dark">
                Verifikasi {publicId}
              </h1>
              <StatusBadge type="submission" status={submission.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {submission.student.name} ({submission.student.nrp}) · {submission.student.className}
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowRejectModal(true)}
              disabled={rejectMut.isPending}
            >
              <X className="w-4 h-4" />
              Tolak Pengajuan
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleApproveClick()}
              disabled={approveMut.isPending}
            >
              <Check className="w-4 h-4" />
              Setujui (E-Sign)
            </Button>
          </div>
        )}
      </div>

      {/* Keputusan akhir selalu manusia */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <span>Keputusan Anda selalu berlaku dan menjadi tanggung jawab Anda sebagai dosen wali.</span>
      </div>

      {/* Main grid: PDF + Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kiri: PDF sertifikat */}
        <PdfViewer
          url={certData?.url ?? ''}
          fileName="Sertifikat Mahasiswa"
        />

        {/* Kanan: Metadata baca-saja */}
        <MetadataPanel
          submission={submission}
          readOnly
        />
      </div>

      {/* Temuan AI */}
      {submission.findings.length > 0 && (
        <FindingsList findings={submission.findings} />
      )}

      {/* Riwayat pertanyaan agent */}
      {submission.questions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-brand-dark">Riwayat Pertanyaan Agent</h2>
          {submission.questions.map((q) => (
            <AgentQuestion
              key={q.id}
              question={q}
              publicId={publicId}
              readOnly
            />
          ))}
        </div>
      )}

      {/* Pratinjau formulir FM */}
      <FormPreview submission={submission} />

      {/* Tombol aksi bawah (duplikat untuk UX mobile) */}
      {isPending && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="danger"
            className="gap-1.5 flex-1 sm:flex-none"
            onClick={() => setShowRejectModal(true)}
            disabled={rejectMut.isPending}
          >
            <X className="w-4 h-4" />
            Tolak Pengajuan
          </Button>
          <Button
            variant="primary"
            className="gap-1.5 flex-1 sm:flex-none"
            onClick={() => void handleApproveClick()}
            disabled={approveMut.isPending}
          >
            <Check className="w-4 h-4" />
            Setujui (E-Sign)
          </Button>
        </div>
      )}

      {/* === Modal Tolak === */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectNote('');
        }}
        title="Tolak Pengajuan"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            Mahasiswa akan menerima pemberitahuan penolakan beserta alasan yang Anda tulis.
          </div>
          <div>
            <label
              htmlFor="reject-note"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reject-note"
              rows={4}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Jelaskan alasan penolakan pengajuan ini…"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">{rejectNote.length}/1000 karakter</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowRejectModal(false);
                setRejectNote('');
              }}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => rejectMut.mutate()}
              disabled={rejectNote.trim().length === 0 || rejectMut.isPending}
            >
              {rejectMut.isPending ? 'Menolak…' : 'Tolak Pengajuan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* === Modal Tanda Tangan (pertama kali / belum punya) === */}
      <SignatureModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        onSave={handleSignatureSaved}
        title="Buat Tanda Tangan Verifikator"
        description="Tanda tangan Anda akan diterapkan pada formulir yang disetujui."
      />

      {/* === Modal Konfirmasi Setujui === */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Konfirmasi Persetujuan"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Anda akan menyetujui pengajuan{' '}
            <span className="font-semibold">{submission.activity.activityName ?? publicId}</span>{' '}
            dari{' '}
            <span className="font-semibold">{submission.student.name}</span> dengan tanda tangan
            digital Anda.
          </p>

          {/* Pratinjau tanda tangan */}
          {signatureDataUrl && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <p className="text-xs text-slate-500 mb-2">Pratinjau Tanda Tangan (Bagian III):</p>
              <img
                src={signatureDataUrl}
                alt="Tanda tangan Verifikator"
                className="max-h-20 object-contain"
              />
            </div>
          )}

          {/* Mini FormPreview Bagian III */}
          <div className="border border-slate-200 rounded-lg p-4 bg-white text-xs">
            <p className="font-semibold text-slate-600 mb-3">III. Verifikasi (Dosen Wali)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400">Nama Verifikator</p>
                <p className="font-medium text-slate-800">{submission.verifier?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Jabatan</p>
                <p className="font-medium text-slate-800">{submission.verifier?.jabatan ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Tanggal Verifikasi</p>
                <p className="font-medium text-slate-800">
                  {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Keputusan</p>
                <p className="font-medium text-green-700">☑ Disetujui</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
            >
              {approveMut.isPending ? 'Menyetujui…' : 'Setujui & Terapkan Tanda Tangan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
