import type { SubmissionDetail } from '@skem/shared';
import { cn } from '../lib/utils';
import { FileCheck2 } from 'lucide-react';

export interface FormPreviewProps {
  submission: SubmissionDetail;
  className?: string;
}

export function FormPreview({ submission, className }: FormPreviewProps) {
  const { student, activity, verifier } = submission;
  const isApproved = submission.status === 'approved';
  const isRejected = submission.status === 'rejected';
  const isSubmitted = submission.status !== 'draft';

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-slate-300 shadow-sm font-sans text-slate-800 text-xs overflow-hidden',
        className
      )}
    >
      {/* Top Banner / Indicator */}
      <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between text-slate-600">
        <div className="flex items-center gap-1.5 font-medium">
          <FileCheck2 className="w-4 h-4 text-brand-teal" />
          <span>Pratinjau Formulir Resmi</span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">FM.MHS.PENGAJUANSKEM</span>
      </div>

      <div className="p-6 sm:p-8 space-y-6 max-w-2xl mx-auto">
        {/* Header Tabel Dokumen Resmi */}
        <div className="border-2 border-slate-900 text-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-4 border-b border-slate-900">
            <div className="md:col-span-3 p-3 border-b md:border-b-0 md:border-r border-slate-900 flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Politeknik Elektronika Negeri Surabaya
              </span>
              <span className="text-sm font-bold font-serif leading-tight">
                Satuan Kredit Ekstrakurikuler Mahasiswa (SKEM)
              </span>
              <span className="text-xs font-semibold text-slate-800">
                Formulir Kegiatan SKEM
              </span>
            </div>
            <div className="md:col-span-1 p-2 space-y-1 text-[10px] leading-tight flex flex-col justify-center bg-slate-50/50">
              <div>
                <span className="text-slate-500 block">No. Identifikasi:</span>
                <span className="font-mono font-semibold">FM.MHS.PENGAJUANSKEM</span>
              </div>
              <div>
                <span className="text-slate-500 block">No. Revisi / Hal:</span>
                <span className="font-semibold">00 / 1 dari 1</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tgl Terbit:</span>
                <span>02 Juni 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulir Body */}
        <div className="space-y-5 text-slate-900">
          {/* I. Identitas Mahasiswa */}
          <section className="border border-slate-300 rounded p-4 bg-white">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 pb-2 mb-3 border-b border-slate-200">
              I. Identitas Mahasiswa
            </h4>
            <div className="grid grid-cols-3 gap-y-2 text-xs">
              <span className="text-slate-500 font-medium">Nama Lengkap</span>
              <span className="col-span-2 font-semibold text-slate-900">: {student.name}</span>

              <span className="text-slate-500 font-medium">NRP</span>
              <span className="col-span-2 font-mono font-semibold text-slate-900">: {student.nrp}</span>

              <span className="text-slate-500 font-medium">Program Studi</span>
              <span className="col-span-2 text-slate-800">: {student.programStudi}</span>

              <span className="text-slate-500 font-medium">Departemen</span>
              <span className="col-span-2 text-slate-800">: {student.departemen}</span>
            </div>
          </section>

          {/* II. Informasi Kegiatan */}
          <section className="border border-slate-300 rounded p-4 bg-white">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 pb-2 mb-3 border-b border-slate-200">
              II. Informasi Kegiatan
            </h4>
            <div className="grid grid-cols-3 gap-y-2 text-xs">
              <span className="text-slate-500 font-medium">Nama Kegiatan</span>
              <span className="col-span-2 font-semibold text-slate-900">: {activity.activityName}</span>

              <span className="text-slate-500 font-medium">Tanggal Kegiatan</span>
              <span className="col-span-2 text-slate-800">
                :{' '}
                {activity.activityDate
                  ? new Date(activity.activityDate).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </span>

              <span className="text-slate-500 font-medium">Lokasi / Platform</span>
              <span className="col-span-2 text-slate-800">: {activity.locationPlatform || '-'}</span>

              <span className="text-slate-500 font-medium">Penyelenggara</span>
              <span className="col-span-2 text-slate-800">: {activity.organizer || '-'}</span>

              <span className="text-slate-500 font-medium">Jenis Lampiran</span>
              <span className="col-span-2 text-slate-800">: {activity.attachmentType}</span>

              <span className="text-slate-500 font-medium">Bukti Kegiatan</span>
              <span className="col-span-2 text-slate-700 italic">: Terlampir</span>
            </div>
          </section>

          {/* III. Verifikasi */}
          <section className="border border-slate-300 rounded p-4 bg-white">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 pb-2 mb-3 border-b border-slate-200">
              III. Verifikasi
            </h4>
            {isApproved || isRejected ? (
              <div className="grid grid-cols-3 gap-y-2 text-xs">
                <span className="text-slate-500 font-medium">Nama Verifikator</span>
                <span className="col-span-2 font-semibold text-slate-900">: {verifier?.name || '-'}</span>

                <span className="text-slate-500 font-medium">Jabatan</span>
                <span className="col-span-2 text-slate-800">: {verifier?.jabatan || 'Dosen Wali'}</span>

                <span className="text-slate-500 font-medium">Tanggal Verifikasi</span>
                <span className="col-span-2 text-slate-800">
                  :{' '}
                  {submission.timeline.find((t) => t.field === 'status' && (t.to === 'approved' || t.to === 'rejected'))?.at
                    ? new Date(
                        submission.timeline.find((t) => t.field === 'status' && (t.to === 'approved' || t.to === 'rejected'))!.at
                      ).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'}
                </span>

                <span className="text-slate-500 font-medium">Keputusan</span>
                <div className="col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-1.5 font-medium">
                    <input type="checkbox" checked={isApproved} readOnly className="rounded text-brand-teal" />
                    <span>Disetujui</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-medium">
                    <input type="checkbox" checked={isRejected} readOnly className="rounded text-red-600" />
                    <span>Ditolak</span>
                  </label>
                </div>

                <span className="text-slate-500 font-medium">Tanda Tangan</span>
                <span className="col-span-2 text-slate-600 italic">: (Tanda tangan digital terverifikasi)</span>
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs py-2">
                Diisi otomatis saat Verifikator menyetujui pengajuan.
              </p>
            )}
          </section>

          {/* IV. Pernyataan Mahasiswa */}
          <section className="border border-slate-300 rounded p-4 bg-white">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 pb-2 mb-2 border-b border-slate-200">
              IV. Pernyataan Mahasiswa
            </h4>
            <p className="text-[11px] text-slate-700 leading-relaxed mb-4 text-justify">
              Saya menyatakan bahwa data yang saya isi dalam formulir ini adalah benar dan dapat
              dipertanggungjawabkan. Saya bersedia menerima sanksi akademik sesuai ketentuan yang berlaku di Politeknik Elektronika Negeri Surabaya apabila di kemudian hari terbukti data yang saya isi tidak benar.
            </p>

            {isSubmitted ? (
              <div className="text-right text-xs space-y-1 pt-2 border-t border-dashed border-slate-200">
                <p className="text-slate-600">
                  Surabaya,{' '}
                  {new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <div className="py-2">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-mono">
                    ✓ E-Signature Mahasiswa Terverifikasi
                  </span>
                </div>
                <p className="font-semibold text-slate-900 underline underline-offset-2">{student.name}</p>
                <p className="text-slate-500 font-mono text-[11px]">NRP. {student.nrp}</p>
              </div>
            ) : (
              <div className="text-right text-xs pt-2 border-t border-dashed border-slate-200">
                <p className="text-slate-400 italic text-[11px]">
                  Tanda tangan dibubuhkan saat Anda mengajukan formulir.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Footer Note */}
        <div className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-3 italic">
          * Catatan: Kategori, tingkat, peran, dan kredit SKEM tidak tercetak pada formulir resmi dan hanya digunakan untuk proses verifikasi & penetapan kredit.
        </div>
      </div>
    </div>
  );
}
