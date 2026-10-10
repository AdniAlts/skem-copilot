import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FinalFormStatus } from '@skem/shared';

import { createDb } from '../db/client.js';
import type { Db } from '../db/client.js';
import { documents, reviews, submissions, users } from '../db/schema.js';
import { buildFinalForm } from '../pdf/final-form.js';
import { bucketCertificates, bucketForms, bucketSignatures, downloadObject, uploadObject } from './storage.js';

export class FinalFormIncompleteError extends Error {}

export function finalFormPath(publicId: string): string {
  return `${publicId}/final-form.pdf`;
}

async function loadSources(db: Db, submissionId: number) {
  const student = alias(users, 'student');
  const verifier = alias(users, 'verifier');
  const [row] = await db.select({ submission: submissions, student })
    .from(submissions).innerJoin(student, eq(student.id, submissions.studentId))
    .where(eq(submissions.id, submissionId)).limit(1);
  if (!row) throw new FinalFormIncompleteError('Pengajuan tidak ditemukan.');
  const [approval] = await db.select({ review: reviews, verifier })
    .from(reviews).innerJoin(verifier, eq(verifier.id, reviews.reviewerId))
    .where(and(eq(reviews.submissionId, submissionId), eq(reviews.stage, 'verifier'), eq(reviews.decision, 'approve'), eq(reviews.signatureApplied, true)))
    .orderBy(desc(reviews.id)).limit(1);
  const [certificate] = await db.select({ filePath: documents.filePath }).from(documents)
    .where(and(eq(documents.submissionId, submissionId), eq(documents.type, 'certificate'))).limit(1);

  const missing: string[] = [];
  if (!approval) missing.push('persetujuan Verifikator');
  if (!row.student.signaturePath) missing.push('tanda tangan mahasiswa');
  if (approval && !approval.verifier.signaturePath) missing.push('tanda tangan Verifikator');
  if (!certificate) missing.push('bukti kegiatan');
  if (!row.student.nrp) missing.push('NRP');
  if (!row.submission.activityName) missing.push('nama kegiatan');
  if (!row.submission.activityDate) missing.push('tanggal kegiatan');
  if (!row.submission.submittedAt) missing.push('tanggal pengajuan');
  if (missing.length || !approval || !certificate) throw new FinalFormIncompleteError(`Data formulir belum lengkap: ${missing.join(', ')}.`);
  return { ...row, approval, certificatePath: certificate.filePath };
}

/**
 * Bangun PDF final, unggah ke bucket formulir, lalu tandai `ready`.
 * Semua kegagalan (data tidak lengkap, storage, PDF rusak) menandai `failed` dan tidak dilempar.
 */
export async function generateFinalForm(submissionId: number): Promise<FinalFormStatus> {
  const { client, db } = createDb();
  try {
    try {
      const source = await loadSources(db, submissionId);
      const [studentSignature, verifierSignature, certificate] = await Promise.all([
        downloadObject(bucketSignatures(), source.student.signaturePath!),
        downloadObject(bucketSignatures(), source.approval.verifier.signaturePath!),
        downloadObject(bucketCertificates(), source.certificatePath),
      ]);
      const pdf = await buildFinalForm({
        student: {
          name: source.student.name,
          nrp: source.student.nrp!,
          programStudi: source.student.programStudi,
          departemen: source.student.departemen,
        },
        activity: {
          activityName: source.submission.activityName!,
          activityDate: source.submission.activityDate!,
          locationPlatform: source.submission.locationPlatform,
          organizer: source.submission.organizer,
          attachmentType: source.submission.attachmentType,
        },
        verifier: {
          name: source.approval.verifier.name,
          jabatan: source.approval.verifier.jabatan,
          approvedAt: source.approval.review.createdAt,
        },
        submittedAt: source.submission.submittedAt!,
        studentSignature: new Uint8Array(studentSignature),
        verifierSignature: new Uint8Array(verifierSignature),
        certificate: new Uint8Array(certificate),
      });
      const path = finalFormPath(source.submission.publicId);
      await uploadObject(bucketForms(), path, Buffer.from(pdf), 'application/pdf');
      await db.update(submissions).set({ finalFormPath: path, finalFormStatus: 'ready', updatedAt: new Date() })
        .where(eq(submissions.id, submissionId));
      return 'ready';
    } catch {
      await db.update(submissions).set({ finalFormStatus: 'failed', updatedAt: new Date() })
        .where(eq(submissions.id, submissionId));
      return 'failed';
    }
  } finally {
    await client.end();
  }
}
