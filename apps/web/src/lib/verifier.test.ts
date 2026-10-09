import { describe, expect, it } from 'vitest';
import { ApiClientError } from '../api/client';
import {
  DECISION_NOTE_MAX_LENGTH,
  answerLabel,
  approvalToastMessage,
  classifyDecisionError,
  formatCredit,
  formatDateId,
  validateRejectNote,
} from './verifier';

describe('validateRejectNote', () => {
  it('menolak alasan kosong atau hanya spasi', () => {
    expect(validateRejectNote('')).toBe('Alasan penolakan wajib diisi.');
    expect(validateRejectNote('   ')).toBe('Alasan penolakan wajib diisi.');
  });

  it('menolak alasan yang terlalu panjang', () => {
    expect(validateRejectNote('a'.repeat(DECISION_NOTE_MAX_LENGTH + 1))).not.toBeNull();
  });

  it('menerima alasan yang terisi', () => {
    expect(validateRejectNote('Nama pada sertifikat bukan milik mahasiswa.')).toBeNull();
  });
});

describe('approvalToastMessage', () => {
  it('menyebut formulir final hanya jika PDF final tersedia', () => {
    expect(approvalToastMessage('ready')).toBe(
      'Disetujui dan diteruskan ke Validator. Formulir final telah dibuat.',
    );
    expect(approvalToastMessage('none')).toBe('Disetujui dan diteruskan ke Validator.');
    expect(approvalToastMessage('failed')).toBe('Disetujui dan diteruskan ke Validator.');
  });
});

describe('classifyDecisionError', () => {
  it('memetakan kode error API ke tindakan UI', () => {
    expect(classifyDecisionError(new ApiClientError(409, 'x', 'SIGNATURE_REQUIRED'))).toBe(
      'needs_signature',
    );
    expect(classifyDecisionError(new ApiClientError(409, 'x', 'INVALID_TRANSITION'))).toBe(
      'already_decided',
    );
    expect(classifyDecisionError(new ApiClientError(404, 'x', 'NOT_FOUND'))).toBe('not_found');
    expect(classifyDecisionError(new ApiClientError(500, 'x', 'INTERNAL'))).toBe('other');
    expect(classifyDecisionError(new Error('jaringan'))).toBe('other');
  });
});

describe('format tampilan', () => {
  it('kredit memakai koma desimal', () => {
    expect(formatCredit(1.1)).toBe('1,10');
    expect(formatCredit(null)).toBe('—');
  });

  it('tanggal kalender ditampilkan dalam bahasa Indonesia tanpa geser zona waktu', () => {
    expect(formatDateId('2026-08-20')).toBe('20 Agustus 2026');
    expect(formatDateId(null)).toBe('—');
  });
});

describe('answerLabel', () => {
  const question = {
    id: 1,
    seq: 1,
    field: 'level',
    question: 'Peserta kegiatan ini berasal dari mana?',
    options: [{ value: 'national', label: 'Minimal 3 provinsi di Indonesia' }],
  };

  it('menampilkan label opsi, bukan nilai mentah', () => {
    expect(answerLabel({ ...question, answer: 'national' })).toBe(
      'Minimal 3 provinsi di Indonesia',
    );
  });

  it('belum dijawab atau nilai di luar opsi', () => {
    expect(answerLabel({ ...question, answer: null })).toBe('Belum dijawab');
    expect(answerLabel({ ...question, answer: 'lain' })).toBe('lain');
  });
});
