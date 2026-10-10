import { eq } from 'drizzle-orm';
import { loadEnv } from '../env.js';
import { createDb } from '../db/client.js';
import { notifications, reviews, submissions, users } from '../db/schema.js';
import { sendTelegramMessage } from '../telegram/bot.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendStaffDecisionNotification(reviewId: number): Promise<void> {
  const env = loadEnv();
  const { client, db } = createDb();
  try {
    const [row] = await db
      .select({
        review: reviews,
        submission: submissions,
        student: users,
      })
      .from(reviews)
      .innerJoin(submissions, eq(submissions.id, reviews.submissionId))
      .innerJoin(users, eq(users.id, submissions.studentId))
      .where(eq(reviews.id, reviewId))
      .limit(1);

    if (!row) return;

    const { review, submission, student } = row;
    const activity = submission.activityName ?? submission.publicId;

    let title = '';
    let body = '';

    if (review.stage === 'verifier') {
      if (review.decision === 'approve') {
        title = 'Pengajuan disetujui Verifikator';
        body = `${activity} disetujui dan diteruskan ke Validator.`;
      } else if (review.decision === 'reject') {
        title = 'Pengajuan ditolak Verifikator';
        body = `${activity} ditolak. Alasan: ${review.note ?? '-'}`;
      }
    } else if (review.stage === 'validator') {
      if (review.decision === 'approve') {
        const creditStr = submission.finalCredit ? Number(submission.finalCredit).toFixed(2) : '0.00';
        title = 'Pengajuan SKEM disetujui';
        body = `${activity} disetujui dengan kredit final ${creditStr}.`;
      } else if (review.decision === 'reject') {
        title = 'Pengajuan ditolak Validator';
        body = `${activity} ditolak. Alasan: ${review.note ?? '-'}`;
      }
    }

    if (!title) return;

    if (!student.telegramChatId || !env.TELEGRAM_BOT_TOKEN) {
      return;
    }

    const messageText = `📢 <b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;

    try {
      await sendTelegramMessage(student.telegramChatId, messageText);
      await db.insert(notifications).values({
        userId: student.id,
        submissionId: submission.id,
        channel: 'telegram',
        triggerReviewId: review.id,
        title,
        body,
        status: 'sent',
      });
    } catch (sendErr) {
      console.error('Gagal mengirim notifikasi Telegram:', sendErr);
      await db.insert(notifications).values({
        userId: student.id,
        submissionId: submission.id,
        channel: 'telegram',
        triggerReviewId: review.id,
        title,
        body,
        status: 'failed',
      });
    }
  } catch (err) {
    console.error('Error dispatching staff decision notification:', err);
  } finally {
    await client.end();
  }
}
