/**
 * Token warna dan tema visual SKEM AI Co-Pilot sesuai design handoff v7
 * (sumber kebenaran kelas Tailwind ada di tailwind.config.js).
 */
export const THEME_COLORS = {
  brandDark: '#0E2A5C', // Navy (sidebar, teks utama)
  brandBlue: '#1E4FA0', // Biru primer (aksi, progres)
  brandYellow: '#F5C400', // Kuning PENS (aksen aktif, bukan status)
  brandTerracotta: '#C8553D', // Terakota (hanya peringatan / kesalahan)
  brandBg: '#F3F6FB', // Latar belakang aplikasi
} as const;

export const THEME_CONFIG = {
  cardRadius: '12px',
} as const;
