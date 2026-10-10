import { useState, useMemo } from 'react';
import { Lock, Save, RotateCcw, AlertTriangle, Check, Info } from 'lucide-react';
import { Button } from './Button';
import { WhyButton, WhyModal } from './WhyModal';
import { calculateEstimatedCredit } from '../lib/credit-calc';
import type { SubmissionDetail, PatchSubmissionBody, GuidelineRef } from '@skem/shared';
import { cn } from '../lib/utils';

export interface MetadataPanelProps {
  submission: SubmissionDetail;
  readOnly?: boolean;
  isSaving?: boolean;
  onSave?: (payload: PatchSubmissionBody) => Promise<void>;
  className?: string;
}

const CATEGORY_OPTIONS = [
  // Komponen 1
  { code: 'K1-01', label: 'K1-01 - PKKMB (Pengenalan Kehidupan Kampus)', komponen: 1 },
  { code: 'K1-02', label: 'K1-02 - OPP (Orientasi Pendidikan & Pelatihan)', komponen: 1 },
  { code: 'K1-03', label: 'K1-03 - LKMM Pra-TD', komponen: 1 },
  { code: 'K1-04', label: 'K1-04 - LKMM TD (Tingkat Dasar)', komponen: 1 },
  { code: 'K1-05', label: 'K1-05 - LKMM TM (Tingkat Menengah)', komponen: 1 },
  { code: 'K1-07', label: 'K1-07 - Pelatihan Karakter / ESQ', komponen: 1 },
  // Komponen 2
  { code: 'K2-A01', label: 'K2-A01 - Kepengurusan BEM / DPM PENS', komponen: 2 },
  { code: 'K2-A02', label: 'K2-A02 - Kepengurusan Himpunan Mahasiswa (HIMA)', komponen: 2 },
  { code: 'K2-B01', label: 'K2-B01 - Kepengurusan Unit Kegiatan Mahasiswa (UKM)', komponen: 2 },
  { code: 'K2-C01', label: 'K2-C01 - Panitia Kegiatan Resmi PENS', komponen: 2 },
  // Komponen 3
  { code: 'K3-A01', label: 'K3-A01 - Pengurus Organisasi / Kepanitiaan Eksternal', komponen: 3 },
  { code: 'K3-B01', label: 'K3-B01 - Prestasi Lomba Karya Ilmiah / Penalaran / Inovasi', komponen: 3 },
  { code: 'K3-B02', label: 'K3-B02 - Prestasi Lomba Seni / Budaya / Desain', komponen: 3 },
  { code: 'K3-B03', label: 'K3-B03 - Prestasi Lomba Olahraga / Minat Bakat', komponen: 3 },
  { code: 'K3-C01', label: 'K3-C01 - Pengabdian Masyarakat / Bakti Sosial', komponen: 3 },
  { code: 'K3-D01', label: 'K3-D01 - Publikasi Ilmiah / Hak Cipta / Paten', komponen: 3 },
  { code: 'K3-E01', label: 'K3-E01 - Pelatihan Keahlian / Sertifikasi Kompetensi', komponen: 3 },
];

const LEVEL_OPTIONS = [
  { value: '', label: '– Tidak Ditentukan / Tanpa Tingkat –' },
  { value: 'Internasional', label: 'Internasional (≥ 3 Negara)' },
  { value: 'Nasional', label: 'Nasional (≥ 3 Provinsi)' },
  { value: 'Regional', label: 'Regional (≥ 3 Kota / 1 Provinsi)' },
  { value: 'Kampus', label: 'Kampus (Lingkungan PENS)' },
  { value: 'Jurusan / Prodi', label: 'Jurusan / Program Studi' },
];

const ROLE_OPTIONS = [
  { value: '', label: '– Tidak Ditentukan –' },
  { value: 'Juara I', label: 'Juara I' },
  { value: 'Juara II', label: 'Juara II' },
  { value: 'Juara III', label: 'Juara III' },
  { value: 'Harapan / Finalis', label: 'Harapan / Finalis' },
  { value: 'Ketua', label: 'Ketua Pelaksana / Koordinator' },
  { value: 'Wakil Ketua', label: 'Wakil Ketua' },
  { value: 'Anggota', label: 'Anggota / Panitia' },
  { value: 'Peserta', label: 'Peserta' },
  { value: 'Peserta Daring', label: 'Peserta Daring' },
];

