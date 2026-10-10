import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getVerifierQueue, approveSubmission, rejectSubmission } from './verifier';
import { apiClient, ApiClientError } from './client';

describe('Verifier API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mengambil antrian verifikator via apiClient.get', async () => {
    const mockQueue = {
      className: '2 D3 IT B',
      summary: { waiting: 1, withWarnings: 0 },
      items: [
        {
          publicId: 'SKM-7Q2K9D1A',
          studentName: 'Budi Santoso',
          activityName: 'Lomba Desain',
          categoryLabel: 'K3-B01',
          level: 'Nasional',
          estimatedCredit: 1.1,
          aiStatus: 'clean' as const,
          flagCount: 0,
          submittedAt: '2026-10-09T08:00:00.000Z',
        },
      ],
    };

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockQueue);

    const res = await getVerifierQueue();
    expect(res.className).toBe('2 D3 IT B');
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.publicId).toBe('SKM-7Q2K9D1A');
    expect(apiClient.get).toHaveBeenCalledWith('/api/verifier/queue');
  });

  it('menyetujui pengajuan via apiClient.post', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      status: 'waiting_validator',
      finalForm: { status: 'none' },
    });

    const res = await approveSubmission('SKM-7Q2K9D1A');
    expect(res.status).toBe('waiting_validator');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/verifier/submissions/SKM-7Q2K9D1A/approve',
      {},
    );
  });

  it('menolak pengajuan via apiClient.post', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ status: 'rejected' });

    const res = await rejectSubmission('SKM-7Q2K9D1A', 'Dokumen tidak valid');
    expect(res.status).toBe('rejected');
    expect(apiClient.post).toHaveBeenCalledWith('/api/verifier/submissions/SKM-7Q2K9D1A/reject', {
      note: 'Dokumen tidak valid',
    });
  });

  it('error antrian diteruskan, tidak diganti data contoh', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network error'));
    await expect(getVerifierQueue()).rejects.toThrow('Network error');
  });

  it('Setujui yang gagal diteruskan sebagai error, tidak pura-pura berhasil', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiClientError(409, 'Tanda tangan Verifikator wajib disiapkan.', 'SIGNATURE_REQUIRED'),
    );
    await expect(approveSubmission('SKM-AAAAAAAA')).rejects.toMatchObject({
      code: 'SIGNATURE_REQUIRED',
    });
  });

  it('Tolak yang gagal diteruskan sebagai error, tidak pura-pura berhasil', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
      new ApiClientError(404, 'Pengajuan tidak ditemukan.', 'NOT_FOUND'),
    );
    await expect(rejectSubmission('SKM-AAAAAAAA', 'Alasan test')).rejects.toMatchObject({
      status: 404,
    });
  });
});
