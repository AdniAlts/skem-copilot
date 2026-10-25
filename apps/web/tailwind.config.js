/** @type {import('tailwindcss').Config} */
// Token visual mengikuti design handoff v7 (palet logo PENS biru–kuning).
// Skala slate/amber/red/emerald dipetakan ulang ke palet desain agar seluruh
// komponen yang sudah ada ikut memakai warna yang sama tanpa mengganti kelasnya.
// Status: biru = lolos/disetujui, kuning tua = perlu perhatian, terakota = bermasalah.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0E2A5C', // Navy: sidebar, teks utama
          blue: {
            DEFAULT: '#1E4FA0', // Biru primer: tombol, tautan, progres
            50: '#F1F5FC',
            100: '#E3EBF8',
            200: '#BDCDEA',
            300: '#9DB4DE',
            400: '#5F80BE',
            500: '#1E4FA0',
            600: '#1A428A',
            700: '#173F82',
            800: '#123468',
            900: '#0E2A5C',
          },
          yellow: {
            DEFAULT: '#F5C400', // Aksen aktif, avatar, sorotan
            50: '#FFFBEA',
            100: '#FFF4CC',
            600: '#E0B000',
            700: '#C99A00',
            900: '#6B5200',
          },
          terracotta: '#C8553D',
          bg: '#F3F6FB',
          sidebar: {
            text: '#CAD6EE',
            muted: '#A3B6DA',
            label: '#8199C6',
          },
        },
        slate: {
          50: '#F7F9FD',
          100: '#ECF0F7',
          200: '#DEE5F1',
          300: '#C5D2E6',
          400: '#7D8DA8',
          500: '#596B87',
          600: '#475A78',
          700: '#2A3F62',
          800: '#1B3157',
          900: '#0E2A5C',
        },
        emerald: {
          50: '#EDF2FA',
          100: '#E3EBF8',
          200: '#BDCDEA',
          300: '#9DB4DE',
          400: '#5F80BE',
          500: '#1E4FA0',
          600: '#1E4FA0',
          700: '#1A428A',
          800: '#1A428A',
          900: '#0E2A5C',
        },
        amber: {
          50: '#FBF0DC',
          100: '#FBF0DC',
          200: '#F0D59A',
          300: '#E0B000',
          400: '#E0B000',
          500: '#C99A00',
          600: '#C99A00',
          700: '#7A4F0F',
          800: '#7A4F0F',
          900: '#5E3D0B',
        },
        red: {
          50: '#F7E3DE',
          100: '#F7E3DE',
          200: '#E7B6AA',
          300: '#E7B6AA',
          400: '#C8553D',
          500: '#C8553D',
          600: '#A3412D',
          700: '#9A3B27',
          800: '#9A3B27',
          900: '#7A2E1E',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Lato', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(14,42,92,.06)',
        card: '0 1px 2px rgba(14,42,92,.06), 0 6px 20px rgba(14,42,92,.05)',
        pop: '0 14px 44px rgba(14,42,92,.2)',
        cta: '0 4px 14px rgba(30,79,160,.28)',
      },
      width: {
        sidebar: '248px',
      },
    },
  },
  plugins: [],
};
