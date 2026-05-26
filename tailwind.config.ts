import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe1e4',
          200: '#ffc7cd',
          300: '#ff9ea8',
          400: '#ff6675',
          500: '#f12a37',
          600: '#dc1422',
          700: '#b80f1c',
          800: '#94101c',
          900: '#7a131e',
        },
        ink: {
          50: '#f6f6f7',
          100: '#e8e8ea',
          200: '#cfd0d4',
          300: '#a7a8b0',
          400: '#797b86',
          500: '#5b5d68',
          600: '#3f4148',
          700: '#2c2e35',
          800: '#1c1d23',
          850: '#16171c',
          900: '#0f0f13',
          950: '#08080b',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'Pretendard', 'Inter', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 80px -20px rgba(241, 42, 55, 0.55)',
        card: '0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px -16px rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
