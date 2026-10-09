import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, AlertCircle } from 'lucide-react';
import { Card } from '../../components/Card';
import { Dropzone } from '../../components/Dropzone';
import { SubmissionCard } from '../../components/SubmissionCard';
import { ProgressTracker } from '../../components/ProgressTracker';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSteps } from '../../components/LoadingSteps';
import { ErrorState } from '../../components/ErrorState';
import { Button } from '../../components/Button';
import {
  uploadBatch,
  getBatchProgress,
  cancelSubmission,
  reuploadSubmission,
  retrySubmission,
} from '../../api/batch';
import type { BatchProgress } from '@skem/shared';

type FilterType = 'all' | 'ready' | 'needs_attention' | 'problem';

export function MahasiswaUploadRoute() {
  const queryClient = useQueryClient();
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);

  // Query untuk batch progress (dengan polling)
  const {
    data: batchProgress,
    isLoading: isLoadingBatch,
    error: batchError,
  } = useQuery<BatchProgress>({
    queryKey: ['batch', currentBatchId],
    queryFn: () => getBatchProgress(currentBatchId!),
    enabled: !!currentBatchId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      
      const hasActive = (data.progress.counts.queued ?? 0) > 0 || (data.progress.counts.analyzing ?? 0) > 0;
      return hasActive ? 2000 : false; // Poll setiap 2 detik jika masih ada yang diproses
    },
  });

  // Mutation untuk upload batch
  const uploadMutation = useMutation({
    mutationFn: uploadBatch,
    onSuccess: (data) => {
      setCurrentBatchId(data.batch.publicId);
      queryClient.invalidateQueries({ queryKey: ['batch', data.batch.publicId] });
    },
  });

  // Mutation untuk cancel
  const cancelMutation = useMutation({
    mutationFn: cancelSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', currentBatchId] });
      setCancelModalOpen(false);
      setSelectedSubmission(null);
    },
  });

  // Mutation untuk reupload
  const reuploadMutation = useMutation({
    mutationFn: ({ publicId, file }: { publicId: string; file: File }) =>
      reuploadSubmission(publicId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', currentBatchId] });
      setReuploadModalOpen(false);
      setReuploadFile(null);
      setSelectedSubmission(null);
    },
  });

  // Mutation untuk retry
  const retryMutation = useMutation({
    mutationFn: retrySubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', currentBatchId] });
    },
  });

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      uploadMutation.mutate(files);
    },
    [uploadMutation]
  );

  const handleCancel = useCallback((publicId: string) => {
    setSelectedSubmission(publicId);
    setCancelModalOpen(true);
  }, []);

  const confirmCancel = useCallback(() => {
    if (selectedSubmission) {
      cancelMutation.mutate(selectedSubmission);
    }
  }, [selectedSubmission, cancelMutation]);

  const handleReupload = useCallback((publicId: string) => {
    setSelectedSubmission(publicId);
    setReuploadModalOpen(true);
  }, []);

  const handleReuploadFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setReuploadFile(file);
      }
    },
    []
  );

  const confirmReupload = useCallback(() => {
    if (selectedSubmission && reuploadFile) {
      reuploadMutation.mutate({ publicId: selectedSubmission, file: reuploadFile });
    }
  }, [selectedSubmission, reuploadFile, reuploadMutation]);

  const handleRetry = useCallback(
    (publicId: string) => {
      retryMutation.mutate(publicId);
    },
    [retryMutation]
  );

  // Filter submissions
  const filteredSubmissions = batchProgress?.submissions.filter((sub) => {
    switch (filter) {
      case 'ready':
        return sub.reviewStatus === 'ready';
      case 'needs_attention':
        return sub.reviewStatus === 'needs_fix';
      case 'problem':
        return sub.reviewStatus === 'problem' || sub.reviewStatus === 'error';
      default:
        return true;
    }
  });

  const filterCounts = {
    all: batchProgress?.submissions.length ?? 0,
    ready: batchProgress?.submissions.filter((s) => s.reviewStatus === 'ready').length ?? 0,
    needs_attention:
      batchProgress?.submissions.filter((s) => s.reviewStatus === 'needs_fix').length ?? 0,
    problem:
      batchProgress?.submissions.filter(
        (s) => s.reviewStatus === 'problem' || s.reviewStatus === 'error'
      ).length ?? 0,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-brand-dark">Unggah Berkas Sertifikat</h1>
        <p className="text-sm text-slate-600">
          Unggah hingga 10 berkas PDF sertifikat sekaligus untuk dianalisis oleh AI Pre-Check Agent.
        </p>
      </div>

      {/* Dropzone */}
      <Card className="p-0 overflow-hidden">
        <Dropzone
          onFilesSelected={handleFilesSelected}
          disabled={uploadMutation.isPending}
        />
      </Card>

      {/* Upload Error */}
      {uploadMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Gagal Mengunggah</h4>
              <p className="text-xs text-red-700">
                {uploadMutation.error?.message || 'Terjadi kesalahan saat mengunggah file.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Batch Progress */}
      {isLoadingBatch && currentBatchId && (
        <LoadingSteps
          steps={[
            { id: 'upload', label: 'Mengunggah file', status: 'in_progress' },
            { id: 'process', label: 'Memproses batch', status: 'pending' },
            { id: 'analyze', label: 'Menganalisis dokumen', status: 'pending' },
          ]}
        />
      )}

      {batchError && (
        <ErrorState
          title="Gagal Memuat Progres"
          message="Tidak dapat memuat progres batch. Silakan coba lagi."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['batch', currentBatchId] })}
        />
      )}

      {batchProgress && (
        <>
          <ProgressTracker progress={batchProgress.progress} />

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            {(['all', 'ready', 'needs_attention', 'problem'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  filter === f
                    ? 'text-brand-teal'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {f === 'all' && 'Semua'}
                {f === 'ready' && 'Siap'}
                {f === 'needs_attention' && 'Perlu Perhatian'}
                {f === 'problem' && 'Bermasalah'}
                <span className="ml-1.5 text-xs">({filterCounts[f]})</span>
                {filter === f && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-teal" />
                )}
              </button>
            ))}
          </div>

          {/* Submissions List */}
          {filteredSubmissions && filteredSubmissions.length > 0 ? (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.publicId}
                  submission={submission}
                  onCancel={handleCancel}
                  onReupload={handleReupload}
                  onRetry={handleRetry}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="w-6 h-6" />}
              title="Tidak Ada Dokumen"
              description={
                filter === 'all'
                  ? 'Unggah file PDF untuk mulai menganalisis.'
                  : 'Tidak ada dokumen dengan filter ini.'
              }
            />
          )}
        </>
      )}

      {/* Info Box */}
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

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Batalkan Analisis"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin membatalkan analisis dokumen ini? Tindakan ini tidak dapat
            dibatalkan.
          </p>
          <div className="flex items-center gap-3 justify-end">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Tidak
            </Button>
            <Button
              variant="danger"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reupload Modal */}
      <Modal
        isOpen={reuploadModalOpen}
        onClose={() => {
          setReuploadModalOpen(false);
          setReuploadFile(null);
          setSelectedSubmission(null);
        }}
        title="Unggah Ulang Dokumen"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Pilih file PDF baru untuk menggantikan dokumen yang lama.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              File PDF
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleReuploadFileSelect}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-brand-teal hover:file:bg-teal-100"
            />
          </div>
          <div className="flex items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setReuploadModalOpen(false);
                setReuploadFile(null);
                setSelectedSubmission(null);
              }}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={confirmReupload}
              disabled={!reuploadFile || reuploadMutation.isPending}
            >
              {reuploadMutation.isPending ? 'Mengunggah...' : 'Unggah'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
