import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { extractText, getDocumentProxy } from 'unpdf';
import { describe, expect, it } from 'vitest';

import { buildFinalForm, formatCalendarDate, formatEventDate } from '../src/pdf/final-form';
import type { FinalFormInput } from '../src/pdf/final-form';

const fixture = resolve(__dirname, '../../../data/testset/cases/c001_juara2_lomba_desain.pdf');

async function png(): Promise<Uint8Array> {
  return new Uint8Array(await sharp({ create: { width: 300, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer());
}

async function input(overrides: Partial<FinalFormInput> = {}): Promise<FinalFormInput> {
  return {
    student: { name: 'Budi Santoso', nrp: '3124500001', programStudi: 'D3 Teknik Informatika', departemen: 'Teknik Informatika dan Komputer' },
    activity: {
      activityName: 'Lomba Desain Poster Nasional',
      activityDate: '2026-05-15',
      locationPlatform: 'Online',
      organizer: 'Himpunan Mahasiswa',
      attachmentType: 'Sertifikat',
    },
    verifier: { name: 'Dr. Contoh Dosen Wali', jabatan: 'Dosen Wali Kelas 2 D3 IT B', approvedAt: new Date('2026-10-09T18:30:00Z') },
    submittedAt: new Date('2026-10-08T03:00:00Z'),
    studentSignature: await png(),
    verifierSignature: await png(),
    certificate: new Uint8Array(await readFile(fixture)),
    ...overrides,
  };
}

async function textOf(bytes: Uint8Array): Promise<string[]> {
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: false });
  return text;
}

describe('buildFinalForm', () => {
  it('builds page 1 with sections I-IV plus one attachment page per certificate page', async () => {
    const certificate = new Uint8Array(await readFile(fixture));
    const certificatePages = (await PDFDocument.load(certificate)).getPageCount();
    const bytes = await buildFinalForm(await input());
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1 + certificatePages);
    const [first, second] = await textOf(bytes);
    for (const expected of ['I. Identitas Mahasiswa', 'II. Informasi Kegiatan', 'III. Verifikasi', 'IV. Pernyataan Mahasiswa', 'Budi Santoso', '3124500001', 'Lomba Desain Poster Nasional', '15 Mei 2026', 'Dr. Contoh Dosen Wali', 'Disetujui', 'Terlampir', 'FM.MHS.PENGAJUANSKEM']) {
      expect(first).toContain(expected);
    }
    expect(first).toContain(`Halaman: 1 dari ${1 + certificatePages}`);
    expect(second).toContain('Lampiran Bukti Kegiatan');
  });

  it('embeds both signatures as images on page 1', async () => {
    const bytes = await buildFinalForm(await input());
    const raw = Buffer.from(bytes).toString('latin1');
    expect(raw.match(/\/Subtype \/Image/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('does not print category, level, role, achievement or credit', async () => {
    const [first] = await textOf(await buildFinalForm(await input()));
    for (const forbidden of ['Kategori', 'Tingkat', 'Peran', 'Capaian', 'Estimasi', 'Kredit Final', 'Kredit:']) expect(first).not.toContain(forbidden);
    expect(first).not.toMatch(/\b\d\.\d{2}\b/);
  });

  it('survives non-WinAnsi characters and very long values', async () => {
    const bytes = await buildFinalForm(await input({
      student: { name: 'Budi Ṡantoso 测试', nrp: '3124500001', programStudi: null, departemen: null },
      activity: { activityName: 'Seminar '.repeat(80), activityDate: '2026-05-15', locationPlatform: null, organizer: null, attachmentType: null },
    }));
    const [first] = await textOf(bytes);
    expect(first).toContain('Budi ?antoso ??');
    expect(first).toContain('…');
  });

  it('rejects a signature that is not a PNG and a certificate that is not a PDF', async () => {
    await expect(buildFinalForm(await input({ studentSignature: new Uint8Array([1, 2, 3]) }))).rejects.toThrow();
    await expect(buildFinalForm(await input({ certificate: new TextEncoder().encode('not a pdf') }))).rejects.toThrow();
  });

  it('formats calendar dates without timezone drift and event dates in Asia/Jakarta', () => {
    expect(formatCalendarDate('2026-01-01')).toBe('1 Januari 2026');
    expect(formatEventDate(new Date('2026-10-09T18:30:00Z'))).toBe('10 Oktober 2026');
  });
});
