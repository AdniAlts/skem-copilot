import type { CheckDeadlineResult, Rules } from '@skem/shared';

export type CheckDeadlineInput = {
  /** Tanggal selesai kegiatan, YYYY-MM-DD. */
  activityEndDate: string;
  angkatan: number;
  /** Tanggal pengajuan/pemeriksaan, YYYY-MM-DD (jangan pakai Date.now di dalam fungsi). */
  today: string;
};

type DateRules = Rules['dateRules'];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

type DateParts = { year: number; month: number; day: number };

function parseIsoDate(value: string): DateParts {
  const match = ISO_DATE.exec(value);
  if (!match) throw new Error(`Invalid date (expected YYYY-MM-DD): ${value}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  if (roundTrip.getUTCMonth() !== month - 1 || roundTrip.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  return { year, month, day };
}

function toIso({ year, month, day }: DateParts): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Tanggal yang sama N tahun sebelumnya; 29 Feb → 28 Feb jika tahun tujuan bukan kabisat. */
function minusYears(date: DateParts, years: number): string {
  const year = date.year - years;
  const day = date.month === 2 && date.day === 29 && !isLeapYear(year) ? 28 : date.day;
  return toIso({ year, month: date.month, day });
}

export function formatDateId(value: string): string {
  const { year, month, day } = parseIsoDate(value);
  return `${day} ${MONTHS_ID[month - 1]} ${year}`;
}

/**
 * Tool `check_deadline` (ARCHITECTURE §8), memakai tanggal SELESAI kegiatan:
 * - angkatan < minAngkatan → fail (SKEM belum berlaku).
 * - angkatan pertama (2024) → sah sejak angkatan2024MinDate; angkatan berikutnya → jendela N tahun.
 * - tanggal di masa depan atau di luar rentang → fail.
 * - di dalam rentang tetapi sebelum perkiraan awal masa studi → warn (Ketentuan Umum SKEM poin 8).
 */
export function checkDeadline(input: CheckDeadlineInput, rules: DateRules): CheckDeadlineResult {
  const end = toIso(parseIsoDate(input.activityEndDate));
  const today = parseIsoDate(input.today);
  const validTo = toIso(today);

  if (input.angkatan < rules.minAngkatan) {
    return {
      result: 'fail',
      validFrom: null,
      validTo: null,
      message: `SKEM berlaku untuk angkatan ${rules.minAngkatan} dan setelahnya.`,
    };
  }

  const validFrom =
    input.angkatan === rules.minAngkatan
      ? rules.angkatan2024MinDate
      : minusYears(today, rules.angkatan2025PlusWindowYears);
  const range = `${formatDateId(validFrom)} – ${formatDateId(validTo)}`;

  if (end > validTo) {
    return {
      result: 'fail',
      validFrom,
      validTo,
      message: `Tanggal kegiatan ${formatDateId(end)} belum terjadi (setelah tanggal pengajuan ${formatDateId(validTo)}).`,
    };
  }
  if (end < validFrom) {
    return {
      result: 'fail',
      validFrom,
      validTo,
      message: `Tanggal kegiatan ${formatDateId(end)} di luar rentang yang berlaku untuk angkatan ${input.angkatan} (${range}).`,
    };
  }

  const studyStart = `${input.angkatan}-${rules.studyStartMonthDay}`;
  if (end < studyStart) {
    return {
      result: 'warn',
      validFrom,
      validTo,
      message: `Tanggal kegiatan ${formatDateId(end)} sebelum perkiraan awal masa studi angkatan ${input.angkatan} (${formatDateId(studyStart)}). SKEM hanya mengakui kegiatan selama masa studi aktif; Verifikator akan memeriksa.`,
    };
  }

  return {
    result: 'pass',
    validFrom,
    validTo,
    message: `Tanggal kegiatan ${formatDateId(end)} dalam rentang yang berlaku (${range}).`,
  };
}
