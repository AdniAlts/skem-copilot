/** Validasi dan metadata file batch sebelum menyentuh Storage/DB. */

import { createHash } from 'node:crypto';
import { AppError } from '../middleware/error.js';

export const MAX_BATCH_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PDF_MAGIC = Buffer.from('%PDF');

export type ValidatedUpload = {
  file: Express.Multer.File;
  sha256: string;
};

export function validatePdfFile(file: Express.Multer.File | undefined): ValidatedUpload {
  if (!file) throw new AppError('VALIDATION_ERROR', 'File PDF wajib diunggah.');
  if (file.size > MAX_FILE_BYTES) {
    throw new AppError('PAYLOAD_TOO_LARGE', `File ${file.originalname} melebihi batas 10 MB.`);
  }
  if (!file.buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE', `File ${file.originalname} bukan PDF yang valid.`);
  }
  return {
    file,
    sha256: createHash('sha256').update(file.buffer).digest('hex'),
  };
}

export function validateBatchFiles(files: Express.Multer.File[] | undefined): ValidatedUpload[] {
  if (!files?.length) {
    throw new AppError('VALIDATION_ERROR', 'Minimal satu file PDF wajib diunggah.');
  }
  if (files.length > MAX_BATCH_FILES) {
    throw new AppError('TOO_MANY_FILES', 'Maksimal 10 file PDF per batch.');
  }
  return files.map(validatePdfFile);
}

export function certificatePath(studentId: number, publicId: string): string {
  return `${studentId}/${publicId}.pdf`;
}

export function fileNameFromPath(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
