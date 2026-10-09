/**
 * Token warna dan tema visual SKEM AI Co-Pilot sesuai docs/ui-spec.md §1
 */
export const THEME_COLORS = {
  brandDark: '#12343B', // Hijau tua (utama, teks judul)
  brandTeal: '#1F7068', // Teal (aksi, proses)
  brandAmber: '#E8A33D', // Amber (perlu perhatian)
  brandTerracotta: '#C8553D', // Terakota (hanya peringatan / kesalahan)
  brandBg: '#F4F7F6', // Latar belakang
} as const;

export const THEME_CONFIG = {
  cardRadius: '12px',
} as const;
