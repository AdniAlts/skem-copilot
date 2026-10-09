/**
 * Guard akses pengajuan (ARCHITECTURE §10):
 * pemilik / verifier dengan class_id sama / validator / unit (baca-saja).
 *
 * Akses ditolak ke kelas lain → 404 (bukan 403) agar tidak membocorkan
 * keberadaan pengajuan.
 */

import type { Request, Response, NextFunction } from 'express';

import { AppError } from './error.js';

/** Muat submission by publicId lalu cek akses req.sessionUser. */
export function loadSubmissionWithAccess(
  findByPublicId: (
    publicId: string,
  ) => Promise<{ id: number; studentId: number; classId: number } | null>,
  publicIdFrom: (req: Request) => string,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    try {
      const user = req.sessionUser;
      if (!user) throw new AppError('UNAUTHENTICATED', 'Belum masuk.');

      const submission = await findByPublicId(publicIdFrom(req));
      if (!submission) throw new AppError('NOT_FOUND', 'Tidak ditemukan.');

      const allowed =
        user.role === 'validator' ||
        user.role === 'unit' ||
        (user.role === 'verifier' && user.classId === submission.classId) ||
        (user.role === 'student' && user.id === submission.studentId);
      if (!allowed) {
        // Kelas lain / bukan pemilik: 404, bukan 403
        throw new AppError('NOT_FOUND', 'Tidak ditemukan.');
      }

      res.locals.submission = submission;
      next();
    } catch (err) {
      next(err);
    }
  };
}
