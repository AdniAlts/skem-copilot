import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileCheck2,
  FileText,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorState } from '../../components/ErrorState';
import { PdfViewer } from '../../components/PdfViewer';
import { FormPreview } from '../../components/FormPreview';
import { FindingsList } from '../../components/FindingsList';
import { ReadOnlySubmissionSummary } from '../../components/ReadOnlySubmissionSummary';
import { RejectDecisionModal } from '../../components/RejectDecisionModal';
import { ApproveDecisionDialog } from '../../components/ApproveDecisionDialog';
import { SignatureModal } from '../../components/SignatureModal';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../api/auth-context';
import { getSignature } from '../../api/signature';
import {
  approveSubmission,
  getVerifierCertificateUrl,
  getVerifierSubmission,
  rejectSubmission,
} from '../../api/verifier';
import { ApiClientError } from '../../api/client';
import {
  answerLabel,
  approvalToastMessage,
  classifyDecisionError,
  formatCredit,
  formatDateTimeId,
} from '../../lib/verifier';

const VERIFIER_SIGNATURE_DESCRIPTION =
  'Tanda tangan ini disimpan di akun Anda dan hanya dibubuhkan pada bagian III formulir yang Anda setujui.';

export function VerifikatorDetailRoute() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);

  const submissionQuery = useQuery({
    queryKey: ['verifier-submission', id],
    queryFn: () => getVerifierSubmission(id),
    enabled: !!id,
    retry: (count, error) =>
      !(error instanceof ApiClientError && error.status === 404) && count < 2,
  });
  const certificateQuery = useQuery({
    queryKey: ['verifier-certificate', id],
    queryFn: () => getVerifierCertificateUrl(id),
    enabled: submissionQuery.isSuccess,
  });
  const signatureQuery = useQuery({
    queryKey: ['signature'],
    queryFn: getSignature,
    enabled: isApproveOpen,
  });

  const afterDecision = async () => {
    await queryClient.invalidateQueries({ queryKey: ['verifier-queue'] });
    await queryClient.invalidateQueries({ queryKey: ['verifier-submission', id] });
    navigate('/verifikator');
  };

  const handleDecisionError = (error: unknown) => {
    switch (classifyDecisionError(error)) {
      case 'needs_signature':
        setIsApproveOpen(false);
        setIsSignatureOpen(true);
        showToast('Siapkan tanda tangan Anda terlebih dahulu.', 'info');
        return;
      case 'already_decided':
        setIsApproveOpen(false);
        setIsRejectOpen(false);
        showToast('Pengajuan ini sudah tidak menunggu keputusan Anda.', 'info');
        void submissionQuery.refetch();
        return;
      default:
        showToast(
          error instanceof Error ? error.message : 'Keputusan gagal dikirim. Silakan coba lagi.',
          'error',
        );
    }
  };

  const approveMutation = useMutation({
    mutationFn: (note: string) => approveSubmission(id, note),
    onSuccess: async (result) => {
      setIsApproveOpen(false);
      showToast(approvalToastMessage(result.finalForm.status), 'success');
      await afterDecision();
    },
    onError: handleDecisionError,
  });

  const rejectMutation = useMutation({
    mutationFn: (note: string) => rejectSubmission(id, note),
    onSuccess: async () => {
      setIsRejectOpen(false);
      showToast('Pengajuan ditolak. Alasan dikirim ke mahasiswa.', 'success');
      await afterDecision();
    },
    onError: handleDecisionError,
  });

  if (submissionQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-slate-500">Memuat pengajuan…</p>;
  }

  if (submissionQuery.error || !submissionQuery.data) {
    const notFound =
      submissionQuery.error instanceof ApiClientError && submissionQuery.error.status === 404;
    return (
      <div className="py-12 max-w-xl mx-auto space-y-4">
        <ErrorState
          title={notFound ? 'Pengajuan Tidak Ditemukan' : 'Gagal Memuat Pengajuan'}
          message={
            notFound
              ? 'Pengajuan ini tidak ada atau bukan dari kelas Anda.'
              : 'Tidak dapat memuat pengajuan. Periksa koneksi lalu coba lagi.'
          }
          onRetry={notFound ? undefined : () => submissionQuery.refetch()}
        />
        <Link to="/verifikator" className="block text-center text-sm text-brand-teal">
          Kembali ke antrian
        </Link>
      </div>
    );
  }

  const submission = submissionQuery.data;
  const isWaiting = submission.status === 'waiting_verifier';
  const nameFinding = submission.findings.find((finding) => finding.checkType === 'name_match');
  const isBusy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/verifikator" title="Kembali ke antrian">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold font-mono text-brand-dark">
                  {submission.publicId}
                </h1>
                <StatusBadge type="submission" status={submission.status} size="sm" />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {submission.student.name} ({submission.student.nrp}) ·{' '}
                {submission.activity.activityName ?? 'Nama kegiatan belum terbaca'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-right">
              <span className="text-[10px] text-emerald-700 block font-semibold uppercase">
                Estimasi kredit
              </span>
              <span className="text-base font-bold font-serif text-emerald-800">
                {formatCredit(submission.skem.estimatedCredit)}
              </span>
            </div>
            {isWaiting && (
              <>
                <Button
                  variant="danger"
                  size="md"
                  className="gap-1.5"
                  disabled={isBusy}
                  onClick={() => setIsRejectOpen(true)}
                >
                  <X className="w-4 h-4" />
                  Tolak
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="gap-1.5"
                  disabled={isBusy}
                  onClick={() =>
                    user?.hasSignature ? setIsApproveOpen(true) : setIsSignatureOpen(true)
                  }
                >
                  <Check className="w-4 h-4" />
                  Setujui
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Keputusan Anda selalu berlaku, terlepas dari rekomendasi AI.
        </p>

        {!isWaiting && (
          <p className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            Pengajuan ini sudah tidak menunggu keputusan Verifikator.
          </p>
        )}

        {nameFinding && nameFinding.result !== 'pass' && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Peringatan kesesuaian nama</span>
              {nameFinding.message}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-3">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <FileText className="w-4 h-4 text-brand-teal" /> Sertifikat yang diunggah
          </h2>
          {certificateQuery.error ? (
            <ErrorState
              title="Sertifikat Tidak Dapat Dimuat"
              message="Coba muat ulang pratinjau sertifikat."
              onRetry={() => certificateQuery.refetch()}
            />
          ) : (
            <PdfViewer
              url={certificateQuery.data?.url ?? ''}
              fileName={`${submission.publicId}.pdf`}
              onRefreshUrl={() => certificateQuery.refetch()}
              className="h-[640px]"
            />
          )}
        </div>

        <div className="lg:col-span-4 space-y-3">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <FileCheck2 className="w-4 h-4 text-brand-teal" /> Formulir FM.MHS.PENGAJUANSKEM
          </h2>
          <div className="overflow-y-auto max-h-[640px] rounded-lg">
            <FormPreview submission={submission} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <ReadOnlySubmissionSummary submission={submission} />

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <FindingsList findings={submission.findings} />
          </div>

          <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mb-2">
              <MessageSquare className="w-4 h-4 text-brand-teal" /> Tanya-jawab agent dengan
              mahasiswa
            </h3>
            {submission.questions.length === 0 ? (
              <p className="text-xs text-slate-500">Agent tidak mengajukan pertanyaan.</p>
            ) : (
              <ol className="space-y-2 text-xs">
                {submission.questions.map((question) => (
                  <li key={question.id} className="rounded border border-slate-200 p-2.5">
                    <p className="text-slate-600">
                      {question.seq}. {question.question}
                    </p>
                    <p className="font-medium text-slate-900 mt-1">{answerLabel(question)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {submission.reviews.length > 0 && (
            <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Riwayat keputusan</h3>
              <ul className="space-y-2 text-xs">
                {submission.reviews.map((review) => (
                  <li key={review.id}>
                    <span className="font-medium">{review.reviewerName}</span> ·{' '}
                    {review.decision === 'approve'
                      ? 'Menyetujui'
                      : review.decision === 'reject'
                        ? 'Menolak'
                        : 'Mengubah kredit'}{' '}
                    · {formatDateTimeId(review.createdAt)}
                    {review.note && <p className="text-slate-600 mt-0.5">{review.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <RejectDecisionModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title={`Tolak Pengajuan ${submission.publicId}`}
        isSubmitting={rejectMutation.isPending}
        onSubmit={async (note) => {
          await rejectMutation.mutateAsync(note);
        }}
      />

      <ApproveDecisionDialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        verifierName={user?.name ?? ''}
        jabatan={user?.jabatan ?? null}
        signatureUrl={signatureQuery.data ?? null}
        isSubmitting={approveMutation.isPending}
        onConfirm={async (note) => {
          await approveMutation.mutateAsync(note);
        }}
      />

      <SignatureModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        description={VERIFIER_SIGNATURE_DESCRIPTION}
        onSuccess={() => setIsApproveOpen(true)}
      />
    </div>
  );
}
