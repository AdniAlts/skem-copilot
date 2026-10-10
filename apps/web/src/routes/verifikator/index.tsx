import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox, UserCheck } from 'lucide-react';
import type { VerifierQueueQuery } from '@skem/shared';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { SimulasiBadge } from '../../components/SimulasiBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/Table';
import { useAuth } from '../../api/auth-context';
import { getVerifierQueue } from '../../api/verifier';
import { formatCredit, formatDateTimeId } from '../../lib/verifier';

const QUEUE_REFRESH_MS = 30_000;

type AiFilter = VerifierQueueQuery['aiStatus'] | 'all';

const AI_FILTERS: { value: AiFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'warning', label: 'Ada peringatan' },
  { value: 'clean', label: 'Tanpa peringatan' },
];

const SORT_OPTIONS: { value: VerifierQueueQuery['sort']; label: string }[] = [
  { value: 'oldest', label: 'Terlama masuk' },
  { value: 'newest', label: 'Terbaru masuk' },
  { value: 'flags', label: 'Peringatan terbanyak' },
];

export function VerifikatorQueueRoute() {
  const { user } = useAuth();
  const [aiFilter, setAiFilter] = useState<AiFilter>('all');
  const [sort, setSort] = useState<VerifierQueueQuery['sort']>('oldest');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['verifier-queue', aiFilter, sort],
    queryFn: () =>
      getVerifierQueue({ sort, ...(aiFilter === 'all' ? {} : { aiStatus: aiFilter }) }),
    refetchInterval: QUEUE_REFRESH_MS,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <UserCheck className="w-6 h-6 text-brand-teal" />
            <h1 className="text-2xl font-serif font-bold text-brand-dark">
              Antrian Kelas {data?.className ?? '…'}
            </h1>
            <SimulasiBadge />
          </div>
          <p className="text-sm text-slate-600 mt-1">
            {user?.name ?? 'Dosen Wali'}
            {user?.jabatan ? ` · ${user.jabatan}` : ''} · hanya pengajuan dari kelas Anda
          </p>
        </div>
        <Link to="/verifikator/pengaturan">
          <Button variant="outline" size="sm">
            Pengaturan tanda tangan
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Inbox className="w-8 h-8 text-brand-teal" />
            <div>
              <p className="text-xs text-slate-500">Menunggu keputusan</p>
              <p className="text-2xl font-bold text-brand-dark">{data?.summary.waiting ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-xs text-slate-500">Dengan peringatan AI</p>
              <p className="text-2xl font-bold text-brand-dark">
                {data?.summary.withWarnings ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle>Pengajuan Menunggu Verifikasi</CardTitle>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden" role="group">
              {AI_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setAiFilter(filter.value)}
                  aria-pressed={aiFilter === filter.value}
                  className={`px-3 py-1.5 font-medium ${
                    aiFilter === filter.value
                      ? 'bg-brand-teal text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-slate-600">
              Urutkan
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as VerifierQueueQuery['sort'])}
                className="rounded-lg border border-slate-200 px-2 py-1.5 bg-white"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-slate-500">Memuat antrian…</p>
          ) : error ? (
            <div className="p-6">
              <ErrorState
                title="Gagal Memuat Antrian"
                message={error instanceof Error ? error.message : 'Silakan coba lagi.'}
                onRetry={() => refetch()}
              />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CheckCircle2 className="w-10 h-10 text-emerald-600" />}
                title={
                  aiFilter === 'all'
                    ? 'Tidak ada pengajuan yang menunggu'
                    : 'Tidak ada pengajuan dengan filter ini'
                }
                description={
                  data?.className === null
                    ? 'Akun ini belum terhubung ke kelas mana pun.'
                    : 'Pengajuan baru dari mahasiswa kelas Anda akan muncul di sini.'
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>Kegiatan</TableHead>
                  <TableHead>Status AI</TableHead>
                  <TableHead>Estimasi Kredit</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.publicId}>
                    <TableCell>
                      <div className="font-semibold text-brand-dark">{item.studentName}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.publicId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{item.activityName ?? '—'}</div>
                      <div className="text-xs text-slate-500">
                        {[item.categoryLabel, item.level].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.aiStatus === 'warning' ? (
                        <Badge variant="amber" size="sm" className="gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {item.flagCount} peringatan
                        </Badge>
                      ) : (
                        <Badge variant="teal" size="sm" className="gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Tanpa peringatan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-brand-teal">
                      {formatCredit(item.estimatedCredit)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDateTimeId(item.submittedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/verifikator/detail/${item.publicId}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          Periksa <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
