import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand, #0ea5e9)',
          dark: 'var(--brand-dark, #0369a1)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
