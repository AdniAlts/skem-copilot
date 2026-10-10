import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
} from '../../components';
import { ArrowRight, UserCheck, AlertTriangle, Filter } from 'lucide-react';
import { getVerifierQueue } from '../../api/verifier';
import type { VerifierQueueResponse } from '@skem/shared';
import { cn } from '../../lib/utils';

type AiFilter = 'all' | 'clean' | 'warning';
type SortOption = 'oldest' | 'newest' | 'flags';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCredit(credit: number | null) {
  if (credit === null) return '—';
  return credit.toFixed(2).replace('.', ',') + ' Poin';
}

export function VerifikatorQueueRoute() {
  const [aiFilter, setAiFilter] = useState<AiFilter>('all');
  const [sort, setSort] = useState<SortOption>('oldest');

  const { data, isLoading, isError, refetch } = useQuery<VerifierQueueResponse>({
    queryKey: ['verifier-queue', aiFilter, sort],
    queryFn: () =>
      getVerifierQueue({
        aiStatus: aiFilter === 'all' ? undefined : aiFilter,
        sort,
      }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-teal" />
            <h1 className="text-2xl font-serif font-bold text-brand-dark">
              Antrian Kelas {data?.className ?? '…'}
            </h1>
          </div>
          {data && (
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-medium text-brand-teal">{data.summary.waiting}</span> menunggu
              keputusan
              {data.summary.withWarnings > 0 && (
                <>
                  {' '}·{' '}
                  <span className="text-amber-600 font-medium flex-inline items-center gap-1">
                    <AlertTriangle className="inline w-3.5 h-3.5" />{' '}
                    {data.summary.withWarnings} perlu perhatian
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Filter & Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-500">Status AI:</span>
        {(['all', 'clean', 'warning'] as AiFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setAiFilter(f)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              aiFilter === f
                ? 'bg-brand-teal text-white border-brand-teal'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-teal',
            )}
          >
            {f === 'all' ? 'Semua' : f === 'clean' ? 'Bersih' : '⚠ Peringatan'}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-2">Urut:</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-teal"
        >
          <option value="oldest">Terlama dulu</option>
          <option value="newest">Terbaru dulu</option>
          <option value="flags">Paling banyak peringatan</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Mahasiswa</CardTitle>
          {!isLoading && data && (
            <span className="text-xs text-slate-500">
              Menampilkan {data.items.length} data
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-400">
              Memuat antrian…
            </div>
          ) : isError ? (
            <ErrorState
              message="Gagal memuat antrian."
              onRetry={() => void refetch()}
              className="py-12"
            />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="Antrian kosong"
              description="Tidak ada pengajuan yang menunggu verifikasi."
              className="py-12"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>Kegiatan</TableHead>
                  <TableHead>Status AI</TableHead>
                  <TableHead>Kredit</TableHead>
                  <TableHead>Diajukan</TableHead>
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
                      <div className="font-medium text-slate-800 max-w-[220px] truncate">
                        {item.activityName ?? '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.level ?? '—'}{item.categoryLabel ? ` · ${item.categoryLabel.split(' - ')[0]}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.aiStatus === 'warning' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          {item.flagCount} peringatan
                        </span>
                      ) : (
                        <StatusBadge type="review" status="ready" size="sm" />
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-brand-teal">
                      {formatCredit(item.estimatedCredit)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(item.submittedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/verifikator/pengajuan/${item.publicId}`}>
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
