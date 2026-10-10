/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palet mengikuti warna logo PENS: biru #1B4679 dan kuning #F4C801.
        // Warna status tetap semantik: emerald = lolos, amber = perlu perbaikan, terakota = masalah.
        brand: {
          dark: '#102A49', // Navy gelap (teks judul), turunan biru PENS
          blue: {
            DEFAULT: '#1B4679', // Biru PENS (aksi, tautan, aktif)
            50: '#F1F4F7',
            100: '#DFE5EC',
            200: '#BBC8D7',
            300: '#8DA2BC',
            400: '#54749A',
            500: '#1B4679',
            600: '#183E6A',
            700: '#14345B',
            800: '#102A49',
            900: '#0C2036',
          },
          yellow: '#F4C801', // Kuning PENS (aksen identitas, bukan status)
          terracotta: '#C8553D', // Terakota (peringatan, kesalahan, bermasalah)
          bg: '#F4F6F9', // Latar belakang utama (abu kebiruan netral)
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
        card: '0 1px 3px rgba(27, 70, 121, 0.05), 0 1px 2px rgba(27, 70, 121, 0.08)',
      },
    },
  },
  plugins: [],
};
