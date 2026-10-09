import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getSignature, saveSignature } from './signature';

describe('Signature API Client', () => {
  const originalFetch = global.fetch;
  const storageMock: Record<string, string> = {};

  const mockLocalStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, val: string) => {
      storageMock[key] = val;
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    },
    clear: () => {
      Object.keys(storageMock).forEach((k) => delete storageMock[k]);
    },
  };

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('mengambil tanda tangan dari API jika tersedia', async () => {
    const fakeBlob = new Blob(['fake-png'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: async () => fakeBlob,
    } as unknown as Response);

    // Mock createObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-sig');

    const result = await getSignature();
    expect(result).toBe('blob:http://localhost/fake-sig');
    expect(global.fetch).toHaveBeenCalledWith('/api/me/signature', {
      credentials: 'include',
    });
  });

  it('mengembalikan data dari localStorage jika API mengembalikan 404', async () => {
    localStorage.setItem('skem_user_signature', 'data:image/png;base64,stored-signature');

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);

    const result = await getSignature();
    expect(result).toBe('data:image/png;base64,stored-signature');
  });

  it('menyimpan tanda tangan via dataUrl dan memperbarui cache', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasSignature: true }),
    } as unknown as Response);

    const dataUrl = 'data:image/png;base64,new-signature';
    const result = await saveSignature({ dataUrl });

    expect(result.hasSignature).toBe(true);
    expect(localStorage.getItem('skem_user_signature')).toBe(dataUrl);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/me/signature',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ dataUrl }),
      }),
    );
  });

  it('menyimpan tanda tangan via berkas File multipart', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasSignature: true }),
    } as unknown as Response);

    const file = new File(['sig'], 'signature.png', { type: 'image/png' });
    const result = await saveSignature({
      dataUrl: 'data:image/png;base64,sig',
      file,
    });

    expect(result.hasSignature).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/me/signature',
      expect.objectContaining({
        method: 'PUT',
      }),
    );
  });
});
