/**
 * GET /me — profil + kelas + dosen wali + hasSignature + telegramLinked
 * (skema MeSchema di @skem/shared).
 * PUT /me/signature — unggah atau simpan tanda tangan digital
 * GET /me/signature — unduh berkas tanda tangan privat milik sendiri
 */

import { eq } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';

import { MeSchema } from '@skem/shared';

import { createDb } from '../db/client';
import { classes, users } from '../db/schema';
import { asyncHandler, AppError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { bucketSignatures, uploadObject, downloadObject } from '../services/storage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 1024 * 1024 }, // max 1 MB
});

export const meRouter = Router();

meRouter.get(
  '/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          nrp: users.nrp,
          role: users.role,
          angkatan: users.angkatan,
          programStudi: users.programStudi,
          departemen: users.departemen,
          classId: users.classId,
          signaturePath: users.signaturePath,
          telegramChatId: users.telegramChatId,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      const u = rows[0];
      if (!u) {
        // Sesi menunjuk user yang sudah tidak ada — cookie basi
        res.clearCookie('skem_session', { path: '/' });
        res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sesi tidak valid.' } });
        return;
      }

      // Kelas + dosen wali (verifikator advisor kelas)
      let className: string | null = null;
      let verifierName: string | null = null;
      if (u.classId) {
        const classRows = await db
          .select({ name: classes.name, advisorId: classes.advisorId })
          .from(classes)
          .where(eq(classes.id, u.classId))
          .limit(1);
        const c = classRows[0];
        if (c) {
          className = c.name;
          if (c.advisorId) {
            const advisorRows = await db
              .select({ name: users.name })
              .from(users)
              .where(eq(users.id, c.advisorId))
              .limit(1);
            verifierName = advisorRows[0]?.name ?? null;
          }
        }
      }

      // jabatan hanya relevan untuk verifier/validator/unit
      let jabatan: string | null = null;
      if (u.role !== 'student') {
        const jabRows = await db
          .select({ jabatan: users.jabatan })
          .from(users)
          .where(eq(users.id, u.id))
          .limit(1);
        jabatan = jabRows[0]?.jabatan ?? null;
      }

      const body = MeSchema.parse({
        id: u.id,
        name: u.name,
        nrp: u.nrp,
        role: u.role,
        angkatan: u.angkatan,
        programStudi: u.programStudi,
        departemen: u.departemen,
        className,
        verifierName,
        jabatan,
        hasSignature: u.signaturePath !== null,
        telegramLinked: u.telegramChatId !== null,
      });
      res.json(body);
    } finally {
      await client.end();
    }
  }),
);

/**
 * PUT /me/signature — simpan tanda tangan pengguna (student atau verifier)
 */
meRouter.put(
  '/me/signature',
  requireAuth(),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    if (user.role !== 'student' && user.role !== 'verifier') {
      throw new AppError(
        'FORBIDDEN',
        'Hanya mahasiswa dan verifikator yang memiliki tanda tangan.',
      );
    }

    let buffer: Buffer;

    if (req.file) {
      buffer = req.file.buffer;
    } else if (req.body?.dataUrl && typeof req.body.dataUrl === 'string') {
      const base64Data = req.body.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      throw new AppError(
        'VALIDATION_ERROR',
        'Berkas tanda tangan wajib disertakan (file atau dataUrl).',
      );
    }

    if (buffer.length > 1024 * 1024) {
      throw new AppError('PAYLOAD_TOO_LARGE', 'Ukuran berkas tanda tangan maksimal 1 MB.');
    }

    // Cek magic number PNG: 0x89 0x50 0x4E 0x47
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      throw new AppError('UNSUPPORTED_MEDIA_TYPE', 'Format berkas harus berupa PNG.');
    }

    const { client, db } = createDb();
    try {
      const sigPath = `${user.id}/signature.png`;

      await uploadObject(bucketSignatures(), sigPath, buffer, 'image/png');

      await db.update(users).set({ signaturePath: sigPath }).where(eq(users.id, user.id));

      res.json({ hasSignature: true });
    } finally {
      await client.end();
    }
  }),
);

/**
 * GET /me/signature — unduh tanda tangan privat milik pengguna sendiri
 */
meRouter.get(
  '/me/signature',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    if (user.role !== 'student' && user.role !== 'verifier') {
      throw new AppError(
        'FORBIDDEN',
        'Hanya mahasiswa dan verifikator yang memiliki tanda tangan.',
      );
    }

    const { client, db } = createDb();
    try {
      const rows = await db
        .select({ signaturePath: users.signaturePath })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const sigPath = rows[0]?.signaturePath;
      if (!sigPath) {
        throw new AppError('NOT_FOUND', 'Tanda tangan belum disiapkan.');
      }

      const buffer = await downloadObject(bucketSignatures(), sigPath);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'private, no-cache');
      res.send(buffer);
    } finally {
      await client.end();
    }
  }),
);
