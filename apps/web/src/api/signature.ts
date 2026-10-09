const LOCAL_STORAGE_KEY = 'skem_user_signature';

/**
 * Mengambil tanda tangan pengguna yang tersimpan (format Data URL / Blob URL).
 * Mengembalikan null jika pengguna belum memiliki tanda tangan.
 */
export async function getSignature(): Promise<string | null> {
  try {
    const res = await fetch('/api/me/signature', {
      credentials: 'include',
    });

    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }

    if (res.status === 404) {
      // Fallback ke cache lokal jika mode demo
      return localStorage.getItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // Fallback offline / mock demo
    return localStorage.getItem(LOCAL_STORAGE_KEY);
  }

  return localStorage.getItem(LOCAL_STORAGE_KEY);
}

/**
 * Menyimpan tanda tangan digital pengguna (PNG data URL atau berkas File).
 */
export async function saveSignature(payload: {
  dataUrl: string;
  file?: File;
}): Promise<{ hasSignature: boolean }> {
  // Simpan selalu ke cache lokal agar pratinjau langsung berfungsi di mode demo
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, payload.dataUrl);
  } catch {
    // Ignore localStorage quota errors
  }

  try {
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);

      const res = await fetch('/api/me/signature', {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        return { hasSignature: true };
      }
    } else {
      const res = await fetch('/api/me/signature', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataUrl: payload.dataUrl }),
      });

      if (res.ok) {
        return { hasSignature: true };
      }
    }
  } catch {
    // Fallback sukses untuk simulasi lokal demo
  }

  return { hasSignature: true };
}
