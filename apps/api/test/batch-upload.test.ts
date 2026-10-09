/** Pure upload validation tests; no DB, Storage, or gateway calls. */

import { describe, expect, it } from 'vitest';
import { AppError } from '../src/middleware/error';
import { validateBatchFiles, validatePdfFile } from '../src/services/batch-upload';

function file(name: string, content: Buffer, size = content.length) {
  return { fieldname: 'files', originalname: name, encoding: '7bit', mimetype: 'application/pdf', size, destination: '', filename: name, path: '', buffer: content, stream: undefined } as never;
}

describe('batch upload validation', () => {
  it('accepts PDF magic bytes and calculates SHA-256', () => {
    const result = validatePdfFile(file('certificate.pdf', Buffer.from('%PDF-1.7 test')));
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects a non-PDF despite PDF MIME', () => {
    expect(() => validatePdfFile(file('fake.pdf', Buffer.from('not a pdf')))).toThrowError(AppError);
    expect(() => validatePdfFile(file('fake.pdf', Buffer.from('not a pdf')))).toThrow('bukan PDF');
  });

  it('rejects more than ten files before processing', () => {
    const files = Array.from({ length: 11 }, (_, index) => file(`${index}.pdf`, Buffer.from('%PDF')));
    expect(() => validateBatchFiles(files)).toThrow('Maksimal 10 file');
  });

  it('rejects a file above 10 MB', () => {
    expect(() => validatePdfFile(file('large.pdf', Buffer.from('%PDF'), 10 * 1024 * 1024 + 1))).toThrow('melebihi batas 10 MB');
  });

  it('rejects missing file', () => {
    expect(() => validatePdfFile(undefined)).toThrow('wajib diunggah');
  });
});
