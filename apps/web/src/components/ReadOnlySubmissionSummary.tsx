import type { SubmissionDetail } from '@skem/shared';
import { Lock } from 'lucide-react';
import { formatCredit, formatDateId } from '../lib/verifier';
import { cn } from '../lib/utils';

export interface ReadOnlySubmissionSummaryProps {
  submission: SubmissionDetail;
  className?: string;
}

type Row = { label: string; value: string | number | null | undefined };

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs">
      <h3 className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800">
        {title}
      </h3>
      <dl className="px-4 py-3 grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="col-span-2 font-medium text-slate-900 break-words">
              {value === null || value === undefined || value === '' ? '—' : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Data pengajuan versi baca-saja (teks biasa, tanpa input) untuk staf.
 * Dipakai layar Verifikator; dapat dipakai ulang layar Validator.
 */
export function ReadOnlySubmissionSummary({
  submission,
  className,
}: ReadOnlySubmissionSummaryProps) {
  const { student, activity, skem } = submission;
  return (
    <div className={cn('space-y-4', className)}>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Lock className="w-3.5 h-3.5" />
        Data hanya dapat dibaca. Jika tidak sesuai bukti, tolak pengajuan dengan alasan.
      </p>

      <Section
        title="Identitas Mahasiswa (dari akun)"
        rows={[
          { label: 'Nama Lengkap', value: student.name },
          { label: 'NRP', value: student.nrp },
          { label: 'Program Studi', value: student.programStudi },
          { label: 'Departemen', value: student.departemen },
          { label: 'Kelas / Angkatan', value: `${student.className} / ${student.angkatan}` },
        ]}
      />

      <Section
        title="Informasi Kegiatan"
        rows={[
          { label: 'Nama Kegiatan', value: activity.activityName },
          { label: 'Tanggal Selesai', value: formatDateId(activity.activityDate) },
          { label: 'Lokasi / Platform', value: activity.locationPlatform },
          { label: 'Penyelenggara', value: activity.organizer },
          { label: 'Jenis Lampiran', value: activity.attachmentType },
        ]}
      />

      <Section
        title="Data SKEM (tidak tercetak di formulir)"
        rows={[
          { label: 'Komponen', value: skem.komponen },
          { label: 'Kategori', value: skem.categoryCode },
          { label: 'Tingkat', value: skem.level },
          { label: 'Peran', value: skem.roleInActivity },
          { label: 'Capaian', value: skem.achievement },
          {
            label: 'Estimasi Kredit',
            value:
              skem.estimatedCredit === null
                ? 'Kombinasi tidak ada di tabel bobot'
                : `${formatCredit(skem.estimatedCredit)} (dari tabel bobot resmi; nilai final ditetapkan Validator)`,
          },
        ]}
      />
    </div>
  );
}
