/** Pure deterministic recheck after student edits/answers. Never invokes an LLM. */

import type { DocumentKind, Finding, GuidelineSections, LookupCreditResult, ReviewStatus, Rules } from '@skem/shared';
import { lookupCreditTable } from './credit.js';
import { checkDeadline } from './deadline.js';
import { matchName } from './name-match.js';
import { mapReviewStatus } from './status-mapper.js';
import type { CreditTable } from '@skem/shared';

export type RecheckInput = {
  documentKind: DocumentKind;
  recipientName: string | null;
  accountName: string;
  angkatan: number;
  activityName: string | null;
  activityEndDate: string | null;
  komponen: number | null;
  categoryCode: string | null;
  level: string | null;
  role: string | null;
  achievement: string | null;
  answers: Record<string, string>;
  today: string;
};

export type RecheckResult = {
  reviewStatus: Extract<ReviewStatus, 'ready' | 'needs_fix' | 'problem'>;
  findings: Finding[];
  warnings: Finding[];
  activityName: string | null;
  activityEndDate: string | null;
  categoryCode: string | null;
  komponen: number | null;
  level: string | null;
  role: string | null;
  achievement: string | null;
  estimatedCredit: number | null;
  creditEntryId: string | null;
};

export type RecheckData = { rules: Rules; creditTable: CreditTable; guidelineSections: GuidelineSections };

function guidelineRef(data: RecheckData, checkType: Finding['checkType'], categoryCode: string | null) {
  const section = data.guidelineSections.sections.find((item) =>
    item.tags.includes(`check:${checkType}`) && (!item.categoryCodes || !categoryCode || item.categoryCodes.includes(categoryCode)),
  );
  return section ? { id: section.id, title: section.title, ref: section.ref } : null;
}

function finding(data: RecheckData, checkType: Finding['checkType'], result: Finding['result'], message: string, categoryCode: string | null, confidence?: number, extra?: Record<string, unknown>): Finding {
  return {
    checkType,
    result,
    message,
    ...(confidence === undefined ? {} : { confidence }),
    guidelineRef: guidelineRef(data, checkType, categoryCode),
    ...(extra ? { data: extra } : {}),
  };
}

export function recheck(input: RecheckInput, data: RecheckData): RecheckResult {
  const activityName = input.answers.activity_name ?? input.activityName;
  const activityEndDate = input.answers.activity_date ?? input.answers.activity_end_date ?? input.activityEndDate;
  const categoryCode = input.answers.category ?? input.categoryCode;
  const role = input.answers.role ?? input.role;
  const achievement = input.answers.achievement ?? input.achievement;
  const komponen = categoryCode ? data.creditTable.entries.find((entry) => entry.categoryCode === categoryCode)?.komponen ?? input.komponen : input.komponen;
  let level = input.answers.level ?? input.level;
  if (komponen !== 3) level = null;
  if (komponen === 3 && input.answers.participant_scope) {
    const levelByScope: Record<string, string> = {
      campus: 'Kampus',
      regional: 'Regional',
      national: 'Nasional',
      international: 'Internasional',
    };
    level = levelByScope[input.answers.participant_scope] ?? null;
  }

  const findings: Finding[] = [];
  const missingFields: string[] = [];
  if (!activityName) missingFields.push('activity_name');
  if (!activityEndDate) missingFields.push('activity_end_date');
  if (!input.recipientName) missingFields.push('recipient_name');
  if (!categoryCode) missingFields.push('category');
  if (role === null && data.creditTable.entries.some((entry) => entry.categoryCode === categoryCode && entry.role !== null)) missingFields.push('role');
  if (!level && komponen === 3) missingFields.push('level');

  if (input.documentKind === 'other') {
    findings.push(finding(data, 'completeness', 'fail', 'Dokumen ini bukan sertifikat atau surat keputusan kegiatan.', categoryCode));
  }

  if (input.recipientName) {
    const name = matchName({ certificateName: input.recipientName, accountName: input.accountName }, data.rules.nameMatch);
    const message = name.result === 'fail'
      ? `Nama pada bukti (${input.recipientName}) tidak sesuai dengan nama akun (${input.accountName}).`
      : name.result === 'warn'
        ? `Nama pada bukti (${input.recipientName}) sedikit berbeda dari nama akun (${input.accountName}); Verifikator perlu memeriksa.`
        : `Nama pada bukti sesuai dengan akun mahasiswa (${input.accountName}).`;
    findings.push(finding(data, 'name_match', name.result, message, categoryCode, name.score, {
      certificateName: input.recipientName,
      accountName: input.accountName,
      ...(name.result === 'warn' ? { code: 'NAME_SPELLING' } : {}),
    }));
  }

  if (activityEndDate) {
    const deadline = checkDeadline({ activityEndDate, angkatan: input.angkatan, today: input.today }, data.rules.dateRules);
    findings.push(finding(data, 'deadline', deadline.result, deadline.message, categoryCode, undefined, {
      validFrom: deadline.validFrom,
      validTo: deadline.validTo,
    }));
  }

  let creditLookup: LookupCreditResult = { found: false, reason: 'COMBINATION_NOT_FOUND' };
  if (komponen !== null && categoryCode) {
    creditLookup = lookupCreditTable(data.creditTable, {
      komponen,
      categoryCode,
      level: komponen === 3 ? level : null,
      role,
    });
  }
  if (creditLookup.found) {
    findings.push(finding(data, 'credit', 'pass', `Kredit ditemukan pada tabel resmi: ${creditLookup.credit}.`, categoryCode, 1, { entryId: creditLookup.entryId, ref: creditLookup.ref }));
  } else if (categoryCode && komponen !== null) {
    findings.push(finding(data, 'credit', 'fail', 'Kombinasi kategori, tingkat, peran, atau capaian tidak ditemukan di tabel kredit. Periksa pilihan atau hubungi Unit Kemahasiswaan.', categoryCode));
  }

  for (const checkType of ['category', 'level', 'role', 'activity_name'] as const) {
    if (!findings.some((item) => item.checkType === checkType)) {
      findings.push(finding(data, checkType, missingFields.includes(checkType) ? 'warn' : 'pass', missingFields.includes(checkType) ? 'Informasi ini belum dapat dipastikan.' : 'Informasi terdeteksi.', categoryCode));
    }
  }

  const mapped = mapReviewStatus({
    documentKind: input.documentKind,
    findings,
    missingFields,
    openQuestions: input.answers.participant_scope === 'unknown' ? ['participant_scope'] : [],
    confidenceThreshold: data.rules.confidenceThreshold,
  });
  return {
    reviewStatus: mapped.reviewStatus,
    findings,
    warnings: mapped.warnings,
    activityName,
    activityEndDate,
    categoryCode,
    komponen,
    level,
    role,
    achievement,
    estimatedCredit: creditLookup.found ? creditLookup.credit : null,
    creditEntryId: creditLookup.found ? creditLookup.entryId : null,
  };
}
