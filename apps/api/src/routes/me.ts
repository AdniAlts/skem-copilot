/**
 * GET /me — profil + kelas + dosen wali + hasSignature + telegramLinked
 * (skema MeSchema di @skem/shared).
 */

import { eq } from 'drizzle-orm';
import { Router } from 'express';

import { MeSchema } from '@skem/shared';

import { createDb } from '../db/client';
import { classes, users } from '../db/schema';
import { asyncHandler } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

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
