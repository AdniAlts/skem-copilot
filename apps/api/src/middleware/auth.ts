/**
 * Sesi mock login (ARCHITECTURE §10):
 * cookie httpOnly `sameSite=lax` ditandatangani SESSION_SECRET, isi `{ userId }`.
 */

import { sign, unsign } from 'cookie-signature';
import type { NextFunction, Request, Response } from 'express';

import { loadEnv } from '../env.js';
import { createDb } from '../db/client.js';
import { AppError } from './error.js';
import type { UserRole } from '@skem/shared';

export const SESSION_COOKIE = 'skem_session';

export interface SessionUser {
  id: number;
  name: string;
  role: UserRole;
  classId: number | null;
  nrp: string | null;
  signaturePath: string | null;
  telegramChatId: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    sessionUser?: SessionUser;
  }
}

export function createSessionToken(userId: number): string {
  const payload = Buffer.from(JSON.stringify({ userId })).toString('base64url');
  // cookie-signature: sign(val, secret)
  return sign(payload, loadEnv().SESSION_SECRET);
}

export function parseSessionToken(token: string | undefined): number | null {
  if (!token) return null;
  // cookie-signature: unsign(input, secret)
  const payload = unsign(token, loadEnv().SESSION_SECRET);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { userId?: unknown };
    if (typeof parsed.userId === 'number' && Number.isInteger(parsed.userId)) {
      return parsed.userId;
    }
    return null;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, userId: number): void {
  res.cookie(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Muat user sesi dari DB ke req.sessionUser (atau tolak 401). */
export function requireAuth(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, _res, next) => {
    try {
      const userId = parseSessionToken(req.cookies?.[SESSION_COOKIE]);
      if (userId === null) {
        throw new AppError('UNAUTHENTICATED', 'Belum masuk.');
      }
      const { db } = createDb();
      const { users } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          classId: users.classId,
          nrp: users.nrp,
          signaturePath: users.signaturePath,
          telegramChatId: users.telegramChatId,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const user = rows[0];
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 'Sesi tidak valid.');
      }
      req.sessionUser = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Setelah requireAuth: role harus termasuk yang diizinkan, selain itu 403. */
export function requireRole(
  ...roles: UserRole[]
): (req: Request, _res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const user = req.sessionUser;
    if (!user) {
      next(new AppError('UNAUTHENTICATED', 'Belum masuk.'));
      return;
    }
    if (!roles.includes(user.role)) {
      next(new AppError('FORBIDDEN', 'Tidak memiliki akses.'));
      return;
    }
    next();
  };
}
