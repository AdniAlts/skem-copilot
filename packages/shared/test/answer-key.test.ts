import { describe, expect, it } from 'vitest';
import creditTableJson from '../../../data/credit_table.json';
import answerKeyJson from '../../../data/testset/answer_key.json';
import { AnswerKeySchema, CreditTableSchema } from '../src/index.js';

describe('data/testset/answer_key.json', () => {
  const answerKey = AnswerKeySchema.parse(answerKeyJson);
  const creditTable = CreditTableSchema.parse(creditTableJson);
  const creditMap = new Map(creditTable.entries.map((e) => [e.id, e]));

  it('memvalidasi seluruh data sesuai AnswerKeySchema', () => {
    expect(answerKey.cases.length).toBeGreaterThanOrEqual(10);
  });

  it('memastikan setiap id kasus unik', () => {
    const ids = answerKey.cases.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('memastikan format path file kasus konsisten berakhiran .pdf di folder cases/', () => {
    for (const testCase of answerKey.cases) {
      expect(testCase.file.startsWith('cases/')).toBe(true);
      expect(testCase.file.endsWith('.pdf')).toBe(true);
    }
  });

  it('memenuhi syarat pembagian data: >= 30% heldout', () => {
    const total = answerKey.cases.length;
    const heldoutCount = answerKey.cases.filter((c) => c.split === 'heldout').length;
    const ratio = heldoutCount / total;
    expect(ratio).toBeGreaterThanOrEqual(0.3);
  });

  it('setiap credit_entry_id yang terisi valid dan cocok dengan data/credit_table.json', () => {
    for (const testCase of answerKey.cases) {
      const { credit_entry_id, category_code, level, role } = testCase.expected;
      if (credit_entry_id !== '') {
        const entry = creditMap.get(credit_entry_id);
        expect(
          entry,
          `credit_entry_id tidak ditemukan di credit_table.json: ${credit_entry_id}`,
        ).toBeDefined();

        if (entry) {
          expect(entry.categoryCode).toBe(category_code);
          if (level !== '') {
            expect(entry.level).toBe(level);
          } else {
            expect(entry.level).toBeNull();
          }
          if (role !== '') {
            expect(entry.role).toBe(role);
          } else {
            expect(entry.role).toBeNull();
          }
        }
      }
    }
  });

  it('mencakup skenario demo utama (c001: Juara II Lomba Desain dengan pertanyaan klarifikasi)', () => {
    const c001 = answerKey.cases.find((c) => c.id === 'c001');
    expect(c001).toBeDefined();
    expect(c001?.expected.review_status_before_answer).toBe('needs_fix');
    expect(c001?.expected.review_status).toBe('ready');
    expect(c001?.expected.credit_entry_id).toBe('K3-B01-NAS-JUARA2');
    expect(c001?.answers.level).toBeDefined();
  });

  it('mencakup variasi skenario yang disyaratkan issue T-01', () => {
    const cases = answerKey.cases;

    // Nama orang lain
    const namaOrangLain = cases.find((c) => c.expected.errors.includes('name_mismatch'));
    expect(namaOrangLain).toBeDefined();
    expect(namaOrangLain?.expected.review_status).toBe('problem');

    // Tanggal kadaluarsa
    const tanggalKadaluarsa = cases.find((c) => c.expected.errors.includes('deadline'));
    expect(tanggalKadaluarsa).toBeDefined();
    expect(tanggalKadaluarsa?.expected.review_status).toBe('problem');

    // Kombinasi tidak ada di tabel
    const tidakAdaDiTabel = cases.find((c) => c.expected.errors.includes('credit'));
    expect(tidakAdaDiTabel).toBeDefined();
    expect(tidakAdaDiTabel?.expected.review_status).toBe('needs_fix');
    expect(tidakAdaDiTabel?.expected.credit_entry_id).toBe('');

    // Dokumen bukan sertifikat
    const bukanSertifikat = cases.find((c) => c.expected.errors.includes('category'));
    expect(bukanSertifikat).toBeDefined();
    expect(bukanSertifikat?.expected.review_status).toBe('problem');

    // Kasus valid tanpa error
    const kasusValid = cases.filter(
      (c) => c.expected.errors.length === 0 && c.expected.review_status === 'ready',
    );
    expect(kasusValid.length).toBeGreaterThan(0);
  });

  it('mencakup komponen K1, K2, dan bidang K3 (A, B, C, D)', () => {
    const categories = new Set(
      answerKey.cases.map((c) => c.expected.category_code).filter(Boolean),
    );
    const hasK1 = Array.from(categories).some((c) => c.startsWith('K1-'));
    const hasK2 = Array.from(categories).some((c) => c.startsWith('K2-'));
    const hasK3A = Array.from(categories).some((c) => c.startsWith('K3-A'));
    const hasK3B = Array.from(categories).some((c) => c.startsWith('K3-B'));
    const hasK3C = Array.from(categories).some((c) => c.startsWith('K3-C'));
    const hasK3D = Array.from(categories).some((c) => c.startsWith('K3-D'));

    expect(hasK1).toBe(true);
    expect(hasK2).toBe(true);
    expect(hasK3A).toBe(true);
    expect(hasK3B).toBe(true);
    expect(hasK3C).toBe(true);
    expect(hasK3D).toBe(true);
  });
});
