/**
 * Token warna dan tema visual SKEM AI Co-Pilot sesuai docs/ui-spec.md §1
 */
export const THEME_COLORS = {
  brandDark: '#102A49', // Navy gelap (teks judul)
  brandBlue: '#1B4679', // Biru PENS (aksi, proses)
  brandYellow: '#F4C801', // Kuning PENS (aksen identitas, bukan status)
  brandTerracotta: '#C8553D', // Terakota (hanya peringatan / kesalahan)
  brandBg: '#F4F6F9', // Latar belakang
} as const;

export const THEME_CONFIG = {
  cardRadius: '12px',
} as const;
