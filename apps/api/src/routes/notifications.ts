import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { NotificationSchema } from '@skem/shared';

import { createDb } from '../db/client.js';
import { notifications, submissions } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/error.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/notifications',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const rows = await db
        .select({
          id: notifications.id,
          title: notifications.title,
          body: notifications.body,
          submissionPublicId: submissions.publicId,
          channel: notifications.channel,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .leftJoin(submissions, eq(submissions.id, notifications.submissionId))
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt), desc(notifications.id));

      const body = rows.map((n) =>
        NotificationSchema.parse({
          id: n.id,
          title: n.title,
          body: n.body,
          submissionPublicId: n.submissionPublicId ?? null,
          channel: n.channel,
          readAt: n.readAt ? n.readAt.toISOString() : null,
          createdAt: n.createdAt.toISOString(),
        }),
      );

      res.json(body);
    } finally {
      await client.end();
    }
  }),
);

notificationsRouter.post(
  '/notifications/:id/read',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError('VALIDATION_ERROR', 'ID notifikasi tidak valid.');
    }
    const user = req.sessionUser!;
    const { client, db } = createDb();
    try {
      const [n] = await db
        .select({ id: notifications.id, userId: notifications.userId })
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);

      if (!n || n.userId !== user.id) {
        throw new AppError('NOT_FOUND', 'Notifikasi tidak ditemukan.');
      }

      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, id));

      res.status(204).send();
    } finally {
      await client.end();
    }
  }),
);
