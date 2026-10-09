import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiFetch, apiClient, ApiClientError } from './client';

describe('apiFetch & apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mengirim permintaan dengan credentials include dan content-type json', async () => {
    const mockResponse = { data: 'sukses' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await apiClient.get('/api/test');

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });

  it('melempar ApiClientError dengan pesan dari server ketika ApiError valid', async () => {
    const mockErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nama kegiatan tidak boleh kosong.',
        details: { field: 'activityName' },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => mockErrorBody,
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/test')).rejects.toThrow('Nama kegiatan tidak boleh kosong.');

    try {
      await apiFetch('/api/test');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.status).toBe(400);
      expect(apiErr.details).toEqual({ field: 'activityName' });
    }
  });

  it('menggunakan fallback pesan Bahasa Indonesia jika response error bukan JSON ApiError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => {
        throw new Error('bukan json');
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(apiFetch('/api/not-found')).rejects.toThrow(
      'Data atau halaman yang diminta tidak ditemukan.',
    );
  });
});
