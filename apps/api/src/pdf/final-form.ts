/**
 * Generator PDF formulir FM.MHS.PENGAJUANSKEM (docs/ui-spec.md §6).
 * Halaman 1: bagian I–IV + tanda tangan Verifikator (III) dan mahasiswa (IV).
 * Halaman 2 dst.: lampiran bukti, tiap halaman sertifikat ditanam utuh dan diskalakan ke A4.
 * Kategori, tingkat, peran, capaian, dan kredit sengaja tidak dicetak.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';

export interface FinalFormInput {
  student: { name: string; nrp: string; programStudi: string | null; departemen: string | null };
  activity: {
    activityName: string;
    activityDate: string;
    locationPlatform: string | null;
    organizer: string | null;
    attachmentType: string | null;
  };
  verifier: { name: string; jabatan: string | null; approvedAt: Date };
  submittedAt: Date;
  studentSignature: Uint8Array;
  verifierSignature: Uint8Array;
  certificate: Uint8Array;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const LABEL_X = MARGIN + 10;
const VALUE_X = MARGIN + 150;
const CONTENT_RIGHT = A4[0] - MARGIN - 10;
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const STATEMENT =
  'Saya menyatakan bahwa data yang saya isi dalam formulir ini adalah benar dan dapat dipertanggungjawabkan. '
  + 'Saya bersedia menerima sanksi akademik sesuai ketentuan yang berlaku di Politeknik Elektronika Negeri Surabaya '
  + 'apabila di kemudian hari terbukti data yang saya isi tidak benar.';

const longDate = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(date);

/** Tanggal kalender `YYYY-MM-DD` diformat tanpa geser zona waktu. */
export function formatCalendarDate(value: string): string {
  return longDate(new Date(`${value}T00:00:00Z`), 'UTC');
}

/** Waktu kejadian diformat menurut zona Surabaya. */
export function formatEventDate(value: Date): string {
  return longDate(value, 'Asia/Jakarta');
}

/** Helvetica hanya mendukung WinAnsi; karakter lain diganti `?` agar pembuatan PDF tidak gagal. */
function safe(font: PDFFont, text: string): string {
  return Array.from(text.replace(/\s+/g, ' ').trim()).map((char) => {
    try {
      font.encodeText(char);
      return char;
    } catch {
      return '?';
    }
  }).join('');
}

/** Bungkus teks ke lebar tertentu; maksimal `maxLines` baris, sisanya dipotong dengan elipsis. */
function wrap(font: PDFFont, size: number, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  const fits = (value: string) => font.widthOfTextAtSize(value, size) <= width;
  for (const word of safe(font, text).split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = '';
    for (const char of word) {
      if (fits(current + char)) current += char;
      else {
        lines.push(current);
        current = char;
      }
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1]!;
  while (last && !fits(`${last}…`)) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

class Cursor {
  y = A4[1] - MARGIN;

  constructor(
    private readonly page: PDFPage,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {}

  text(value: string, x: number, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}): void {
    const font = options.bold ? this.bold : this.regular;
    this.page.drawText(safe(font, value), { x, y: this.y, size: options.size ?? 10, font, color: options.color ?? BLACK });
  }

  section(title: string): void {
    this.y -= 22;
    this.text(title, MARGIN, { size: 11, bold: true });
    this.y -= 5;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: A4[0] - MARGIN, y: this.y }, thickness: 0.75, color: BLACK });
    this.y -= 14;
  }

  row(label: string, value: string | null, maxLines = 3): void {
    this.text(label, LABEL_X);
    this.text(':', VALUE_X);
    const valueX = VALUE_X + this.regular.widthOfTextAtSize(': ', 10);
    const lines = wrap(this.regular, 10, value && value.trim() ? value : '-', CONTENT_RIGHT - valueX, maxLines);
    lines.forEach((line, index) => {
      if (index > 0) this.y -= 13;
      this.text(line, valueX);
    });
    this.y -= 16;
  }

  checkbox(x: number, label: string, checked: boolean): number {
    const size = 9;
    this.page.drawRectangle({ x, y: this.y - 1, width: size, height: size, borderColor: BLACK, borderWidth: 0.75 });
    if (checked) {
      this.page.drawLine({ start: { x: x + 1.5, y: this.y + 0.5 }, end: { x: x + size - 1.5, y: this.y + size - 2.5 }, thickness: 1.2, color: BLACK });
      this.page.drawLine({ start: { x: x + 1.5, y: this.y + size - 2.5 }, end: { x: x + size - 1.5, y: this.y + 0.5 }, thickness: 1.2, color: BLACK });
    }
    this.text(label, x + size + 5);
    return x + size + 5 + this.regular.widthOfTextAtSize(label, 10) + 18;
  }

  image(image: PDFImage, x: number, maxWidth: number, maxHeight: number): void {
    const scaled = image.scaleToFit(maxWidth, maxHeight);
    this.page.drawImage(image, { x, y: this.y - scaled.height, width: scaled.width, height: scaled.height });
    this.y -= maxHeight + 16;
  }
}

