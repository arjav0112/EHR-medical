import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: {
          DEFAULT: 'hsl(var(--border))',
        },
        input: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          DEFAULT: '#BEF264', // Neon Green
          light: '#D9F99D',
          dark: '#03050C',
        },
        neon: {
          DEFAULT: '#BEF264',
          glow: 'rgba(190, 242, 100, 0.4)',
        },
        navy: {
          DEFAULT: '#03050C',
          light: '#0A0E1A',
          deep: '#010205',
        },
        risk: {
          low: '#f59e0b',
          moderate: '#f97316',
          high: '#ef4444',
          critical: '#991b1b',
        },
        status: {
          approved: '#BEF264',
          pending: '#64748b',
          revised: '#F8FAFC',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-cormorant)', 'Cormorant Garamond', 'serif'],
        display: ['var(--font-cormorant)', 'Cormorant Garamond', 'serif'],
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
