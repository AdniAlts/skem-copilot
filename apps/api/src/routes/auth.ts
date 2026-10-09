/**
 * Auth simulasi (ARCHITECTURE §9, §10):
 * GET  /auth/mock-users  — daftar akun seed untuk pemilih peran
 * POST /auth/mock-login  — { userId } → cookie sesi httpOnly bertanda tangan
 * POST /auth/logout      — hapus cookie
 */

import { eq } from 'drizzle-orm';
import { Router } from 'express';

import { MockLoginBodySchema, MockUserSchema } from '@skem/shared';

import { createDb } from '../db/client';
import { users } from '../db/schema';
import { AppError, asyncHandler, validationError } from '../middleware/error';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../middleware/auth';

export const authRouter = Router();

// GET /auth/mock-users — publik
authRouter.get(
  '/auth/mock-users',
  asyncHandler(async (_req, res) => {
    const { client, db } = createDb();
    try {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          classId: users.classId,
        })
        .from(users)
        .orderBy(users.id);
      const { classes } = await import('../db/schema');
      const classRows = await db.select({ id: classes.id, name: classes.name }).from(classes);
      const classNameById = new Map(classRows.map((c) => [c.id, c.name]));
      const body = rows.map((u) =>
        MockUserSchema.parse({
          id: u.id,
          name: u.name,
          role: u.role,
          className: u.classId ? (classNameById.get(u.classId) ?? null) : null,
        }),
      );
      res.json(body);
    } finally {
      await client.end();
    }
  }),
);

// POST /auth/mock-login — publik
authRouter.post(
  '/auth/mock-login',
  asyncHandler(async (req, res) => {
    const parsed = MockLoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw validationError('Body tidak valid.', { issues: parsed.error.issues });
    }
    const { client, db } = createDb();
    try {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, parsed.data.userId))
        .limit(1);
      if (!rows[0]) {
        throw new AppError('NOT_FOUND', 'Pengguna tidak ditemukan.');
      }
      setSessionCookie(res, rows[0].id);
      res.json({ ok: true });
    } finally {
      await client.end();
    }
  }),
);

// POST /auth/logout — semua (sesi valid atau tidak, tetap 200)
authRouter.post(
  '/auth/logout',
  requireAuth(),
  asyncHandler(async (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);
