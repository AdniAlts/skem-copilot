/**
 * Service Supabase Storage (bucket privat).
 *
 * Browser tidak pernah akses Supabase langsung (ARCHITECTURE §1).
 * Semua baca file bukti lewat signed URL TTL 60 s; tanda tangan TIDAK
 * pernah di-serve via signed URL — hanya dibaca server untuk PDF final.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { loadEnv } from '../env.js';

const SIGNED_URL_TTL_SECONDS = 60;

let cached: SupabaseClient | null = null;

export function getStorage(): SupabaseClient {
  if (cached) return cached;
  const env = loadEnv();
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return cached;
}

export function bucketCertificates(): string {
  return loadEnv().STORAGE_BUCKET_CERTIFICATES;
}

export function bucketSignatures(): string {
  return loadEnv().STORAGE_BUCKET_SIGNATURES;
}

export function bucketForms(): string {
  return loadEnv().STORAGE_BUCKET_FORMS;
}

/** Unggah buffer ke bucket. Path bebas dipilih pemanggil (mis. `${publicId}/${fileName}`). */
export async function uploadObject(
  bucket: string,
  path: string,
  data: Buffer,
  mime: string,
): Promise<void> {
  const { error } = await getStorage().storage.from(bucket).upload(path, data, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload gagal: ${error.message}`);
}

/** Unduh objek sebagai Buffer (untuk reader AI dan generator PDF). */
export async function downloadObject(bucket: string, path: string): Promise<Buffer> {
  const { data, error } = await getStorage().storage.from(bucket).download(path);
  if (error) throw new Error(`Storage download gagal: ${error.message}`);
  const bytes = await data.arrayBuffer();
  return Buffer.from(bytes);
}

/** Signed URL baca TTL 60 s (hanya setelah cek akses di middleware/route). */
export async function createSignedUrl(
  bucket: string,
  path: string,
): Promise<{ url: string; expiresIn: number }> {
  const { data, error } = await getStorage()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error(`Storage signed URL gagal: ${error?.message}`);
  return { url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
}

/** Hapus objek (pembatalan kartu: hapus file dari Storage). */
export async function removeObject(bucket: string, path: string): Promise<void> {
  const { error } = await getStorage().storage.from(bucket).remove([path]);
  if (error) throw new Error(`Storage remove gagal: ${error.message}`);
}
