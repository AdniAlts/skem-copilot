import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiClientError } from './client';
import { getStaffFinalFormUrl, getStaffSubmission } from './staff';
import {
  adjustFinalCredit,
  getValidatorQueue,
  regenerateFinalForm,
  rejectAsValidator,
  validateSubmission,
} from './validator';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('klien API Validator', () => {
  it('memanggil endpoint antrian', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({});
    await getValidatorQueue();
    expect(get).toHaveBeenCalledWith('/api/validator/queue');
  });

  it('ubah kredit mengirim angka dan alasan yang dirapikan', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await adjustFinalCredit('SKM-AAAAAAAA', 0.5, '  Bukti juara tingkat provinsi.  ');
    expect(post).toHaveBeenCalledWith('/api/validator/submissions/SKM-AAAAAAAA/credit', {
      finalCredit: 0.5,
      reason: 'Bukti juara tingkat provinsi.',
    });
  });

  it('Validasi mengirim body kosong (kredit diubah lewat endpoint terpisah)', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await validateSubmission('SKM-AAAAAAAA');
    expect(post).toHaveBeenCalledWith('/api/validator/submissions/SKM-AAAAAAAA/validate', {});
  });

  it('Tolak dan Buat ulang memakai endpoint Validator', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await rejectAsValidator('SKM-AAAAAAAA', ' Berkas tidak lengkap. ');
    await regenerateFinalForm('SKM-AAAAAAAA');
    expect(post).toHaveBeenNthCalledWith(1, '/api/validator/submissions/SKM-AAAAAAAA/reject', {
      note: 'Berkas tidak lengkap.',
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/api/validator/submissions/SKM-AAAAAAAA/regenerate-form',
      {},
    );
  });

  it('keputusan yang gagal diteruskan sebagai error, tidak dianggap berhasil', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new ApiClientError(409, 'Pengajuan tidak sedang menunggu Validator.', 'INVALID_TRANSITION'),
    );
    await expect(validateSubmission('SKM-AAAAAAAA')).rejects.toMatchObject({ status: 409 });
    await expect(rejectAsValidator('SKM-AAAAAAAA', 'x')).rejects.toMatchObject({ status: 409 });
  });
});

describe('klien API staf', () => {
  it('404 detail dan PDF final diteruskan, tidak diganti data contoh', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(
      new ApiClientError(404, 'Tidak ditemukan.', 'NOT_FOUND'),
    );
    await expect(getStaffSubmission('SKM-AAAAAAAA')).rejects.toMatchObject({ status: 404 });
    await expect(getStaffFinalFormUrl('SKM-AAAAAAAA')).rejects.toMatchObject({ status: 404 });
  });
});
