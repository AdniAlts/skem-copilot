import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Upload,
  ChevronDown,
  ChevronUp,
  User,
  IdCard,
  Users,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Timeline } from '../../components/Timeline';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../../api/auth-context';
import { useToast } from '../../components/ToastContext';
import { getSubmissions, getStudentProgress, getFinalFormUrl } from '../../api/submissions';
import { toOfficialStatus, type SubmissionCard, type Progress } from '@skem/shared';
import { cn } from '../../lib/utils';

type FilterTab = 'all' | 'in_process' | 'approved' | 'rejected';

export function MahasiswaDashboardRoute() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // 1. Query Progres SKEM Mahasiswa (polling setiap 10 detik)
  const {
    data: progress,
    isLoading: isLoadingProgress,
    error: progressError,
    refetch: refetchProgress,
  } = useQuery<Progress>({
    queryKey: ['student-progress'],
    queryFn: getStudentProgress,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  // 2. Query Daftar Pengajuan Mahasiswa (polling setiap 10 detik)
  const {
    data: allSubmissions,
    isLoading: isLoadingSubmissions,
    isRefetching: isRefetchingSubmissions,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useQuery<SubmissionCard[]>({
    queryKey: ['student-submissions'],
    queryFn: () => getSubmissions(),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  // Saring hanya pengajuan yang sudah diajukan (non-draft)
  const submittedSubmissions = (allSubmissions || []).filter((item) => item.status !== 'draft');

  // Filter tab
  const filteredSubmissions = submittedSubmissions.filter((item) => {
    const offStatus = toOfficialStatus(item.status);
    if (activeTab === 'in_process') return offStatus === 'dalam_proses';
    if (activeTab === 'approved') return offStatus === 'disetujui';
    if (activeTab === 'rejected') return offStatus === 'ditolak';
    return true;
  });

  const counts = {
    all: submittedSubmissions.length,
    in_process: submittedSubmissions.filter((s) => toOfficialStatus(s.status) === 'dalam_proses')
      .length,
    approved: submittedSubmissions.filter((s) => s.status === 'approved').length,
    rejected: submittedSubmissions.filter((s) => s.status === 'rejected').length,
  };

  // Unduh Formulir Final PDF
  const handleDownloadFinalForm = async (publicId: string) => {
    try {
      setDownloadingId(publicId);
      const res = await getFinalFormUrl(publicId);
      if (res?.url) {
        window.open(res.url, '_blank');
        showToast('Mengunduh formulir final...', 'success');
      } else {
        showToast('Formulir final belum siap diunduh.', 'error');
      }
    } catch {
      showToast('Gagal mengunduh formulir final.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleExpand = (publicId: string) => {
    setExpandedTimelineId((prev) => (prev === publicId ? null : publicId));
  };

  // Hitung persentase total kredit
  const targetTotal = progress?.target ?? 3.0;
  const currentTotal = progress?.total ?? 0;
  const totalPercentage = Math.min(Math.round((currentTotal / targetTotal) * 100), 100);
  const isFulfilled = progress?.fulfilled ?? currentTotal >= targetTotal;

  // Data komponen
  const k1 = progress?.komponen.find((k) => k.komponen === 1) ?? {
    komponen: 1,
    target: 1.25,
    earned: 0,
  };
  const k2 = progress?.komponen.find((k) => k.komponen === 2) ?? {
    komponen: 2,
    target: 0.5,
    earned: 0,
  };
  const k3 = progress?.komponen.find((k) => k.komponen === 3) ?? {
    komponen: 3,
    target: 1.25,
    earned: 0,
  };

  const isK1Complete = k1.earned >= k1.target;
  const isK2Complete = k2.earned >= k2.target;

  return (
    <div className="mx-auto max-w-6xl space-y-[22px]">
      {/* ── Header Identitas Mahasiswa ─────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[28px] sm:text-[32px] leading-[1.15] font-serif font-bold text-brand-dark">
            Selamat Datang, {user?.name || 'Mahasiswa'}
          </h1>
          <div className="flex flex-wrap gap-2">
            <IdentityChip icon={<IdCard className="h-4 w-4" />}>
              NRP {user?.nrp || '3122500001'}
            </IdentityChip>
            <IdentityChip icon={<Users className="h-4 w-4" />}>
              Kelas {user?.className || '2 D3 IT B'}
            </IdentityChip>
            <IdentityChip icon={<User className="h-4 w-4" />}>
              Dosen Wali: {user?.verifierName || 'Dr. Akhmad Alimudin (Verifikator)'}
            </IdentityChip>
          </div>
        </div>
        <Link to="/mahasiswa/unggah">
          <Button variant="primary" size="lg">
            <Upload className="h-5 w-5" />
            Unggah Sertifikat
          </Button>
        </Link>
      </header>

      {/* ── Progres Akumulasi Kredit Menuju 3,00 Poin ─────────────── */}
      <Card className="p-6">
        {isLoadingProgress ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin text-brand-blue" />
            <span>Memuat progres kredit...</span>
          </div>
        ) : progressError ? (
          <ErrorState
            title="Gagal Memuat Progres Kredit"
            message="Terjadi kendala saat mengambil data progres kredit SKEM. Silakan coba lagi."
            onRetry={() => refetchProgress()}
          />
        ) : (
          <div className="grid items-center gap-7 md:grid-cols-[230px_minmax(0,1fr)]">
            <div className="flex flex-col gap-2 border-slate-100 md:border-r md:pr-6">
              <span className="text-[13px] font-bold text-slate-600">
                Progres Kredit SKEM (Target 3,00)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-[56px] font-bold leading-none">
                  {currentTotal.toFixed(2)}
                </span>
                <span className="text-[15px] text-slate-600">/ {targetTotal.toFixed(2)}</span>
              </div>
              <ProgressBar percent={totalPercentage} className="h-2.5" />
              <span className="text-[13px] text-slate-600">
                {isFulfilled
                  ? `Terpenuhi · ${totalPercentage}% tercapai`
                  : `Belum Terpenuhi (Kurang ${(targetTotal - currentTotal).toFixed(2)}) · ${totalPercentage}% tercapai`}
              </span>
              <span className="text-xs text-slate-500">
                Akumulasi kredit resmi dari pengajuan yang telah disetujui Validator
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <ComponentProgressRow
                name="Komponen 1 (Wajib)"
                description="Kegiatan Wajib Institusi (LKMM, P2K, Bela Negara)"
                earned={k1.earned}
                target={k1.target}
                targetLabel="Target"
                complete={isK1Complete}
                pendingLabel="Prioritas Wajib"
              />
              <ComponentProgressRow
                name="Komponen 2 (Wajib)"
                description="Organisasi, Kepengurusan, dan Kepanitiaan"
                earned={k2.earned}
                target={k2.target}
                targetLabel="Target"
                complete={isK2Complete}
                pendingLabel="Prioritas Wajib"
              />
              <ComponentProgressRow
                name="Komponen 3 (Pilihan)"
                description="Prestasi, Lomba, Seminar, Pelatihan & Penalaran"
                earned={k3.earned}
                target={k3.target}
                targetLabel="Min"
                complete={k3.earned >= k3.target}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Daftar Pengajuan Resmi Mahasiswa ─────────────────────── */}
      <Card className="overflow-hidden p-0">
        <CardHeader className="mb-0 flex flex-col justify-between gap-3 border-b border-slate-100 px-[22px] py-[18px] sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-dark" />
              <CardTitle className="text-xl">Daftar Pengajuan Kegiatan</CardTitle>
              {isRefetchingSubmissions && (
                <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau status verifikasi dosen wali dan keputusan validasi akhir
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-0.5 rounded-full bg-emerald-50 p-[3px] text-[12.5px] font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'h-[34px] px-3 rounded-full transition-colors',
                activeTab === 'all'
                  ? 'bg-brand-blue text-white'
                  : 'text-slate-700 hover:text-brand-blue',
              )}
            >
              Semua ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab('in_process')}
              className={cn(
                'h-[34px] px-3 rounded-full transition-colors',
                activeTab === 'in_process'
                  ? 'bg-brand-blue text-white'
                  : 'text-slate-700 hover:text-brand-blue',
              )}
            >
              Dalam Proses ({counts.in_process})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={cn(
                'h-[34px] px-3 rounded-full transition-colors',
                activeTab === 'approved'
                  ? 'bg-brand-blue text-white'
                  : 'text-slate-700 hover:text-brand-blue',
              )}
            >
              Disetujui ({counts.approved})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={cn(
                'h-[34px] px-3 rounded-full transition-colors',
                activeTab === 'rejected'
                  ? 'bg-brand-blue text-white'
                  : 'text-slate-700 hover:text-brand-blue',
              )}
            >
              Ditolak ({counts.rejected})
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingSubmissions ? (
            <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-blue" />
              <span>Memuat daftar pengajuan...</span>
            </div>
          ) : submissionsError ? (
            <div className="p-8">
              <ErrorState
                title="Gagal Memuat Daftar Pengajuan"
                message="Terjadi kesalahan saat mengambil riwayat pengajuan kegiatan Anda. Silakan coba lagi."
                onRetry={() => refetchSubmissions()}
              />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Award className="w-8 h-8 text-slate-400" />}
                title={
                  activeTab === 'all'
                    ? 'Belum Ada Pengajuan Diajukan'
                    : 'Tidak Ada Pengajuan dengan Filter Ini'
                }
                description={
                  activeTab === 'all'
                    ? 'Anda belum memiliki riwayat pengajuan kegiatan SKEM. Unggah sertifikat kegiatan Anda untuk memulai.'
                    : 'Silakan pilih tab filter status lainnya untuk melihat riwayat pengajuan.'
                }
                action={
                  activeTab === 'all' ? (
                    <Link to="/mahasiswa/unggah">
                      <Button variant="primary" size="sm" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Unggah Sertifikat Sekarang
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSubmissions.map((sub) => {
                const isExpanded = expandedTimelineId === sub.publicId;
                const isApproved = sub.status === 'approved';
                const isRejected = sub.status === 'rejected';
                const officialStatus = toOfficialStatus(sub.status);

                return (
                  <div
                    key={sub.publicId}
                    className={cn(
                      'px-[22px] py-[18px] hover:bg-slate-50 transition-colors space-y-3.5',
                      isRejected && 'bg-red-50/30',
                    )}
                  >
                    {/* Item Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            {sub.publicId}
                          </span>
                          <span className="text-slate-300">&bull;</span>
                          <h4 className="font-sans text-[15px] font-bold leading-snug text-brand-dark">
                            {sub.activityName || sub.fileName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                          {officialStatus && (
                            <StatusBadge type="official" status={officialStatus} size="sm" />
                          )}
                          <StatusBadge type="submission" status={sub.status} size="sm" />
                          <span className="text-slate-300">&bull;</span>
                          <span>Berkas: {sub.fileName}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span>
                            {new Date(sub.updatedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Right side: Credit display & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isApproved ? (
                          <div className="text-right mr-2">
                            <span className="text-[10px] text-emerald-700 block font-medium">
                              Kredit Final
                            </span>
                            <span className="font-mono text-sm font-medium text-emerald-800 sm:text-base">
                              +{(sub.finalCredit ?? sub.estimatedCredit ?? 0).toFixed(2)} Poin
                            </span>
                          </div>
                        ) : (
                          <div className="text-right mr-2">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Estimasi Kredit
                            </span>
                            <span className="font-mono text-sm font-medium text-slate-700">
                              {(sub.estimatedCredit ?? 0).toFixed(2)} Poin
                            </span>
                          </div>
                        )}

                        {/* Download final form button if approved */}
                        {isApproved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFinalForm(sub.publicId)}
                            disabled={downloadingId === sub.publicId}
                            className="gap-1.5 text-xs text-brand-blue hover:bg-brand-blue-50"
                            title="Unduh Formulir Resmi FM.MHS.PENGAJUANSKEM (PDF)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {downloadingId === sub.publicId ? 'Mengunduh...' : 'Unduh PDF'}
                            </span>
                          </Button>
                        )}

                        {/* Link to Detail */}
                        <Link to={`/mahasiswa/detail/${sub.publicId}`}>
                          <Button variant="outline" size="sm" className="gap-1 text-xs">
                            <span>Detail</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </Link>

                        {/* Toggle Timeline Accordion */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(sub.publicId)}
                          className="px-2 text-slate-500 hover:text-slate-800"
                          title="Lihat Alur Timeline"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Compact Timeline Preview always visible */}
                    <div className="pt-1">
                      <Timeline
                        status={sub.status}
                        finalCredit={sub.finalCredit}
                        compact={!isExpanded}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IdentityChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[13px] text-brand-dark">
      <span className="text-brand-blue">{icon}</span>
      {children}
    </span>
  );
}

function ProgressBar({
  percent,
  tone = 'blue',
  className,
}: {
  percent: number;
  tone?: 'blue' | 'yellow';
  className?: string;
}) {
  return (
    <span className={cn('block h-2 overflow-hidden rounded-full bg-slate-100', className)}>
      <span
        className={cn(
          'block h-full rounded-full transition-all duration-500 ease-out',
          tone === 'blue' ? 'bg-brand-blue' : 'bg-brand-yellow',
        )}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}

interface ComponentProgressRowProps {
  name: string;
  description: string;
  earned: number;
  target: number;
  targetLabel: string;
  complete: boolean;
  /** Label chip saat belum lengkap; tanpa chip jika tidak diisi. */
  pendingLabel?: string;
}

function ComponentProgressRow({
  name,
  description,
  earned,
  target,
  targetLabel,
  complete,
  pendingLabel,
}: ComponentProgressRowProps) {
  const percent = Math.min(Math.round((earned / target) * 100), 100);
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[14.5px] font-bold">{name}</span>
        <span className="text-[12.5px] text-slate-500">{description}</span>
        {complete ? (
          <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-brand-blue-100 pl-1.5 pr-2 text-[11.5px] font-bold text-brand-blue-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Lengkap
          </span>
        ) : (
          pendingLabel && (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-brand-yellow-100 pl-1.5 pr-2 text-[11.5px] font-bold text-brand-yellow-900">
              <Clock className="h-3.5 w-3.5" /> {pendingLabel}
            </span>
          )
        )}
        <span className="ml-auto font-mono text-[13.5px]">
          {earned.toFixed(2)} / {targetLabel} {target.toFixed(2)}
        </span>
      </div>
      <ProgressBar percent={percent} tone={complete ? 'blue' : 'yellow'} />
    </div>
  );
}
