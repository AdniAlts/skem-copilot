/**
 * GET /me — profil + kelas + dosen wali + hasSignature + telegramLinked
 * (skema MeSchema di @skem/shared).
 * PUT /me/signature — unggah atau simpan tanda tangan digital
 * GET /me/signature — unduh berkas tanda tangan privat milik sendiri
 * GET /me/progress — progres kredit SKEM yang sudah disetujui
 */

import { eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';

import { MeSchema, ProgressSchema, SignatureBodySchema, SignatureResponseSchema } from '@skem/shared';

import { createDb } from '../db/client';
import { classes, submissions, users } from '../db/schema';
import { AppError, asyncHandler } from '../middleware/error';
import { requireAuth, requireRole } from '../middleware/auth';
import { bucketSignatures, downloadObject, uploadObject } from '../services/storage.js';

export const meRouter = Router();

const signatureUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 1024 * 1024 } });
const SIGNATURE_PATH = (userId: number): string => `users/${userId}/signature.png`;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

meRouter.put(
  '/me/signature',
  requireAuth(),
  requireRole('student', 'verifier'),
  signatureUpload.single('file'),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    let image: Buffer;
    if (req.file) {
      if (req.file.mimetype !== 'image/png') throw new AppError('VALIDATION_ERROR', 'Tanda tangan harus berupa PNG.');
      image = req.file.buffer;
    } else {
      const parsed = SignatureBodySchema.safeParse(req.body);
      if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Kirim PNG sebagai file atau dataUrl.');
      const prefix = 'data:image/png;base64,';
      const encoded = parsed.data.dataUrl.slice(prefix.length);
      if (parsed.data.dataUrl.length > prefix.length + Math.ceil((1024 * 1024) / 3) * 4) {
        throw new AppError('PAYLOAD_TOO_LARGE', 'Ukuran tanda tangan melebihi 1 MB.');
      }
      image = Buffer.from(encoded, 'base64');
      if (image.toString('base64') !== encoded) throw new AppError('VALIDATION_ERROR', 'Data tanda tangan bukan base64 PNG yang valid.');
    }
    if (image.length > 1024 * 1024) throw new AppError('PAYLOAD_TOO_LARGE', 'Ukuran tanda tangan melebihi 1 MB.');
    if (image.length < PNG_SIGNATURE.length || !image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      throw new AppError('VALIDATION_ERROR', 'Tanda tangan bukan PNG yang valid.');
    }
    try {
      const metadata = await sharp(image, { limitInputPixels: 20_000_000 }).metadata();
      if (metadata.format !== 'png') throw new Error('invalid image');
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Tanda tangan bukan PNG yang valid.');
    }

    const path = SIGNATURE_PATH(user.id);
    const { client, db } = createDb();
    try {
      await uploadObject(bucketSignatures(), path, image, 'image/png');
      await db.update(users).set({ signaturePath: path }).where(eq(users.id, user.id));
      res.json(SignatureResponseSchema.parse({ hasSignature: true }));
    } finally {
      await client.end();
    }
  }),
);

meRouter.get(
  '/me/signature',
  requireAuth(),
  requireRole('student', 'verifier'),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    if (!user.signaturePath) throw new AppError('NOT_FOUND', 'Tanda tangan belum tersedia.');
    const image = await downloadObject(bucketSignatures(), user.signaturePath);
    res.set('Cache-Control', 'private, no-store').type('png').send(image);
  }),
);

meRouter.get(
  '/me/progress',
  requireAuth(),
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const rows = await db.select({ komponen: submissions.komponen, earned: sql<string>`coalesce(sum(${submissions.finalCredit}), 0)` })
        .from(submissions)
        .where(sql`${submissions.studentId} = ${user.id} and ${submissions.status} = 'approved' and ${submissions.komponen} is not null`)
        .groupBy(submissions.komponen);
      const earnedByComponent = new Map(rows.map((row) => [row.komponen, Number(row.earned)]));
      const komponen = [
        { komponen: 1 as const, target: 1.25, earned: earnedByComponent.get(1) ?? 0 },
        { komponen: 2 as const, target: 0.5, earned: earnedByComponent.get(2) ?? 0 },
        { komponen: 3 as const, target: 1.25, earned: earnedByComponent.get(3) ?? 0 },
      ];
      const total = komponen.reduce((sum, row) => sum + row.earned, 0);
      res.json(ProgressSchema.parse({ komponen, total, target: 3, fulfilled: total >= 3 }));
    } finally {
      await client.end();
    }
  }),
);

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
