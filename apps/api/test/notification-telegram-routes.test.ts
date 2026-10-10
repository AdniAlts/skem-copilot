import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Bot } from 'grammy';

import { createApp } from '../src/app';
import { createDb } from '../src/db/client';
import { notifications, reviews, submissions, users } from '../src/db/schema';
import { HAS_DATABASE } from './db-available';
import { sendStaffDecisionNotification } from '../src/services/notifications';
import { setTelegramBotForTest } from '../src/telegram/bot';

let app: ReturnType<typeof createApp>;
let client: ReturnType<typeof createDb>['client'];
let db: ReturnType<typeof createDb>['db'];
let studentId: number;
let otherStudentId: number;
let verifierId: number;
let validatorId: number;
let studentCookie: string[];
let validatorCookie: string[];
const fixtureSubmissionIds: number[] = [];
const fixtureNotificationIds: number[] = [];

async function loginAs(userId: number): Promise<string[]> {
  const response = await request(app).post('/api/auth/mock-login').send({ userId }).expect(200);
  return [String(response.headers['set-cookie'])];
}

describe.runIf(HAS_DATABASE)('BE-09: Notifications and Telegram routes', () => {
  beforeAll(async () => {
    app = createApp();
    const conn = createDb();
    client = conn.client;
    db = conn.db;

    const studentRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'student'))
      .limit(2);
    studentId = studentRows[0]!.id;
    otherStudentId = studentRows[1]!.id;

    const verifierRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'verifier'))
      .limit(1);
    verifierId = verifierRows[0]!.id;

    const validatorRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'validator'))
      .limit(1);
    validatorId = validatorRows[0]!.id;

    studentCookie = await loginAs(studentId);
    validatorCookie = await loginAs(validatorId);
  });

  afterAll(async () => {
    if (fixtureNotificationIds.length) {
      await db.delete(notifications).where(inArray(notifications.id, fixtureNotificationIds));
    }
    if (fixtureSubmissionIds.length) {
      await db.delete(submissions).where(inArray(submissions.id, fixtureSubmissionIds));
    }
    await db
      .update(users)
      .set({ telegramChatId: null, telegramLinkToken: null })
      .where(inArray(users.id, [studentId, otherStudentId]));
    setTelegramBotForTest(null);
    await client?.end();
  });

  describe('GET /notifications', () => {
    it('menolak tanpa login dengan 401', async () => {
      const res = await request(app).get('/api/notifications').expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('mengembalikan daftar notifikasi milik user terurut dari yang terbaru', async () => {
      const [n1] = await db
        .insert(notifications)
        .values({
          userId: studentId,
          channel: 'in_app',
          title: 'Notifikasi 1',
          body: 'Isi notifikasi 1',
          status: 'sent',
          createdAt: new Date(Date.now() - 5000),
        })
        .returning({ id: notifications.id });

      const [n2] = await db
        .insert(notifications)
        .values({
          userId: studentId,
          channel: 'in_app',
          title: 'Notifikasi 2',
          body: 'Isi notifikasi 2',
          status: 'sent',
          createdAt: new Date(),
        })
        .returning({ id: notifications.id });

      const [otherN] = await db
        .insert(notifications)
        .values({
          userId: otherStudentId,
          channel: 'in_app',
          title: 'Notifikasi User Lain',
          body: 'Isi user lain',
          status: 'sent',
        })
        .returning({ id: notifications.id });

      expect(n1).toBeDefined();
      expect(n2).toBeDefined();
      expect(otherN).toBeDefined();

      fixtureNotificationIds.push(n1!.id, n2!.id, otherN!.id);

      const res = await request(app)
        .get('/api/notifications')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((item: { id: number }) => item.id);
      expect(ids).toContain(n1!.id);
      expect(ids).toContain(n2!.id);
      expect(ids).not.toContain(otherN!.id);

      const idx2 = ids.indexOf(n2!.id);
      const idx1 = ids.indexOf(n1!.id);
      expect(idx2).toBeLessThan(idx1);
    });
  });

  describe('POST /notifications/:id/read', () => {
    it('menolak tanpa login dengan 401', async () => {
      const res = await request(app).post('/api/notifications/1/read').expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('menolak id tidak valid dengan 400', async () => {
      const res = await request(app)
        .post('/api/notifications/invalid-id/read')
        .set('Cookie', studentCookie)
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('menolak id tidak ditemukan atau milik user lain dengan 404', async () => {
      const [otherN] = await db
        .insert(notifications)
        .values({
          userId: otherStudentId,
          channel: 'in_app',
          title: 'Private Notification',
          body: 'Secret',
          status: 'sent',
        })
        .returning({ id: notifications.id });
      expect(otherN).toBeDefined();
      fixtureNotificationIds.push(otherN!.id);

      const res = await request(app)
        .post(`/api/notifications/${otherN!.id}/read`)
        .set('Cookie', studentCookie)
        .expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('menandai notifikasi sebagai terbaca dan mengembalikan 204', async () => {
      const [n] = await db
        .insert(notifications)
        .values({
          userId: studentId,
          channel: 'in_app',
          title: 'Unread Notification',
          body: 'Please read me',
          status: 'sent',
        })
        .returning({ id: notifications.id });
      expect(n).toBeDefined();
      fixtureNotificationIds.push(n!.id);

      await request(app)
        .post(`/api/notifications/${n!.id}/read`)
        .set('Cookie', studentCookie)
        .expect(204);

      const [updated] = await db
        .select({ readAt: notifications.readAt })
        .from(notifications)
        .where(eq(notifications.id, n!.id))
        .limit(1);

      expect(updated?.readAt).not.toBeNull();
    });
  });

  describe('POST /me/telegram/link', () => {
    it('menolak tanpa login dengan 401', async () => {
      const res = await request(app).post('/api/me/telegram/link').expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('menolak role validator dengan 403', async () => {
      const res = await request(app)
        .post('/api/me/telegram/link')
        .set('Cookie', validatorCookie)
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('menghasilkan deepLink dan menyimpan token di database', async () => {
      const res = await request(app)
        .post('/api/me/telegram/link')
        .set('Cookie', studentCookie)
        .expect(200);

      expect(res.body.deepLink).toMatch(/^https:\/\/t\.me\/[^?]+\?start=[A-Za-z0-9_-]+$/);

      const [user] = await db
        .select({ telegramLinkToken: users.telegramLinkToken })
        .from(users)
        .where(eq(users.id, studentId))
        .limit(1);

      expect(user?.telegramLinkToken).not.toBeNull();
      expect(res.body.deepLink).toContain(user!.telegramLinkToken!);
    });
  });

  describe('Telegram bot linking flow', () => {
    it('menghubungkan akun saat token valid disimpan', async () => {
      const token = 'test-link-token-123';
      await db
        .update(users)
        .set({ telegramLinkToken: token, telegramChatId: null })
        .where(eq(users.id, studentId));

      const [uBefore] = await db.select().from(users).where(eq(users.telegramLinkToken, token)).limit(1);
      expect(uBefore?.id).toBe(studentId);

      await db.update(users).set({ telegramChatId: '987654321', telegramLinkToken: null }).where(eq(users.id, studentId));

      const [uAfter] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
      expect(uAfter?.telegramChatId).toBe('987654321');
      expect(uAfter?.telegramLinkToken).toBeNull();
    });
  });

  describe('sendStaffDecisionNotification', () => {
    it('mengirim pesan Telegram dan menyimpan log notifikasi saat staff memutuskan', async () => {
      const publicId = `SKM-NOTIF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const [sub] = await db
        .insert(submissions)
        .values({
          publicId,
          studentId,
          classId: 1,
          status: 'waiting_validator',
          reviewStatus: 'ready',
          activityName: 'Lomba Robotika Nasional',
          submittedAt: new Date(),
        })
        .returning({ id: submissions.id });
      expect(sub).toBeDefined();
      fixtureSubmissionIds.push(sub!.id);

      const [rev] = await db
        .insert(reviews)
        .values({
          submissionId: sub!.id,
          reviewerId: verifierId,
          stage: 'verifier',
          decision: 'approve',
          signatureApplied: true,
        })
        .returning({ id: reviews.id });
      expect(rev).toBeDefined();

      await db.update(users).set({ telegramChatId: '99887766' }).where(eq(users.id, studentId));

      const mockSendMessage = vi.fn().mockResolvedValue({ message_id: 123 });
      const mockBot = {
        api: {
          sendMessage: mockSendMessage,
        },
      } as unknown as Bot;
      setTelegramBotForTest(mockBot);

      await sendStaffDecisionNotification(rev!.id);

      expect(mockSendMessage).toHaveBeenCalledWith(
        '99887766',
        expect.stringContaining('Pengajuan disetujui Verifikator'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );

      const [tgNotif] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.submissionId, sub!.id),
            eq(notifications.channel, 'telegram'),
            eq(notifications.triggerReviewId, rev!.id),
          ),
        )
        .limit(1);

      expect(tgNotif).toBeDefined();
      expect(tgNotif?.status).toBe('sent');
      expect(tgNotif?.title).toBe('Pengajuan disetujui Verifikator');
      if (tgNotif) fixtureNotificationIds.push(tgNotif.id);

      await db.update(users).set({ telegramChatId: null }).where(eq(users.id, studentId));
      setTelegramBotForTest(null);
    });

    it('mencatat status failed jika pengiriman Telegram gagal tanpa melempar error', async () => {
      const publicId = `SKM-FAIL-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const [sub] = await db
        .insert(submissions)
        .values({
          publicId,
          studentId,
          classId: 1,
          status: 'rejected',
          reviewStatus: 'ready',
          activityName: 'Seminar AI',
          submittedAt: new Date(),
        })
        .returning({ id: submissions.id });
      expect(sub).toBeDefined();
      fixtureSubmissionIds.push(sub!.id);

      const [rev] = await db
        .insert(reviews)
        .values({
          submissionId: sub!.id,
          reviewerId: verifierId,
          stage: 'verifier',
          decision: 'reject',
          note: 'Sertifikat buram',
        })
        .returning({ id: reviews.id });
      expect(rev).toBeDefined();

      await db.update(users).set({ telegramChatId: '11223344' }).where(eq(users.id, studentId));

      const mockSendMessage = vi.fn().mockRejectedValue(new Error('Bot was blocked by the user'));
      const mockBot = {
        api: {
          sendMessage: mockSendMessage,
        },
      } as unknown as Bot;
      setTelegramBotForTest(mockBot);

      await expect(sendStaffDecisionNotification(rev!.id)).resolves.not.toThrow();

      const [tgNotif] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.submissionId, sub!.id),
            eq(notifications.channel, 'telegram'),
            eq(notifications.triggerReviewId, rev!.id),
          ),
        )
        .limit(1);

      expect(tgNotif).toBeDefined();
      expect(tgNotif?.status).toBe('failed');
      if (tgNotif) fixtureNotificationIds.push(tgNotif.id);

      await db.update(users).set({ telegramChatId: null }).where(eq(users.id, studentId));
      setTelegramBotForTest(null);
    });
  });
});
