import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileWarning,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
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
import { getValidatorQueue } from '../../api/validator';
import { formatCredit, formatDateTimeId } from '../../lib/verifier';
import { effectiveCredit, queueClassNames } from '../../lib/validator';

const QUEUE_REFRESH_MS = 30_000;
const ALL_CLASSES = '';

const FORM_STATUS = {
  ready: { label: 'Tersedia', variant: 'blue' },
  none: { label: 'Belum tersedia', variant: 'slate' },
  failed: { label: 'Gagal dibuat', variant: 'terracotta' },
} as const;

export function ValidatorQueueRoute() {
  const [className, setClassName] = useState(ALL_CLASSES);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['validator-queue'],
    queryFn: getValidatorQueue,
    refetchInterval: QUEUE_REFRESH_MS,
  });

  const classes = data ? queueClassNames(data.items) : [];
  const items = (data?.items ?? []).filter(
    (item) => className === ALL_CLASSES || item.className === className,
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <ShieldCheck className="w-6 h-6 text-brand-blue" />
          <h1 className="text-2xl font-serif font-bold text-brand-dark">
            Antrian Validator Lintas Kelas
          </h1>
          <SimulasiBadge />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Pengajuan yang sudah disetujui Verifikator dan menunggu validasi akhir.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Inbox className="w-8 h-8 text-brand-blue" />
            <div>
              <p className="text-xs text-slate-500">Menunggu validasi</p>
              <p className="text-2xl font-bold text-brand-dark">{data?.summary.waiting ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <FileWarning className="w-8 h-8 text-brand-terracotta" />
            <div>
              <p className="text-xs text-slate-500">PDF formulir final gagal dibuat</p>
              <p className="text-2xl font-bold text-brand-dark">
                {data?.summary.formFailed ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle>Pengajuan Menunggu Validasi</CardTitle>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            Kelas
            <select
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 bg-white"
            >
              <option value={ALL_CLASSES}>Semua kelas</option>
              {classes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
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
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CheckCircle2 className="w-10 h-10 text-emerald-600" />}
                title={
                  className === ALL_CLASSES
                    ? 'Tidak ada pengajuan yang menunggu validasi'
                    : 'Tidak ada pengajuan dari kelas ini'
                }
                description="Pengajuan yang disetujui Verifikator akan muncul di sini."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahasiswa</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Kegiatan</TableHead>
                  <TableHead>Kredit</TableHead>
                  <TableHead>PDF Final</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const formStatus = FORM_STATUS[item.finalFormStatus];
                  return (
                    <TableRow key={item.publicId}>
                      <TableCell>
                        <div className="font-semibold text-brand-dark">{item.studentName}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.nrp ?? '—'}</div>
                      </TableCell>
                      <TableCell className="text-xs">{item.className ?? '—'}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800">{item.activityName ?? '—'}</div>
                        <div className="text-xs text-slate-500">
                          {[item.categoryLabel, item.level].filter(Boolean).join(' · ') || '—'}
                        </div>
                        {item.flagCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <AlertTriangle className="w-3 h-3" /> {item.flagCount} peringatan AI
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-brand-blue">
                          {formatCredit(effectiveCredit(item))}
                        </div>
                        {item.finalCredit !== null && (
                          <div className="text-[11px] text-slate-500">
                            diubah dari {formatCredit(item.estimatedCredit)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={formStatus.variant} size="sm">
                          {formStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDateTimeId(item.submittedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/validator/detail/${item.publicId}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            Periksa <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