const ATTACHMENT_TYPES = [
  'Sertifikat',
  'Surat Keputusan (SK)',
  'Piagam Penghargaan',
  'Surat Tugas',
  'Lainnya',
];

export function MetadataPanel({
  submission,
  readOnly = false,
  isSaving = false,
  onSave,
  className,
}: MetadataPanelProps) {
  const isFormLocked = readOnly || submission.status !== 'draft';

  // Modal rujukan aturan
  const [whyModal, setWhyModal] = useState<{
    guidelineRef: GuidelineRef | null;
    title: string;
    explanation?: string;
  } | null>(null);

  // Status feedback simpan
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State: Informasi Kegiatan
  const [prevPublicId, setPrevPublicId] = useState(submission.publicId);
  const [activityName, setActivityName] = useState(submission.activity.activityName ?? '');
  const [activityDate, setActivityDate] = useState(submission.activity.activityDate ?? '');
  const [locationPlatform, setLocationPlatform] = useState(submission.activity.locationPlatform ?? '');
  const [organizer, setOrganizer] = useState(submission.activity.organizer ?? '');
  const [attachmentType, setAttachmentType] = useState(submission.activity.attachmentType ?? '');

  // Form State: Data SKEM
  const [categoryCode, setCategoryCode] = useState(submission.skem.categoryCode || 'K3-B01');
  const [level, setLevel] = useState(submission.skem.level || '');
  const [roleInActivity, setRoleInActivity] = useState(submission.skem.roleInActivity || '');
  const [achievement, setAchievement] = useState(submission.skem.achievement || '');

  // Sinkronisasi jika prop submission berganti
  if (submission.publicId !== prevPublicId) {
    setPrevPublicId(submission.publicId);
    setActivityName(submission.activity.activityName ?? '');
    setActivityDate(submission.activity.activityDate ?? '');
    setLocationPlatform(submission.activity.locationPlatform ?? '');
    setOrganizer(submission.activity.organizer ?? '');
    setAttachmentType(submission.activity.attachmentType ?? '');

    setCategoryCode(submission.skem.categoryCode || 'K3-B01');
    setLevel(submission.skem.level || '');
    setRoleInActivity(submission.skem.roleInActivity || '');
    setAchievement(submission.skem.achievement || '');
  }

  // Cek Komponen dari kategori yang dipilih
  const selectedKomponen = useMemo(() => {
    const found = CATEGORY_OPTIONS.find((c) => c.code === categoryCode);
    return found ? found.komponen : submission.skem.komponen || 3;
  }, [categoryCode, submission.skem.komponen]);

  // Hitung estimasi kredit secara deterministik dari tabel kredit
  const calculatedCredit = useMemo(() => {
    return calculateEstimatedCredit({
      komponen: selectedKomponen,
      categoryCode,
      level: level || null,
      role: roleInActivity || null,
    });
  }, [selectedKomponen, categoryCode, level, roleInActivity]);

  // Deteksi perubahan (dirty state)
  const isDirty = useMemo(() => {
    return (
      activityName !== (submission.activity.activityName ?? '') ||
      activityDate !== (submission.activity.activityDate ?? '') ||
      locationPlatform !== (submission.activity.locationPlatform ?? '') ||
      organizer !== (submission.activity.organizer ?? '') ||
      attachmentType !== (submission.activity.attachmentType ?? '') ||
      categoryCode !== (submission.skem.categoryCode || '') ||
      level !== (submission.skem.level || '') ||
      roleInActivity !== (submission.skem.roleInActivity || '') ||
      achievement !== (submission.skem.achievement || '')
    );
  }, [
    activityName,
    activityDate,
    locationPlatform,
    organizer,
    attachmentType,
    categoryCode,
    level,
    roleInActivity,
    achievement,
    submission,
  ]);

  // Handle Reset Form
  const handleReset = () => {
    setActivityName(submission.activity.activityName ?? '');
    setActivityDate(submission.activity.activityDate ?? '');
    setLocationPlatform(submission.activity.locationPlatform ?? '');
    setOrganizer(submission.activity.organizer ?? '');
    setAttachmentType(submission.activity.attachmentType ?? '');

    setCategoryCode(submission.skem.categoryCode || 'K3-B01');
    setLevel(submission.skem.level || '');
    setRoleInActivity(submission.skem.roleInActivity || '');
    setAchievement(submission.skem.achievement || '');
  };

  // Handle Simpan
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormLocked || !onSave) return;

    const payload: PatchSubmissionBody = {
      activity: {
        activityName: activityName || null,
        activityDate: activityDate || null,
        locationPlatform: locationPlatform || null,
        organizer: organizer || null,
        attachmentType: attachmentType || null,
      },
      skem: {
        categoryCode,
        level: level || undefined,
        roleInActivity: roleInActivity || undefined,
        achievement: achievement || undefined,
      },
    };

    await onSave(payload);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Rentang tanggal valid per angkatan
  const angkatanDateGuide = useMemo(() => {
    const angkatan = submission.student.angkatan;
    if (angkatan === 2024) {
      return 'Berdasarkan Pedoman SKEM, untuk angkatan 2024 seluruh kegiatan diakui sejak 1 Januari 2024.';
    }
    if (angkatan >= 2025) {
      return 'Berdasarkan Pedoman SKEM, untuk angkatan 2025 ke atas kegiatan diakui maksimal 1 tahun sebelum tanggal pengajuan.';
    }
    return 'Kegiatan diakui selama masa aktif studi di Politeknik Elektronika Negeri Surabaya.';
  }, [submission.student.angkatan]);

  // Cek apakah ada finding dengan low confidence (< 70%) untuk highlight
  const hasLowConfidence = useMemo(() => {
    return submission.findings.some((f) => f.confidence !== undefined && f.confidence < 0.7);
  }, [submission.findings]);

  return (
    <div className={cn('space-y-6', className)}>
      <form onSubmit={handleSave} className="space-y-6">
        {/* ============================================================== */}
        {/* GRUP 1: IDENTITAS MAHASISWA (TERKUNCI / DARI AKUN)             */}
        {/* ============================================================== */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-slate-200 text-slate-700">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                1. Identitas Mahasiswa
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <Lock className="w-3 h-3 text-slate-500" />
              Terkunci (dari Akun)
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Nama Lengkap</span>
                <span className="font-semibold text-slate-900">{submission.student.name}</span>
              </div>
              <div className="p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block">NRP</span>
                <span className="font-semibold text-slate-900 font-mono">{submission.student.nrp}</span>
              </div>
              <div className="p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Program Studi</span>
                <span className="font-medium text-slate-800">{submission.student.programStudi}</span>
              </div>
              <div className="p-2.5 bg-slate-50/70 rounded border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Departemen & Angkatan</span>
                <span className="font-medium text-slate-800">
                  {submission.student.departemen} &bull; {submission.student.angkatan} ({submission.student.className})
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 italic pt-1">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              Identitas diambil langsung dari akun mahasiswa dan tidak dapat diubah secara manual.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* GRUP 2: INFORMASI KEGIATAN (EDITABLE DRAFT)                     */}
        {/* ============================================================== */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                2. Informasi Kegiatan
              </h3>
            </div>
            {isFormLocked && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Hanya Baca
              </span>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Nama Kegiatan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nama Kegiatan <span className="text-red-500">*</span>
                </label>
                <WhyButton
                  onClick={() =>
                    setWhyModal({
                      guidelineRef: {
                        id: 'istilah-bukti-kegiatan',
                        title: 'Nama Kegiatan & Bukti',
                        ref: 'Pedoman SKEM, B. Ketentuan Umum, Istilah dan Definisi poin 5, hlm. 9',
                      },
                      title: 'Ketentuan Nama Kegiatan',
                      explanation:
                        'Nama kegiatan harus sesuai dengan yang tertulis pada sertifikat atau surat keputusan yang dilampirkan.',
                    })
                  }
                />
              </div>
              <input
                type="text"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                disabled={isFormLocked}
                required
                className={cn(
                  'w-full px-3 py-2 text-xs rounded border transition-colors',
                  isFormLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                )}
                placeholder="Contoh: Lomba Desain Poster Nasional 2026"
              />
            </div>

            {/* Tanggal Kegiatan & Rentang Valid */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Tanggal Selesai Kegiatan <span className="text-red-500">*</span>
                </label>
                <WhyButton
                  onClick={() =>
                    setWhyModal({
                      guidelineRef: {
                        id: 'ketentuan-umum-satu-kali',
                        title: 'Masa Berlaku Kegiatan',
                        ref: 'Pedoman SKEM, B. Ketentuan Umum SKEM poin 6, hlm. 10',
                      },
                      title: 'Aturan Masa Berlaku Kegiatan',
                      explanation: angkatanDateGuide,
                    })
                  }
                />
              </div>
              <input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                disabled={isFormLocked}
                required
                className={cn(
                  'w-full px-3 py-2 text-xs rounded border transition-colors',
                  isFormLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                )}
              />
              <div className="mt-1.5 p-2 bg-brand-blue-50/50 rounded border border-brand-blue-100 flex items-start gap-1.5 text-[11px] text-brand-blue-800">
                <Info className="w-3.5 h-3.5 shrink-0 text-brand-blue mt-0.5" />
                <span>{angkatanDateGuide}</span>
              </div>
            </div>

            {/* Lokasi & Penyelenggara */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Lokasi / Platform
                </label>
                <input
                  type="text"
                  value={locationPlatform}
                  onChange={(e) => setLocationPlatform(e.target.value)}
                  disabled={isFormLocked}
                  className={cn(
                    'w-full px-3 py-2 text-xs rounded border transition-colors',
                    isFormLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                  )}
                  placeholder="Contoh: Surabaya / Daring (Zoom)"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Penyelenggara
                </label>
                <input
                  type="text"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  disabled={isFormLocked}
                  className={cn(
                    'w-full px-3 py-2 text-xs rounded border transition-colors',
                    isFormLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                  )}
                  placeholder="Contoh: BEM PENS / Kemendikbudristek"
                />
              </div>
            </div>

            {/* Jenis Lampiran */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Jenis Lampiran Dokumen
              </label>
              <select
                value={attachmentType}
                onChange={(e) => setAttachmentType(e.target.value)}
                disabled={isFormLocked}
                className={cn(
                  'w-full px-3 py-2 text-xs rounded border transition-colors',
                  isFormLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                )}
              >
                {ATTACHMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* GRUP 3: DATA SKEM (UNTUK VERIFIKATOR, TIDAK TERCETAK)          */}
        {/* ============================================================== */}
        <div
          className={cn(
            'bg-white rounded-lg border overflow-hidden shadow-xs transition-colors',
            hasLowConfidence ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
          )}
        >
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">
                3. Klasifikasi Data SKEM
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {hasLowConfidence && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  Perlu Tinjauan
                </span>
              )}
              <span className="text-[10px] text-slate-500 italic hidden sm:inline">
                (Tidak tercetak di formulir resmi)
              </span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Kategori Kegiatan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Kategori Kegiatan
                </label>
                <WhyButton
                  onClick={() =>
                    setWhyModal({
                      guidelineRef: {
                        id: 'ketentuan-umum-bobot',
                        title: 'Kategori Kegiatan SKEM',
                        ref: 'Pedoman SKEM, Lampiran Daftar Kegiatan SKEM PENS, hlm. 25–28',
                      },
                      title: 'Ketentuan Kategori Kegiatan',
                      explanation:
                        'Kegiatan dibagi ke dalam 3 komponen: Komponen 1 (Wajib Dasar), Komponen 2 (Organisasi/Institusi), dan Komponen 3 (Prestasi, Bakat & Keprofesian).',
                    })
                  }
                />
              </div>
              <select
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value)}
                disabled={isFormLocked}
                className={cn(
                  'w-full px-3 py-2 text-xs rounded border transition-colors',
                  isFormLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                )}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tingkat & Peran */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tingkat Kegiatan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tingkat Kegiatan
                  </label>
                  <WhyButton
                    onClick={() =>
                      setWhyModal({
                        guidelineRef: {
                          id: 'istilah-tingkat-kegiatan',
                          title: 'Tingkat Kegiatan',
                          ref: 'Pedoman SKEM, B. Ketentuan Umum, Istilah dan Definisi poin 12, hlm. 10',
                        },
                        title: 'Ketentuan Skala & Tingkat Kegiatan',
                        explanation:
                          'Tingkat kegiatan ditentukan berdasarkan cakupan peserta (bukan lokasi penyelenggara):\n• Internasional: ≥ 3 negara\n• Nasional: ≥ 3 provinsi\n• Regional: ≥ 3 kota / 1 provinsi\n• Kampus: lingkungan internal PENS.',
                      })
                    }
                  />
                </div>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  disabled={isFormLocked}
                  className={cn(
                    'w-full px-3 py-2 text-xs rounded border transition-colors',
                    isFormLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                  )}
                >
                  {LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Peran / Jabatan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Peran / Jabatan
                  </label>
                  <WhyButton
                    onClick={() =>
                      setWhyModal({
                        guidelineRef: {
                          id: 'ketentuan-umum-bobot',
                          title: 'Peran & Prestasi',
                          ref: 'Pedoman SKEM, B. Ketentuan Umum SKEM poin 5, hlm. 10',
                        },
                        title: 'Ketentuan Peran Mahasiswa',
                        explanation:
                          'Peran atau prestasi menentukan besaran bobot kredit sesuai tabel Lampiran Pedoman SKEM.',
                      })
                    }
                  />
                </div>
                <select
                  value={roleInActivity}
                  onChange={(e) => setRoleInActivity(e.target.value)}
                  disabled={isFormLocked}
                  className={cn(
                    'w-full px-3 py-2 text-xs rounded border transition-colors',
                    isFormLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                  )}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Capaian / Catatan Khusus */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Capaian / Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                disabled={isFormLocked}
                className={cn(
                  'w-full px-3 py-2 text-xs rounded border transition-colors',
                  isFormLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                    : 'border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-blue focus:border-brand-blue'
                )}
                placeholder="Contoh: Juara II Kategori Desain Web"
              />
            </div>

            {/* BOX ESTIMASI KREDIT DARI TABEL */}
            <div className="pt-2">
              {calculatedCredit.found && calculatedCredit.credit !== null ? (
                <div className="p-3.5 bg-emerald-50/80 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 block">
                      Estimasi Kredit SKEM
                    </span>
                    <span className="text-xs text-emerald-700">
                      Berdasarkan Tabel Bobot Pedoman SKEM
                    </span>
                    {calculatedCredit.ref && (
                      <span className="block text-[10px] text-emerald-600/90 font-mono mt-0.5">
                        {calculatedCredit.ref}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold font-serif text-emerald-800">
                      {calculatedCredit.credit.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 ml-1">Poin</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-semibold block mb-0.5 text-amber-950">
                      Kombinasi Tidak Ada di Tabel Bobot
                    </span>
                    {calculatedCredit.reason ||
                      'Kombinasi kategori, tingkat, dan peran ini tidak ditemukan pada tabel bobot SKEM. Pengajuan ini akan diarahkan ke Unit Kemahasiswaan.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TOMBOL AKSI SIMPAN / BATAL (HANYA AKTIF SAAT DRAFT)            */}
        {/* ============================================================== */}
        {!isFormLocked && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 animate-fade-in">
                  <Check className="w-4 h-4" />
                  Perubahan tersimpan
                </span>
              )}

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!isDirty || isSaving}
                className="flex items-center gap-1.5 min-w-[8rem]"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Modal Kenapa? */}
      {whyModal && (
        <WhyModal
          isOpen={true}
          onClose={() => setWhyModal(null)}
          guidelineRef={whyModal.guidelineRef}
          title={whyModal.title}
          explanation={whyModal.explanation}
        />
      )}
    </div>
  );
}
