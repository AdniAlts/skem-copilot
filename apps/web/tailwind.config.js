/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#12343B', // Hijau tua (utama, teks judul)
          teal: '#1F7068', // Teal (aksi, proses, aktif)
          amber: '#E8A33D', // Amber (perhatian, perlu perbaikan)
          terracotta: '#C8553D', // Terakota (peringatan, kesalahan, bermasalah)
          bg: '#F4F7F6', // Latar belakang utama
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Merriweather', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(18, 52, 59, 0.05), 0 1px 2px rgba(18, 52, 59, 0.08)',
      },
    },
  },
  plugins: [],
};