function drawHeader(page: PDFPage, regular: PDFFont, bold: PDFFont, pageNumber: number, pageCount: number): number {
  const top = A4[1] - MARGIN;
  const height = 70;
  const width = A4[0] - MARGIN * 2;
  const split = MARGIN + width * 0.62;
  page.drawRectangle({ x: MARGIN, y: top - height, width, height, borderColor: BLACK, borderWidth: 1.2 });
  page.drawLine({ start: { x: split, y: top }, end: { x: split, y: top - height }, thickness: 1, color: BLACK });
  page.drawText('POLITEKNIK ELEKTRONIKA NEGERI SURABAYA', { x: MARGIN + 10, y: top - 20, size: 8, font: bold, color: GRAY });
  page.drawText('Satuan Kredit Ekstrakurikuler Mahasiswa (SKEM)', { x: MARGIN + 10, y: top - 38, size: 11, font: bold });
  page.drawText('Formulir Kegiatan SKEM', { x: MARGIN + 10, y: top - 54, size: 10, font: regular });
  const meta = [
    'No. Identifikasi: FM.MHS.PENGAJUANSKEM',
    'No. Revisi: 00',
    'Tanggal Terbit: 02 Juni 2026',
    `Halaman: ${pageNumber} dari ${pageCount}`,
  ];
  meta.forEach((line, index) => {
    page.drawText(line, { x: split + 6, y: top - 16 - index * 14, size: 7.5, font: regular });
  });
  return top - height;
}

/** Bangun PDF final. Melempar jika tanda tangan bukan PNG atau sertifikat tidak dapat dibaca. */
export async function buildFinalForm(input: FinalFormInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('FM.MHS.PENGAJUANSKEM');
  pdf.setProducer('SKEM AI Co-Pilot');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const studentSignature = await pdf.embedPng(input.studentSignature);
  const verifierSignature = await pdf.embedPng(input.verifierSignature);
  const certificate = await PDFDocument.load(input.certificate);
  const attachments = await pdf.embedPages(certificate.getPages());
  const pageCount = 1 + attachments.length;

  const page = pdf.addPage(A4);
  const cursor = new Cursor(page, regular, bold);
  cursor.y = drawHeader(page, regular, bold, 1, pageCount) - 4;

  cursor.section('I. Identitas Mahasiswa');
  cursor.row('Nama Lengkap', input.student.name);
  cursor.row('NRP', input.student.nrp);
  cursor.row('Program Studi', input.student.programStudi);
  cursor.row('Departemen', input.student.departemen);

  cursor.section('II. Informasi Kegiatan');
  cursor.row('Nama Kegiatan', input.activity.activityName);
  cursor.row('Tanggal Kegiatan', formatCalendarDate(input.activity.activityDate));
  cursor.row('Lokasi / Platform', input.activity.locationPlatform);
  cursor.row('Penyelenggara', input.activity.organizer);
  cursor.row('Jenis Lampiran', input.activity.attachmentType);
  cursor.row('Bukti Kegiatan', 'Terlampir');

  cursor.section('III. Verifikasi');
  cursor.row('Nama Verifikator', input.verifier.name);
  cursor.row('Jabatan', input.verifier.jabatan);
  cursor.row('Tanggal Verifikasi', formatEventDate(input.verifier.approvedAt));
  cursor.text('Keputusan', LABEL_X);
  cursor.text(':', VALUE_X);
  cursor.checkbox(cursor.checkbox(VALUE_X + 10, 'Disetujui', true), 'Ditolak', false);
  cursor.y -= 18;
  cursor.text('Tanda Tangan', LABEL_X);
  cursor.text(':', VALUE_X);
  cursor.y += 8;
  cursor.image(verifierSignature, VALUE_X + 10, 150, 50);

  cursor.section('IV. Pernyataan Mahasiswa');
  for (const line of wrap(regular, 9.5, STATEMENT, A4[0] - MARGIN * 2 - 20, 6)) {
    cursor.text(line, LABEL_X, { size: 9.5 });
    cursor.y -= 13;
  }
  const signatureX = A4[0] - MARGIN - 190;
  cursor.y -= 8;
  cursor.text(`Surabaya, ${formatEventDate(input.submittedAt)}`, signatureX);
  cursor.y -= 6;
  cursor.image(studentSignature, signatureX, 150, 50);
  cursor.text(input.student.name, signatureX, { bold: true });
  cursor.y -= 13;
  cursor.text(`NRP. ${input.student.nrp}`, signatureX);

  page.drawText(
    safe(regular, 'Dokumen dibuat otomatis oleh SKEM AI Co-Pilot. Tanda tangan elektronik simulasi, bukan tanda tangan tersertifikasi.'),
    { x: MARGIN, y: MARGIN - 20, size: 7, font: regular, color: GRAY },
  );

  attachments.forEach((attachment, index) => {
    const attachmentPage = pdf.addPage(A4);
    const headerBottom = drawHeader(attachmentPage, regular, bold, index + 2, pageCount);
    const title = attachments.length > 1
      ? `Lampiran Bukti Kegiatan (${index + 1}/${attachments.length})`
      : 'Lampiran Bukti Kegiatan';
    attachmentPage.drawText(title, { x: MARGIN, y: headerBottom - 22, size: 11, font: bold });
    const boxTop = headerBottom - 34;
    const boxWidth = A4[0] - MARGIN * 2;
    const boxHeight = boxTop - MARGIN;
    const scale = Math.min(boxWidth / attachment.width, boxHeight / attachment.height);
    const width = attachment.width * scale;
    const height = attachment.height * scale;
    attachmentPage.drawPage(attachment, { x: MARGIN + (boxWidth - width) / 2, y: boxTop - height, width, height });
  });

  return pdf.save();
}
