import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  StatCard,
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
import { ArrowRight, AlertTriangle, Inbox } from 'lucide-react';
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
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] sm:text-[32px] leading-[1.15] font-serif font-bold text-brand-dark">
          Antrian Kelas {data?.className ?? '…'}
        </h1>
        <p className="text-[14.5px] leading-relaxed text-slate-600">
          Hanya pengajuan mahasiswa kelas perwalian Anda.
        </p>
      </header>

      {data && (
        <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Menunggu keputusan"
            value={data.summary.waiting}
            icon={<Inbox className="h-[17px] w-[17px]" />}
          />
          <StatCard
            label="Perlu perhatian"
            value={data.summary.withWarnings}
            tone="warning"
            icon={<AlertTriangle className="h-[17px] w-[17px]" />}
          />
        </section>
      )}

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'clean', 'warning'] as AiFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setAiFilter(f)}
                className={cn(
                  'flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors',
                  aiFilter === f
                    ? 'border-brand-dark bg-brand-dark text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-blue',
                )}
              >
                {f === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {f === 'all' ? 'Semua' : f === 'clean' ? 'Bersih' : 'Peringatan'}
              </button>
            ))}
          </div>
          {!isLoading && data && (
            <span className="text-xs text-slate-500">Menampilkan {data.items.length} data</span>
          )}
          <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-600">
            Urutkan
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-9 rounded-[10px] border border-slate-300 bg-white px-2 text-[13px] text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="oldest">Terlama dulu</option>
              <option value="newest">Terbaru dulu</option>
              <option value="flags">Paling banyak peringatan</option>
            </select>
          </label>
        </div>
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
                      <div className="text-[13.5px] font-bold text-brand-dark">
                        {item.studentName}
                      </div>
                      <div className="font-mono text-[11.5px] text-slate-500">{item.publicId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800 max-w-[220px] truncate">
                        {item.activityName ?? '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.level ?? '—'}
                        {item.categoryLabel ? ` · ${item.categoryLabel.split(' - ')[0]}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.aiStatus === 'warning' ? (
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-amber-50 pl-1.5 pr-2 text-xs font-bold text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          {item.flagCount} peringatan
                        </span>
                      ) : (
                        <StatusBadge type="review" status="ready" size="sm" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[13px] font-medium text-brand-dark">
                      {formatCredit(item.estimatedCredit)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(item.submittedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/verifikator/pengajuan/${item.publicId}`}>
                        <Button variant="secondary" size="sm" className="gap-1">
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
