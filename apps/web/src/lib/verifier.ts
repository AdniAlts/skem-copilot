import { RejectBodySchema, type AgentQuestion, type FinalFormStatus } from '@skem/shared';
import { ApiClientError } from '../api/client';

export const DECISION_NOTE_MAX_LENGTH = 1000;

/** Pesan error alasan penolakan (aturan sama dengan API), atau null jika valid. */
export function validateRejectNote(note: string): string | null {
  const result = RejectBodySchema.safeParse({ note });
  return result.success ? null : (result.error.issues[0]?.message ?? 'Alasan tidak valid.');
}

/** Toast setelah Setujui; "formulir final dibuat" hanya jika PDF final memang tersedia. */
export function approvalToastMessage(finalFormStatus: FinalFormStatus): string {
  return finalFormStatus === 'ready'
    ? 'Disetujui dan diteruskan ke Validator. Formulir final telah dibuat.'
    : 'Disetujui dan diteruskan ke Validator.';
}

export type DecisionErrorAction = 'needs_signature' | 'already_decided' | 'not_found' | 'other';

/** Memetakan error API keputusan Verifikator ke tindakan UI. */
export function classifyDecisionError(error: unknown): DecisionErrorAction {
  if (!(error instanceof ApiClientError)) return 'other';
  if (error.code === 'SIGNATURE_REQUIRED') return 'needs_signature';
  if (error.code === 'INVALID_TRANSITION' || error.code === 'CONFLICT') return 'already_decided';
  if (error.status === 404) return 'not_found';
  return 'other';
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

export function formatDateTimeId(iso: string | null): string {
  return iso ? DATE_TIME_FORMAT.format(new Date(iso)) : '—';
}

/** Tanggal kalender (YYYY-MM-DD) atau Date, ditampilkan dalam format Indonesia. */
export function formatDateId(value: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00+07:00`) : value;
  return DATE_FORMAT.format(date);
}

export function formatCredit(credit: number | null): string {
  return credit === null ? '—' : credit.toFixed(2).replace('.', ',');
}

/** Label jawaban mahasiswa atas pertanyaan agent (nilai opsi → label yang dibaca manusia). */
export function answerLabel(question: AgentQuestion): string {
  if (!question.answer) return 'Belum dijawab';
  return (
    question.options.find((option) => option.value === question.answer)?.label ?? question.answer
  );
}
