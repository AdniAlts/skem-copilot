/** Pure review-status mapping tests. */

import { describe, expect, it } from 'vitest';
import { mapReviewStatus } from '../../src/rules/status-mapper.js';
import type { Finding } from '@skem/shared';

const pass = (checkType: Finding['checkType']): Finding => ({ checkType, result: 'pass', message: 'Lulus' });

describe('mapReviewStatus', () => {
  it('maps a foreign recipient name failure to problem', () => {
    expect(mapReviewStatus({
      documentKind: 'certificate',
      findings: [{ checkType: 'name_match', result: 'fail', message: 'Nama berbeda' }],
      missingFields: [],
      openQuestions: [],
      confidenceThreshold: 0.7,
    }).reviewStatus).toBe('problem');
  });

  it('maps a deadline failure to problem', () => {
    expect(mapReviewStatus({
      documentKind: 'certificate',
      findings: [{ checkType: 'deadline', result: 'fail', message: 'Tanggal di luar rentang' }],
      missingFields: [],
      openQuestions: [],
      confidenceThreshold: 0.7,
    }).reviewStatus).toBe('problem');
  });

  it('maps unsupported document kind to problem', () => {
    expect(mapReviewStatus({
      documentKind: 'other',
      findings: [],
      missingFields: [],
      openQuestions: [],
      confidenceThreshold: 0.7,
    }).reviewStatus).toBe('problem');
  });

  it('maps open questions and missing fields to needs_fix', () => {
    expect(mapReviewStatus({
      documentKind: 'certificate',
      findings: [pass('name_match')],
      missingFields: ['activity_name'],
      openQuestions: ['participant_scope'],
      confidenceThreshold: 0.7,
    }).reviewStatus).toBe('needs_fix');
  });

  it('maps low-confidence required findings to needs_fix', () => {
    expect(mapReviewStatus({
      documentKind: 'certificate',
      findings: [{ checkType: 'category', result: 'pass', confidence: 0.4, message: 'Klasifikasi kurang yakin' }],
      missingFields: [],
      openQuestions: [],
      confidenceThreshold: 0.7,
    }).reviewStatus).toBe('needs_fix');
  });

  it('maps credit lookup failure to needs_fix', () => {
    expect(mapReviewStatus({
      documentKind: 'certificate',
      findings: [{ checkType: 'credit', result: 'fail', message: 'Tidak ada kombinasi' }],
      missingFields: [],
      openQuestions: [],
      confidenceThreshold: 0.7,
    }).reviewStatus).toBe('needs_fix');
  });

  it('maps warnings without blockers to ready and returns warning findings', () => {
    const warning: Finding = { checkType: 'name_match', result: 'warn', message: 'Ejaan mirip' };
    const result = mapReviewStatus({
      documentKind: 'certificate',
      findings: [warning, pass('deadline')],
      missingFields: [],
      openQuestions: [],
      confidenceThreshold: 0.7,
    });
    expect(result.reviewStatus).toBe('ready');
    expect(result.warnings).toEqual([warning]);
  });
});
