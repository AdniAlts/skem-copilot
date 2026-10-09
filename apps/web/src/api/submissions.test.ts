import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getSubmissionDetail,
  patchSubmission,
  getCertificateUrl,
  submitToVerifier,
  answerQuestion,
} from './submissions';
import { apiClient } from './client';

describe('Submissions API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mengambil submission detail via apiClient.get', async () => {
    const mockDetail = {
      publicId: 'SKM-12345678',
      status: 'draft',
      reviewStatus: 'ready',
      officialStatus: 'dalam_proses',
      student: {
        name: 'Budi Santoso',
        nrp: '3122500001',
        programStudi: 'D3 IT',
        departemen: 'TIK',
        angkatan: 2025,
        className: '2 D3 IT B',
      },
      verifier: null,
      activity: {
        activityName: 'Lomba Desain',
        activityDate: '2026-05-01',
        locationPlatform: 'Surabaya',
        organizer: 'BEM',
        attachmentType: 'Sertifikat',
      },
      skem: {
        komponen: 3,
        categoryCode: 'K3-B01',
        level: 'Nasional',
        roleInActivity: 'Juara II',
        achievement: null,
        creditEntryId: 'K3-B01-NAS-JUARA2',
        estimatedCredit: 1.1,
        finalCredit: null,
      },
      deadline: null,
      findings: [],
      warnings: [],
      questions: [],
      finalForm: { status: 'none' },
      reviews: [],
      timeline: [],
    };

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockDetail);

    const result = await getSubmissionDetail('SKM-12345678');
    expect(result.publicId).toBe('SKM-12345678');
    expect(apiClient.get).toHaveBeenCalledWith('/api/submissions/SKM-12345678');
  });

  it('mengupdate submission metadata via apiClient.patch', async () => {
    const updated = {
      publicId: 'SKM-12345678',
      status: 'draft' as const,
      reviewStatus: 'ready' as const,
      officialStatus: 'dalam_proses' as const,
      student: {
        name: 'Budi Santoso',
        nrp: '3122500001',
        programStudi: 'D3 IT',
        departemen: 'TIK',
        angkatan: 2025,
        className: '2 D3 IT B',
      },
      verifier: null,
      activity: {
        activityName: 'Nama Baru',
        activityDate: '2026-05-01',
        locationPlatform: 'Surabaya',
        organizer: 'BEM',
        attachmentType: 'Sertifikat',
      },
      skem: {
        komponen: 3,
        categoryCode: 'K3-B01',
        level: 'Nasional',
        roleInActivity: 'Juara II',
        achievement: null,
        creditEntryId: 'K3-B01-NAS-JUARA2',
        estimatedCredit: 1.1,
        finalCredit: null,
      },
      deadline: null,
      findings: [],
      warnings: [],
      questions: [],
      finalForm: { status: 'none' as const },
      reviews: [],
      timeline: [],
    };

    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce(updated);

    const result = await patchSubmission('SKM-12345678', {
      activity: { activityName: 'Nama Baru' },
    });

    expect(result.activity.activityName).toBe('Nama Baru');
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/submissions/SKM-12345678',
      expect.objectContaining({ activity: { activityName: 'Nama Baru' } }),
    );
  });

  it('mengajukan berkas ke verifikator via submitToVerifier', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      submitted: ['SKM-12345678'],
      skipped: [],
    });

    const res = await submitToVerifier(['SKM-12345678']);
    expect(res.submitted).toEqual(['SKM-12345678']);
    expect(res.skipped).toEqual([]);
    expect(apiClient.post).toHaveBeenCalledWith('/api/submissions/submit', {
      publicIds: ['SKM-12345678'],
    });
  });

  it('mengambil certificate url via getCertificateUrl', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      url: 'https://storage.pens.ac.id/cert.pdf',
      expiresIn: 60,
    });

    const result = await getCertificateUrl('SKM-12345678');
    expect(result.url).toBe('https://storage.pens.ac.id/cert.pdf');
    expect(result.expiresIn).toBe(60);
  });

  it('mengirim jawaban agent via answerQuestion ke API', async () => {
    const mockAnswerResult = {
      publicId: 'SKM-12345678',
      status: 'draft' as const,
      reviewStatus: 'ready' as const,
      officialStatus: 'dalam_proses' as const,
      student: {
        name: 'Budi Santoso',
        nrp: '3122500001',
        programStudi: 'D3 IT',
        departemen: 'TIK',
        angkatan: 2025,
        className: '2 D3 IT B',
      },
      verifier: null,
      activity: {
        activityName: 'Lomba Poster',
        activityDate: '2026-05-01',
        locationPlatform: 'Surabaya',
        organizer: 'BEM',
        attachmentType: 'Sertifikat',
      },
      skem: {
        komponen: 3,
        categoryCode: 'K3-B01',
        level: 'Nasional',
        roleInActivity: 'Juara II',
        achievement: null,
        creditEntryId: 'K3-B01-NAS-JUARA2',
        estimatedCredit: 1.1,
        finalCredit: null,
      },
      deadline: null,
      findings: [],
      warnings: [],
      questions: [],
      finalForm: { status: 'none' as const },
      reviews: [],
      timeline: [],
    };

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce(mockAnswerResult);

    const result = await answerQuestion('SKM-12345678', {
      questionId: 1,
      answer: 'national',
    });

    expect(result.publicId).toBe('SKM-12345678');
    expect(result.reviewStatus).toBe('ready');
    expect(result.skem.level).toBe('Nasional');
    expect(result.skem.estimatedCredit).toBe(1.1);
    expect(apiClient.post).toHaveBeenCalledWith('/api/submissions/SKM-12345678/answers', {
      questionId: 1,
      answer: 'national',
    });
  });

  it('simulasi demo fallback: menjawab "national" mengubah level menjadi Nasional dan status menjadi ready', async () => {
    // Simulasi fallback ketika network/backend mengembalikan error
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network error'));

    const result = await answerQuestion('SKM-TEST-DEMO', {
      questionId: 1,
      answer: 'Minimal 3 provinsi di Indonesia',
    });

    expect(result.publicId).toBe('SKM-TEST-DEMO');
    expect(result.reviewStatus).toBe('ready');
    expect(result.skem.level).toBe('Nasional');
    expect(result.skem.estimatedCredit).toBe(1.1);
  });

  it('menjawab satu submission tidak mempengaruhi submission lain', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Offline demo'));

    const sub1 = await answerQuestion('SKM-CARD-1', {
      questionId: 1,
      answer: 'Minimal 3 provinsi di Indonesia',
    });

    const sub2 = await answerQuestion('SKM-CARD-2', {
      questionId: 1,
      answer: 'Hanya lingkungan internal PENS',
    });

    expect(sub1.publicId).toBe('SKM-CARD-1');
    expect(sub1.skem.level).toBe('Nasional');

    expect(sub2.publicId).toBe('SKM-CARD-2');
    expect(sub2.skem.level).toBe('Kampus');
  });
});
