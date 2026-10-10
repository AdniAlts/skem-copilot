import { useState } from 'react';
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header Identitas Mahasiswa ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-brand-dark">
              Selamat Datang, {user?.name || 'Mahasiswa'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue-50 text-brand-blue font-medium border border-brand-blue-200/60">
              Mahasiswa
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              NRP:{' '}
              <strong className="font-semibold text-slate-800">{user?.nrp || '3122500001'}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Kelas:{' '}
              <strong className="font-semibold text-slate-800">
                {user?.className || '2 D3 IT B'}
              </strong>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Dosen Wali:{' '}
              <strong className="font-semibold text-slate-800">
                {user?.verifierName || 'Dr. Akhmad Alimudin (Verifikator)'}
              </strong>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/mahasiswa/unggah">
            <Button variant="primary" className="gap-2 shadow-xs">
              <Upload className="w-4 h-4" />
              Unggah Sertifikat
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Progres Akumulasi Kredit Menuju 3,00 Poin ─────────────── */}
      <Card className="shadow-xs border-slate-200/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-blue-50 flex items-center justify-center text-brand-blue">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">
                Progres Kredit SKEM (Target 3,00)
              </CardTitle>
              <p className="text-xs text-slate-500">
                Akumulasi kredit resmi dari pengajuan yang telah disetujui Validator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFulfilled ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terpenuhi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                Belum Terpenuhi (Kurang {(targetTotal - currentTotal).toFixed(2)})
              </span>
            )}
            <span className="text-base sm:text-lg font-serif font-bold text-brand-dark ml-2">
              {currentTotal.toFixed(2)} / {targetTotal.toFixed(2)} Poin
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {isLoadingProgress ? (
            <div className="py-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-blue" />
              <span>Memuat progres kredit...</span>
            </div>
          ) : progressError ? (
            <div className="py-4">
              <ErrorState
                title="Gagal Memuat Progres Kredit"
                message="Terjadi kendala saat mengambil data progres kredit SKEM. Silakan coba lagi."
                onRetry={() => refetchProgress()}
              />
            </div>
          ) : (
            <>
              {/* Main Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                  <span>Progres Kelulusan</span>
                  <span>{totalPercentage}% Tercapai</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/60">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 ease-out',
                      isFulfilled ? 'bg-emerald-600' : 'bg-brand-blue',
                    )}
                    style={{ width: `${totalPercentage}%` }}
                  />
                </div>
              </div>

              {/* 3 Component Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Komponen 1 */}
                <div
                  className={cn(
                    'p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between',
                    isK1Complete
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-200/70',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 text-sm">
                        Komponen 1 (Wajib)
                      </span>
                      {!isK1Complete && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-200/80 text-amber-900">
                          Prioritas Wajib
                        </span>
                      )}
                      {isK1Complete && (
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Lengkap
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mb-2">
                      Kegiatan Wajib Institusi (LKMM, P2K, Bela Negara)
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>Target: {k1.target.toFixed(2)}</span>
                      <span className="font-bold text-slate-800">{k1.earned.toFixed(2)} Poin</span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          isK1Complete ? 'bg-emerald-600' : 'bg-amber-500',
                        )}
                        style={{
                          width: `${Math.min(Math.round((k1.earned / k1.target) * 100), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Komponen 2 */}
                <div
                  className={cn(
                    'p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between',
                    isK2Complete
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-200/70',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 text-sm">
                        Komponen 2 (Wajib)
                      </span>
                      {!isK2Complete && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-200/80 text-amber-900">
                          Prioritas Wajib
                        </span>
                      )}
                      {isK2Complete && (
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Lengkap
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mb-2">
                      Organisasi, Kepengurusan, dan Kepanitiaan
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>Target: {k2.target.toFixed(2)}</span>
                      <span className="font-bold text-slate-800">{k2.earned.toFixed(2)} Poin</span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          isK2Complete ? 'bg-emerald-600' : 'bg-amber-500',
                        )}
                        style={{
                          width: `${Math.min(Math.round((k2.earned / k2.target) * 100), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Komponen 3 */}
                <div className="p-3.5 rounded-xl border bg-slate-50/60 border-slate-200 text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 text-sm">
                        Komponen 3 (Pilihan)
                      </span>
                      {k3.earned >= k3.target && (
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Lengkap
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mb-2">
                      Prestasi, Lomba, Seminar, Pelatihan & Penalaran
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                      <span>Min: {k3.target.toFixed(2)}</span>
                      <span className="font-bold text-slate-800">{k3.earned.toFixed(2)} Poin</span>
                    </div>
                    <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-brand-blue"
                        style={{
                          width: `${Math.min(Math.round((k3.earned / k3.target) * 100), 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Daftar Pengajuan Resmi Mahasiswa ─────────────────────── */}
      <Card className="shadow-xs border-slate-200/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-dark" />
              <CardTitle className="text-lg">Daftar Pengajuan Kegiatan</CardTitle>
              {isRefetchingSubmissions && (
                <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau status verifikasi dosen wali dan keputusan validasi akhir
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-md transition-all',
                activeTab === 'all'
                  ? 'bg-white text-brand-dark shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Semua ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab('in_process')}
              className={cn(
                'px-3 py-1.5 rounded-md transition-all',
                activeTab === 'in_process'
                  ? 'bg-white text-brand-blue shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Dalam Proses ({counts.in_process})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={cn(
                'px-3 py-1.5 rounded-md transition-all',
                activeTab === 'approved'
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900',
              )}
            >
              Disetujui ({counts.approved})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={cn(
                'px-3 py-1.5 rounded-md transition-all',
                activeTab === 'rejected'
                  ? 'bg-white text-red-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900',
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
                      'p-4 hover:bg-slate-50/50 transition-colors space-y-3',
                      isRejected && 'bg-red-50/20',
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
                          <h4 className="font-semibold text-brand-dark text-sm sm:text-base">
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
                            <span className="text-sm sm:text-base font-serif font-bold text-emerald-800">
                              +{(sub.finalCredit ?? sub.estimatedCredit ?? 0).toFixed(2)} Poin
                            </span>
                          </div>
                        ) : (
                          <div className="text-right mr-2">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Estimasi Kredit
                            </span>
                            <span className="text-sm font-semibold text-slate-700">
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
