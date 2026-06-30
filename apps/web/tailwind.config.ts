import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand, #0ea5e9)',
          dark: 'var(--brand-dark, #0369a1)',
        },
      },
      keyframes: {
        indeterminate: {
          '0%':   { transform: 'translateX(-100%)', width: '40%' },
          '50%':  { transform: 'translateX(50%)',  width: '60%' },
          '100%': { transform: 'translateX(200%)', width: '40%' },
        },
        scanLine: {
          '0%, 100%': { transform: 'translateY(-50%)', opacity: '0.3' },
          '50%':       { transform: 'translateY(50%)',  opacity: '1'   },
        },
      },
      animation: {
        indeterminate: 'indeterminate 1.6s ease-in-out infinite',
        'scan-line':   'scanLine 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
