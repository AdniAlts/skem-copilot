import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getSubmissionDetail,
  patchSubmission,
  getCertificateUrl,
  submitToVerifier,
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
      expect.objectContaining({ activity: { activityName: 'Nama Baru' } })
    );
  });

  it('mengajukan berkas ke verifikator via submitToVerifier', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ ok: true });

    await submitToVerifier(['SKM-12345678']);
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
});
