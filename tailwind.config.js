import stellaPreset from '@stella-ds/theme/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@stella-ds/react/dist/**/*.{js,mjs}",
  ],
  presets: [stellaPreset],
  theme: {
    extend: {
      fontFamily: {
        'special': ['"Special Elite"', 'cursive'],
        'noto': ['"Noto Sans JP"', 'sans-serif'],
        'noto-serif': ['"Noto Serif JP"', 'serif'],
        'barlow': ['"Barlow Condensed"', 'Impact', '"Arial Narrow"', 'sans-serif'],
      },
      colors: {
        'film-yellow': '#f0e0a0',
        'film-dark': '#0d0d0d',
        'film-border': '#2a2a2a',
        'sepia': '#c4a882',
      },
      keyframes: {
        'shutter-flash': {
          '0%, 100%': { opacity: '0' },
          '20%': { opacity: '0.9' },
          '40%': { opacity: '0' },
          '60%': { opacity: '0.3' },
        },
        'spin-disc': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'shutter-flash': 'shutter-flash 0.35s ease-out',
        'spin-disc': 'spin-disc 4s linear infinite',
        'spin-disc-slow': 'spin-disc 8s linear infinite',
        'spin-disc-fast': 'spin-disc 2s linear infinite',
      },
    },
  },
  plugins: [],
}

