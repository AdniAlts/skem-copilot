import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiClientError } from './client';
import {
  approveSubmission,
  getVerifierCertificateUrl,
  getVerifierQueue,
  getVerifierSubmission,
  rejectSubmission,
} from './verifier';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getVerifierQueue', () => {
  it('tanpa filter memanggil endpoint antrian polos', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({});
    await getVerifierQueue();
    expect(get).toHaveBeenCalledWith('/api/verifier/queue');
  });

  it('meneruskan filter status AI dan urutan sebagai query string', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({});
    await getVerifierQueue({ aiStatus: 'warning', sort: 'flags' });
    expect(get).toHaveBeenCalledWith('/api/verifier/queue?aiStatus=warning&sort=flags');
  });
});

describe('detail dan sertifikat Verifikator', () => {
  it('error 404 diteruskan, tidak diganti data contoh', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new ApiClientError(404, 'Pengajuan tidak ditemukan.', 'NOT_FOUND'),
    );
    await expect(getVerifierSubmission('SKM-AAAAAAAA')).rejects.toMatchObject({ status: 404 });
    await expect(getVerifierCertificateUrl('SKM-AAAAAAAA')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('keputusan Verifikator', () => {
  it('Setujui tanpa catatan mengirim body kosong', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await approveSubmission('SKM-AAAAAAAA', '   ');
    expect(post).toHaveBeenCalledWith('/api/verifier/submissions/SKM-AAAAAAAA/approve', {});
  });

  it('Setujui dengan catatan mengirim catatan yang dirapikan', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await approveSubmission('SKM-AAAAAAAA', '  Sesuai bukti.  ');
    expect(post).toHaveBeenCalledWith('/api/verifier/submissions/SKM-AAAAAAAA/approve', {
      note: 'Sesuai bukti.',
    });
  });

  it('Tolak mengirim alasan yang dirapikan', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await rejectSubmission('SKM-AAAAAAAA', '  Nama tidak sesuai.  ');
    expect(post).toHaveBeenCalledWith('/api/verifier/submissions/SKM-AAAAAAAA/reject', {
      note: 'Nama tidak sesuai.',
    });
  });
});
