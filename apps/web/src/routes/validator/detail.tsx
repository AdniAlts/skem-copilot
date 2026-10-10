import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, FileCheck2, FileText, RefreshCw, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ErrorState } from '../../components/ErrorState';
import { Modal } from '../../components/Modal';
import { PdfViewer } from '../../components/PdfViewer';
import { FindingsList } from '../../components/FindingsList';
import { ReadOnlySubmissionSummary } from '../../components/ReadOnlySubmissionSummary';
import { RejectDecisionModal } from '../../components/RejectDecisionModal';
import { CreditAdjustPanel } from '../../components/CreditAdjustPanel';
import { useToast } from '../../components/ToastContext';
import { ApiClientError } from '../../api/client';
import { getStaffCertificateUrl, getStaffFinalFormUrl, getStaffSubmission } from '../../api/staff';
import {
  adjustFinalCredit,
  regenerateFinalForm,
  rejectAsValidator,
  validateSubmission,
} from '../../api/validator';
import { formatCredit, formatDateTimeId } from '../../lib/verifier';

type DocumentTab = 'final-form' | 'certificate';

const FORM_STATUS_TEXT = {
  ready: 'Tersedia',
  none: 'Belum tersedia',
  failed: 'Gagal dibuat',
} as const;

export function ValidatorDetailRoute() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<DocumentTab>('final-form');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isValidateOpen, setIsValidateOpen] = useState(false);

  const submissionQuery = useQuery({
    queryKey: ['validator-submission', id],
    queryFn: () => getStaffSubmission(id),
    enabled: !!id,
    retry: (count, error) =>
      !(error instanceof ApiClientError && error.status === 404) && count < 2,
  });
  const submission = submissionQuery.data;
  const formReady = submission?.finalForm.status === 'ready';

  const finalFormQuery = useQuery({
    queryKey: ['validator-final-form', id],
    queryFn: () => getStaffFinalFormUrl(id),
    enabled: formReady && tab === 'final-form',
  });
  const certificateQuery = useQuery({
    queryKey: ['validator-certificate', id],
    queryFn: () => getStaffCertificateUrl(id),
    enabled: !!submission && tab === 'certificate',
  });

  const refreshAfterChange = async () => {
    await queryClient.invalidateQueries({ queryKey: ['validator-queue'] });
    await queryClient.invalidateQueries({ queryKey: ['validator-submission', id] });
  };

  const handleError = (error: unknown) => {
    showToast(
      error instanceof Error ? error.message : 'Permintaan gagal. Silakan coba lagi.',
      'error',
    );
    if (error instanceof ApiClientError && error.code === 'INVALID_TRANSITION') {
      setIsValidateOpen(false);
      setIsRejectOpen(false);
      void submissionQuery.refetch();
    }
  };

  const creditMutation = useMutation({
    mutationFn: ({ finalCredit, reason }: { finalCredit: number; reason: string }) =>
      adjustFinalCredit(id, finalCredit, reason),
    onSuccess: async (result) => {
      showToast(
        `Kredit final diubah dari ${formatCredit(result.previousCredit)} ke ${formatCredit(result.finalCredit)}.`,
        'success',
      );
      await refreshAfterChange();
    },
    onError: handleError,
  });

  const validateMutation = useMutation({
    mutationFn: () => validateSubmission(id),
    onSuccess: async (result) => {
      setIsValidateOpen(false);
      showToast(
        `Pengajuan divalidasi. Kredit final ${formatCredit(result.finalCredit)} ditetapkan.`,
        'success',
      );
      await refreshAfterChange();
      navigate('/validator');
    },
    onError: handleError,
  });

  const rejectMutation = useMutation({
    mutationFn: (note: string) => rejectAsValidator(id, note),
    onSuccess: async () => {
      setIsRejectOpen(false);
      showToast('Pengajuan ditolak. Alasan dikirim ke mahasiswa.', 'success');
      await refreshAfterChange();
      navigate('/validator');
    },
    onError: handleError,
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateFinalForm(id),
    onSuccess: async (result) => {
      showToast(
        result.finalForm.status === 'ready'
          ? 'PDF formulir final berhasil dibuat.'
          : 'PDF formulir final masih gagal dibuat. Coba lagi beberapa saat lagi.',
        result.finalForm.status === 'ready' ? 'success' : 'error',
      );
      await refreshAfterChange();
    },
    onError: handleError,
  });

  if (submissionQuery.isLoading) {
    return <p className="py-12 text-center text-sm text-slate-500">Memuat pengajuan…</p>;
  }

  if (submissionQuery.error || !submission) {
    const notFound =
      submissionQuery.error instanceof ApiClientError && submissionQuery.error.status === 404;
    return (
      <div className="py-12 max-w-xl mx-auto space-y-4">
        <ErrorState
          title={notFound ? 'Pengajuan Tidak Ditemukan' : 'Gagal Memuat Pengajuan'}
          message={
            notFound
              ? 'Pengajuan ini tidak ada.'
              : 'Tidak dapat memuat pengajuan. Periksa koneksi lalu coba lagi.'
          }
          onRetry={notFound ? undefined : () => submissionQuery.refetch()}
        />
        <Link to="/validator" className="block text-center text-sm text-brand-teal">
          Kembali ke antrian
        </Link>
      </div>
    );
  }

  const isWaiting = submission.status === 'waiting_validator';
  const creditToSet = submission.skem.finalCredit ?? submission.skem.estimatedCredit;
  const verifierReviews = submission.reviews.filter((review) => review.stage === 'verifier');
  const adjustments = submission.reviews.filter((review) => review.decision === 'adjust_credit');
  const isBusy = validateMutation.isPending || rejectMutation.isPending || creditMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/validator" title="Kembali ke antrian">
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
                {submission.student.className} ·{' '}
                {submission.activity.activityName ?? 'Nama kegiatan belum terbaca'}
              </p>
            </div>
          </div>
          {isWaiting && (
            <div className="flex items-center gap-2.5">
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
                disabled={isBusy || creditToSet === null}
                title={creditToSet === null ? 'Kredit belum dapat ditetapkan' : undefined}
                onClick={() => setIsValidateOpen(true)}
              >
                <Check className="w-4 h-4" />
                Validasi
              </Button>
            </div>
          )}
        </div>
        {!isWaiting && (
          <p className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
            Pengajuan ini sudah tidak menunggu keputusan Validator.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-3">
          <div
            className="flex rounded-lg border border-slate-200 overflow-hidden text-xs w-fit"
            role="tablist"
          >
            {(
              [
                ['final-form', 'Formulir final', FileCheck2],
                ['certificate', 'Sertifikat', FileText],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-medium ${
                  tab === value
                    ? 'bg-brand-teal text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === 'final-form' && !formReady ? (
            <div className="h-[420px] flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center p-6">
              <FileCheck2 className="w-10 h-10 text-slate-400" />
              <p className="text-sm text-slate-700">
                PDF formulir final:{' '}
                <span className="font-semibold">
                  {FORM_STATUS_TEXT[submission.finalForm.status]}
                </span>
              </p>
              {isWaiting && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={regenerateMutation.isPending}
                  onClick={() => regenerateMutation.mutate()}
                >
                  <RefreshCw className="w-4 h-4" />
                  {regenerateMutation.isPending ? 'Membuat ulang…' : 'Buat ulang'}
                </Button>
              )}
            </div>
          ) : (
            (() => {
              const query = tab === 'final-form' ? finalFormQuery : certificateQuery;
              return query.error ? (
                <ErrorState
                  title="Dokumen Tidak Dapat Dimuat"
                  message="Coba muat ulang pratinjau dokumen."
                  onRetry={() => query.refetch()}
                />
              ) : (
                <PdfViewer
                  url={query.data?.url ?? ''}
                  fileName={`${submission.publicId}${tab === 'final-form' ? '-formulir-final' : ''}.pdf`}
                  onRefreshUrl={() => query.refetch()}
                  className="h-[640px]"
                />
              );
            })()
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          <ReadOnlySubmissionSummary submission={submission} />

          <section className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs text-xs">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Catatan Verifikator</h3>
            {verifierReviews.length === 0 ? (
              <p className="text-slate-500">Tidak ada catatan.</p>
            ) : (
              <ul className="space-y-2">
                {verifierReviews.map((review) => (
                  <li key={review.id}>
                    <span className="font-medium">{review.reviewerName}</span> ·{' '}
                    {review.decision === 'approve' ? 'Menyetujui' : 'Menolak'} ·{' '}
                    {formatDateTimeId(review.createdAt)}
                    <p className="text-slate-600 mt-0.5">{review.note ?? 'Tanpa catatan.'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <FindingsList findings={submission.findings} />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <CreditAdjustPanel
            estimatedCredit={submission.skem.estimatedCredit}
            finalCredit={submission.skem.finalCredit}
            adjustments={adjustments}
            canEdit={isWaiting}
            isSaving={creditMutation.isPending}
            onSave={async (finalCredit, reason) => {
              await creditMutation.mutateAsync({ finalCredit, reason });
            }}
          />
        </div>
      </div>

      <Modal
        isOpen={isValidateOpen}
        onClose={() => setIsValidateOpen(false)}
        title={`Validasi Pengajuan ${submission.publicId}`}
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p>
            Kredit final <strong>{formatCredit(creditToSet)}</strong> akan ditetapkan dan status
            pengajuan menjadi <strong>Disetujui</strong>. Mahasiswa akan melihat kredit final ini.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsValidateOpen(false)}
              disabled={validateMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? 'Memproses...' : 'Validasi'}
            </Button>
          </div>
        </div>
      </Modal>

      <RejectDecisionModal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title={`Tolak Pengajuan ${submission.publicId}`}
        isSubmitting={rejectMutation.isPending}
        onSubmit={async (note) => {
          await rejectMutation.mutateAsync(note);
        }}
      />
    </div>
  );
}
