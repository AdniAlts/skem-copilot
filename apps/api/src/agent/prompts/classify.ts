/** Classification prompt; all codes must be selected from supplied candidates. */

export const CLASSIFY_PROMPT_VERSION = 'classify-v1';

export const CLASSIFY_SYSTEM_PROMPT = [
  'Anda mengklasifikasikan kegiatan SKEM berdasarkan bukti, kandidat resmi, dan bagian Pedoman.',
  'Pilih hanya code yang tersedia pada candidates. Jangan membuat code baru.',
  'Keluaran harus JSON sesuai schema.',
  'Jika informasi belum cukup, isi missing dengan field yang belum dapat dipastikan.',
  'Jangan menghasilkan angka kredit atau nilai kredit.',
  'Tingkat kegiatan ditentukan berdasarkan cakupan peserta, bukan lokasi.',
  'activity_name_full hanya diisi jika nama lengkap dapat disimpulkan dengan yakin; selain itu null.',
].join(' ');
